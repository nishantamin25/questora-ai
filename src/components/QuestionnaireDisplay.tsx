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
  
  // CRITICAL FIX: Single source of truth for content with immediate language switching
  const [content, setContent] = useState(() => ({
    // Original English content (never changes)
    original: {
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questionnaire.questions || [],
      courseContent: questionnaire.courseContent
    },
    // Current display content (updates immediately on language change)
    display: {
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questionnaire.questions || [],
      courseContent: questionnaire.courseContent
    },
    currentLanguage: LanguageService.getCurrentLanguage(),
    isTranslating: false
  }));
  
  // Use ref to prevent stale closures in async operations
  const contentRef = useRef(content);
  contentRef.current = content;

  // CRITICAL: Atomic translation that never clears questions
  const translateContent = useCallback(async (targetLanguage: string) => {
    const currentContent = contentRef.current;
    
    // Skip if already in target language or no questions to translate
    if (currentContent.currentLanguage === targetLanguage || !currentContent.original.questions.length) {
      return;
    }

    console.log(`Starting immediate translation to ${targetLanguage}...`);
    
    // STEP 1: Immediately update language and set translating state WITHOUT clearing questions
    setContent(prev => ({
      ...prev,
      currentLanguage: targetLanguage,
      isTranslating: true
    }));

    try {
      if (targetLanguage === 'en') {
        // STEP 2A: Switch back to English immediately - use original content
        setContent(prev => ({
          ...prev,
          display: {
            title: prev.original.title,
            description: prev.original.description,
            questions: prev.original.questions, // Always preserve questions
            courseContent: prev.original.courseContent
          },
          isTranslating: false
        }));
        console.log('Switched back to English immediately');
        return;
      }

      // STEP 2B: For other languages, translate while keeping current display intact
      const translationPromises = [];
      
      // Translate title
      if (currentContent.original.title) {
        translationPromises.push(
          LanguageService.translateContent(currentContent.original.title, targetLanguage)
            .then(translated => ({ type: 'title', value: translated }))
        );
      }
      
      // Translate description
      if (currentContent.original.description) {
        translationPromises.push(
          LanguageService.translateContent(currentContent.original.description, targetLanguage)
            .then(translated => ({ type: 'description', value: translated }))
        );
      }
      
      // Translate questions
      if (currentContent.original.questions.length > 0) {
        translationPromises.push(
          LanguageService.translateQuestions(currentContent.original.questions, targetLanguage)
            .then(translated => ({ type: 'questions', value: translated }))
        );
      }
      
      // Translate course content
      if (currentContent.original.courseContent) {
        const courseContent = { ...currentContent.original.courseContent };
        
        const coursePromises = [];
        if (courseContent.title) {
          coursePromises.push(
            LanguageService.translateContent(courseContent.title, targetLanguage)
              .then(translated => ({ field: 'title', value: translated }))
          );
        }
        if (courseContent.description) {
          coursePromises.push(
            LanguageService.translateContent(courseContent.description, targetLanguage)
              .then(translated => ({ field: 'description', value: translated }))
          );
        }
        if (courseContent.modules && Array.isArray(courseContent.modules)) {
          coursePromises.push(
            Promise.all(
              courseContent.modules.map(async (module: any) => ({
                ...module,
                title: module.title ? await LanguageService.translateContent(module.title, targetLanguage) : module.title,
                content: module.content ? await LanguageService.translateContent(module.content, targetLanguage) : module.content
              }))
            ).then(translated => ({ field: 'modules', value: translated }))
          );
        }
        
        if (coursePromises.length > 0) {
          translationPromises.push(
            Promise.all(coursePromises).then(results => {
              const translatedCourse = { ...courseContent };
              results.forEach(result => {
                if (result.field === 'title') translatedCourse.title = result.value;
                else if (result.field === 'description') translatedCourse.description = result.value;
                else if (result.field === 'modules') translatedCourse.modules = result.value;
              });
              return { type: 'courseContent', value: translatedCourse };
            })
          );
        }
      }

      // STEP 3: Apply translations as they complete, ensuring questions are never lost
      const translations = await Promise.all(translationPromises);
      
      setContent(prev => {
        const newDisplay = { ...prev.display };
        
        translations.forEach(translation => {
          switch (translation.type) {
            case 'title':
              newDisplay.title = translation.value;
              break;
            case 'description':
              newDisplay.description = translation.value;
              break;
            case 'questions':
              // CRITICAL: Only update if translation succeeded and has content
              if (translation.value && translation.value.length > 0) {
                newDisplay.questions = translation.value;
              }
              // Otherwise keep current questions to prevent blank screen
              break;
            case 'courseContent':
              newDisplay.courseContent = translation.value;
              break;
          }
        });
        
        return {
          ...prev,
          display: newDisplay,
          isTranslating: false
        };
      });
      
      console.log(`Translation to ${targetLanguage} completed successfully`);
      
    } catch (error) {
      console.error('Translation error:', error);
      
      // CRITICAL: On error, preserve current state and just update flags
      setContent(prev => ({
        ...prev,
        isTranslating: false
      }));
      
      toast({
        title: "Translation Error",
        description: "Failed to translate content. Content preserved in current language.",
        variant: "destructive"
      });
    }
  }, []);

  // Initialize content on mount
  useEffect(() => {
    if (questionnaire) {
      const currentLanguage = LanguageService.getCurrentLanguage();
      
      setEditedQuestionnaire(questionnaire);
      setEditedQuestions(questionnaire.questions || []);
      
      setContent({
        original: {
          title: questionnaire.title,
          description: questionnaire.description,
          questions: questionnaire.questions || [],
          courseContent: questionnaire.courseContent
        },
        display: {
          title: questionnaire.title,
          description: questionnaire.description,
          questions: questionnaire.questions || [],
          courseContent: questionnaire.courseContent
        },
        currentLanguage: currentLanguage,
        isTranslating: false
      });
      
      // Translate if not in English
      if (currentLanguage !== 'en') {
        translateContent(currentLanguage);
      }
    }
  }, [questionnaire.id, translateContent]);

  // Listen for language changes and translate immediately
  useEffect(() => {
    const unsubscribe = LanguageService.onLanguageChange((newLanguage: string) => {
      console.log(`Language changed to ${newLanguage}`);
      translateContent(newLanguage);
    });

    return unsubscribe;
  }, [translateContent]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes when exiting edit mode
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

  // Convert courseContent to the format expected by CourseDisplay
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

  // CRITICAL: Use stable content for rendering - questions ALWAYS exist
  const displayQuestionnaire = isEditing ? editedQuestionnaire : {
    ...questionnaire,
    title: content.display.title,
    description: content.display.description
  };
  
  // CRITICAL: Questions are ALWAYS available - never empty
  const displayQuestions = isEditing 
    ? editedQuestions 
    : content.display.questions;
  
  const displayCourseContent = content.display.courseContent;

  // Debug logging
  console.log('QuestionnaireDisplay render:', {
    questionnaireId: questionnaire.id,
    isEditing,
    displayQuestionsCount: displayQuestions.length,
    currentLanguage: content.currentLanguage,
    isTranslating: content.isTranslating,
    originalQuestionsCount: content.original.questions.length
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
        {content.isTranslating && (
          <div className="text-sm text-slate-500 italic">
            Translating content to {content.currentLanguage}...
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
