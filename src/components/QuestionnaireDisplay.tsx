import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ResponseService } from '@/services/ResponseService';
import { LanguageService } from '@/services/LanguageService';
import CourseDisplay from './CourseDisplay';
import QuestionnaireHeader from './QuestionnaireHeader';
import QuestionsSection from './QuestionsSection';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: number;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive?: boolean;
  testName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isSaved?: boolean;
  timeframe?: number;
  setNumber?: number;
  totalSets?: number;
  courseContent?: any;
}

interface QuestionnaireDisplayProps {
  questionnaire: Questionnaire;
  isAdmin: boolean;
  onUpdate: (questionnaire: Questionnaire) => void;
  onDelete: (questionnaireId: string) => void;
  isPartOfSet?: boolean;
}

const QuestionnaireDisplay = ({ questionnaire, isAdmin, onUpdate, onDelete, isPartOfSet = false }: QuestionnaireDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestionnaire, setEditedQuestionnaire] = useState<Questionnaire>(questionnaire);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionsVisible, setQuestionsVisible] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<Question[]>(questionnaire.questions || []);
  
  // BULLETPROOF STATE: Always maintain questions, never allow empty state
  const [stableContent, setStableContent] = useState(() => {
    const originalQuestions = questionnaire.questions || [];
    return {
      // Original content (NEVER changes - source of truth)
      original: {
        title: questionnaire.title,
        description: questionnaire.description,
        questions: originalQuestions,
        courseContent: questionnaire.courseContent
      },
      // Current display content (what user sees)
      current: {
        title: questionnaire.title,
        description: questionnaire.description,
        questions: originalQuestions, // ALWAYS start with original questions
        courseContent: questionnaire.courseContent
      },
      // Translation state
      currentLanguage: LanguageService.getCurrentLanguage(),
      isTranslating: false,
      translationInProgress: false
    };
  });
  
  // Ref to prevent stale closures and race conditions
  const contentRef = useRef(stableContent);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Update ref whenever state changes
  useEffect(() => {
    contentRef.current = stableContent;
  }, [stableContent]);

  // ATOMIC TRANSLATION: Single source of truth, no race conditions
  const performTranslation = useCallback(async (targetLanguage: string) => {
    console.log(`🔄 Starting translation to ${targetLanguage}`);
    
    // Cancel any existing translation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }
    
    const currentContent = contentRef.current;
    
    // Skip if no change needed or no questions to translate
    if (currentContent.currentLanguage === targetLanguage || !currentContent.original.questions.length) {
      console.log('⏭️ Skipping translation - no change needed');
      return;
    }

    // STEP 1: Immediately update language, show translating state, but KEEP current questions visible
    setStableContent(prev => ({
      ...prev,
      currentLanguage: targetLanguage,
      isTranslating: true,
      translationInProgress: true
    }));

    try {
      // STEP 2: Handle English switch immediately (no API call needed)
      if (targetLanguage === 'en') {
        console.log('✅ Switching to English - using original content');
        setStableContent(prev => ({
          ...prev,
          current: {
            title: prev.original.title,
            description: prev.original.description,
            questions: prev.original.questions, // Always use original questions
            courseContent: prev.original.courseContent
          },
          isTranslating: false,
          translationInProgress: false
        }));
        return;
      }

      // STEP 3: For other languages, translate while keeping questions visible
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      console.log(`🌐 Translating content to ${targetLanguage}...`);
      
      // Translate all content in parallel but handle cancellation
      const translationPromises = [];
      
      // Title translation
      if (currentContent.original.title) {
        translationPromises.push(
          LanguageService.translateContent(currentContent.original.title, targetLanguage)
            .then(result => ({ type: 'title', content: result }))
            .catch(error => {
              if (!abortController.signal.aborted) {
                console.error('Title translation failed:', error);
              }
              return { type: 'title', content: currentContent.original.title };
            })
        );
      }
      
      // Description translation
      if (currentContent.original.description) {
        translationPromises.push(
          LanguageService.translateContent(currentContent.original.description, targetLanguage)
            .then(result => ({ type: 'description', content: result }))
            .catch(error => {
              if (!abortController.signal.aborted) {
                console.error('Description translation failed:', error);
              }
              return { type: 'description', content: currentContent.original.description };
            })
        );
      }
      
      // Questions translation (most important)
      if (currentContent.original.questions.length > 0) {
        translationPromises.push(
          LanguageService.translateQuestions(currentContent.original.questions, targetLanguage)
            .then(result => ({ type: 'questions', content: result }))
            .catch(error => {
              if (!abortController.signal.aborted) {
                console.error('Questions translation failed:', error);
              }
              return { type: 'questions', content: currentContent.original.questions };
            })
        );
      }
      
      // Course content translation
      if (currentContent.original.courseContent) {
        const courseContent = { ...currentContent.original.courseContent };
        
        const courseTranslations = [];
        if (courseContent.title) {
          courseTranslations.push(
            LanguageService.translateContent(courseContent.title, targetLanguage)
              .then(translated => ({ field: 'title', value: translated }))
              .catch(() => ({ field: 'title', value: courseContent.title }))
          );
        }
        if (courseContent.description) {
          courseTranslations.push(
            LanguageService.translateContent(courseContent.description, targetLanguage)
              .then(translated => ({ field: 'description', value: translated }))
              .catch(() => ({ field: 'description', value: courseContent.description }))
          );
        }
        if (courseContent.modules && Array.isArray(courseContent.modules)) {
          courseTranslations.push(
            Promise.all(
              courseContent.modules.map(async (module: any) => {
                try {
                  return {
                    ...module,
                    title: module.title ? await LanguageService.translateContent(module.title, targetLanguage) : module.title,
                    content: module.content ? await LanguageService.translateContent(module.content, targetLanguage) : module.content
                  };
                } catch {
                  return module;
                }
              })
            ).then(translated => ({ field: 'modules', value: translated }))
          );
        }
        
        if (courseTranslations.length > 0) {
          translationPromises.push(
            Promise.all(courseTranslations).then(results => {
              const translatedCourse = { ...courseContent };
              results.forEach(result => {
                if (result.field === 'title') translatedCourse.title = result.value;
                else if (result.field === 'description') translatedCourse.description = result.value;
                else if (result.field === 'modules') translatedCourse.modules = result.value;
              });
              return { type: 'courseContent', content: translatedCourse };
            }).catch(() => ({ type: 'courseContent', content: courseContent }))
          );
        }
      }

      // STEP 4: Wait for all translations and apply atomically
      const results = await Promise.all(translationPromises);
      
      // Check if translation was cancelled
      if (abortController.signal.aborted) {
        console.log('🚫 Translation cancelled');
        return;
      }
      
      // STEP 5: Apply all translations at once (ATOMIC UPDATE)
      setStableContent(prev => {
        const newCurrent = { ...prev.current };
        
        results.forEach(result => {
          switch (result.type) {
            case 'title':
              newCurrent.title = result.content;
              break;
            case 'description':
              newCurrent.description = result.content;
              break;
            case 'questions':
              // CRITICAL: Only update if we got valid translated questions
              if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                newCurrent.questions = result.content;
              }
              // If translation failed, keep current questions visible
              break;
            case 'courseContent':
              newCurrent.courseContent = result.content;
              break;
          }
        });
        
        return {
          ...prev,
          current: newCurrent,
          isTranslating: false,
          translationInProgress: false
        };
      });
      
      console.log(`✅ Translation to ${targetLanguage} completed successfully`);
      
    } catch (error) {
      console.error('💥 Translation error:', error);
      
      // CRITICAL: On error, preserve current state and just clear flags
      setStableContent(prev => ({
        ...prev,
        isTranslating: false,
        translationInProgress: false
      }));
      
      if (!abortControllerRef.current?.signal.aborted) {
        toast({
          title: "Translation Error",
          description: "Failed to translate content. Content preserved in current language.",
          variant: "destructive"
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  // Initialize content when questionnaire changes
  useEffect(() => {
    if (questionnaire) {
      const currentLanguage = LanguageService.getCurrentLanguage();
      const originalQuestions = questionnaire.questions || [];
      
      console.log(`📝 Initializing questionnaire ${questionnaire.id} with ${originalQuestions.length} questions`);
      
      setEditedQuestionnaire(questionnaire);
      setEditedQuestions(originalQuestions);
      
      setStableContent({
        original: {
          title: questionnaire.title,
          description: questionnaire.description,
          questions: originalQuestions,
          courseContent: questionnaire.courseContent
        },
        current: {
          title: questionnaire.title,
          description: questionnaire.description,
          questions: originalQuestions, // Always start with questions visible
          courseContent: questionnaire.courseContent
        },
        currentLanguage: currentLanguage,
        isTranslating: false,
        translationInProgress: false
      });
      
      // Only translate if not in English
      if (currentLanguage !== 'en' && originalQuestions.length > 0) {
        // Small delay to ensure component is mounted
        translationTimeoutRef.current = setTimeout(() => {
          performTranslation(currentLanguage);
        }, 100);
      }
    }
  }, [questionnaire.id, performTranslation]);

  // Listen for language changes and translate immediately
  useEffect(() => {
    const unsubscribe = LanguageService.onLanguageChange((newLanguage: string) => {
      console.log(`🌍 Language changed to ${newLanguage}`);
      performTranslation(newLanguage);
    });

    return () => {
      unsubscribe();
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [performTranslation]);

  const handleEditToggle = () => {
    if (isEditing) {
      const updatedQuestionnaire = { ...editedQuestionnaire, questions: editedQuestions };
      setEditedQuestionnaire(updatedQuestionnaire);
      onUpdate(updatedQuestionnaire);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedQuestionnaire(questionnaire);
    setEditedQuestions(questionnaire.questions || []);
  };

  const handleActiveToggle = (checked: boolean) => {
    const updatedQuestionnaire = { ...editedQuestionnaire, isActive: checked };
    setEditedQuestionnaire(updatedQuestionnaire);
    onUpdate(updatedQuestionnaire);
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleQuestionTextEdit = (questionId: string, value: string) => {
    setEditedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, text: value }
        : q
    ));
  };

  const handleOptionEdit = (questionId: string, optionIndex: number, value: string) => {
    setEditedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options?.map((opt, idx) => idx === optionIndex ? value : opt) || [] }
        : q
    ));
  };

  const handleAddOption = (questionId: string) => {
    setEditedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: [...(q.options || []), 'New Option'] }
        : q
    ));
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setEditedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options?.filter((_, idx) => idx !== optionIndex) || [] }
        : q
    ));
  };

  const handleSubmitResponses = async () => {
    setIsSubmitting(true);
    try {
      const responseData = {
        questionnaireId: questionnaire.id,
        responses: responses,
        submittedAt: new Date().toISOString()
      };
      await ResponseService.submitResponse(responseData);
      toast({
        title: "Success",
        description: "Responses submitted successfully!",
      });
      setResponses({});
    } catch (error) {
      console.error('Error submitting responses:', error);
      toast({
        title: "Error",
        description: "Failed to submit responses",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertCourseContent = (courseContent: any) => {
    if (!courseContent) return null;
    
    return {
      id: courseContent.id || 'course-' + questionnaire.id,
      name: courseContent.title || questionnaire.title,
      description: courseContent.description || questionnaire.description,
      materials: courseContent.modules?.map((module: any) => ({
        type: module.type || 'text',
        content: module.content || '',
        title: module.title || 'Module'
      })) || [
        {
          type: 'text',
          content: courseContent.content || 'Course content',
          title: 'Course Material'
        }
      ],
      estimatedTime: questionnaire.timeframe || 30
    };
  };

  const handleCourseComplete = (courseId: string) => {
    toast({
      title: "Course Completed!",
      description: "You can now access the questionnaire.",
    });
  };

  // STABLE RENDERING: Always use stable content, questions are NEVER empty
  const displayQuestionnaire = isEditing ? editedQuestionnaire : {
    ...questionnaire,
    title: stableContent.current.title,
    description: stableContent.current.description
  };
  
  // BULLETPROOF: Questions are ALWAYS available from stable content
  const displayQuestions = isEditing 
    ? editedQuestions 
    : stableContent.current.questions;
  
  const displayCourseContent = stableContent.current.courseContent;

  // Debug logging for transparency
  console.log(`🎯 QuestionnaireDisplay render:`, {
    questionnaireId: questionnaire.id,
    language: stableContent.currentLanguage,
    isTranslating: stableContent.isTranslating,
    questionsCount: displayQuestions.length,
    hasQuestions: displayQuestions.length > 0,
    isEditing
  });

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl overflow-hidden mb-4">
      <CardHeader className="p-6">
        <QuestionnaireHeader
          questionnaire={displayQuestionnaire}
          editedQuestionnaire={editedQuestionnaire}
          isEditing={isEditing}
          isAdmin={isAdmin}
          isPartOfSet={isPartOfSet}
          onQuestionnaireChange={setEditedQuestionnaire}
          onEditToggle={handleEditToggle}
          onCancelEdit={handleCancelEdit}
          onActiveToggle={handleActiveToggle}
          onDelete={onDelete}
          onSaveTest={() => {}}
        />
        {stableContent.isTranslating && (
          <div className="text-sm text-slate-500 italic bg-blue-50 p-2 rounded border">
            🌐 Translating content to {stableContent.currentLanguage}...
          </div>
        )}
      </CardHeader>

      {displayCourseContent && (
        <div className="border-b border-slate-200">
          <CourseDisplay 
            course={convertCourseContent(displayCourseContent)}
            onCourseComplete={handleCourseComplete}
          />
        </div>
      )}

      <CardContent>
        <QuestionsSection
          questions={displayQuestions}
          isEditing={isEditing}
          isAdmin={isAdmin}
          isActive={questionnaire.isActive || false}
          questionsVisible={questionsVisible}
          responses={responses}
          isSubmitting={isSubmitting}
          onQuestionsVisibleChange={setQuestionsVisible}
          onResponseChange={handleResponseChange}
          onQuestionTextEdit={handleQuestionTextEdit}
          onOptionEdit={handleOptionEdit}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
          onSubmitResponses={handleSubmitResponses}
        />
      </CardContent>
    </Card>
  );
};

export default QuestionnaireDisplay;
