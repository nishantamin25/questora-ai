import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ResponseService } from '@/services/ResponseService';
import { LanguageService } from '@/services/LanguageService';
import { AuthService } from '@/services/AuthService';
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
  
  // SIMPLIFIED STATE: Only what we need for display
  const [displayContent, setDisplayContent] = useState({
    title: questionnaire.title,
    description: questionnaire.description,
    questions: questionnaire.questions || [],
    courseContent: questionnaire.courseContent,
    isTranslating: false
  });
  
  // Store original English content (never changes)
  const originalContentRef = useRef({
    title: questionnaire.title,
    description: questionnaire.description,
    questions: questionnaire.questions || [],
    courseContent: questionnaire.courseContent
  });
  
  const currentLanguageRef = useRef(LanguageService.getCurrentLanguage());
  const translationControllerRef = useRef<AbortController | null>(null);

  // ATOMIC TRANSLATION FUNCTION - preserves content during translation
  const translateContent = useCallback(async (targetLanguage: string) => {
    console.log(`🔄 Starting translation to ${targetLanguage}`);
    
    // Cancel any existing translation
    if (translationControllerRef.current) {
      translationControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    translationControllerRef.current = controller;
    
    // If switching to English, use original content immediately
    if (targetLanguage === 'en') {
      console.log('✅ Switching to English - using original content');
      setDisplayContent({
        ...originalContentRef.current,
        isTranslating: false
      });
      currentLanguageRef.current = 'en';
      return;
    }
    
    // For other languages, show translating state but KEEP current content visible
    setDisplayContent(prev => ({
      ...prev,
      isTranslating: true
    }));
    
    try {
      const original = originalContentRef.current;
      
      // Translate all content in parallel
      const [translatedTitle, translatedDescription, translatedQuestions, translatedCourse] = await Promise.all([
        // Title
        original.title ? LanguageService.translateContent(original.title, targetLanguage) : Promise.resolve(original.title),
        // Description  
        original.description ? LanguageService.translateContent(original.description, targetLanguage) : Promise.resolve(original.description),
        // Questions
        original.questions.length > 0 ? LanguageService.translateQuestions(original.questions, targetLanguage) : Promise.resolve(original.questions),
        // Course content
        original.courseContent ? translateCourseContent(original.courseContent, targetLanguage) : Promise.resolve(original.courseContent)
      ]);
      
      // Check if translation was cancelled
      if (controller.signal.aborted) {
        console.log('🚫 Translation cancelled');
        return;
      }
      
      // ATOMIC UPDATE: Apply all translations at once
      setDisplayContent({
        title: translatedTitle,
        description: translatedDescription,
        questions: translatedQuestions,
        courseContent: translatedCourse,
        isTranslating: false
      });
      
      currentLanguageRef.current = targetLanguage;
      console.log(`✅ Translation to ${targetLanguage} completed successfully`);
      
    } catch (error) {
      console.error('💥 Translation error:', error);
      
      // On error, just clear the translating flag - keep current content
      setDisplayContent(prev => ({
        ...prev,
        isTranslating: false
      }));
      
      if (!controller.signal.aborted) {
        toast({
          title: "Translation Error",
          description: "Failed to translate content. Showing in current language.",
          variant: "destructive"
        });
      }
    } finally {
      translationControllerRef.current = null;
    }
  }, []);

  // Helper function to translate course content
  const translateCourseContent = async (courseContent: any, targetLanguage: string) => {
    if (!courseContent) return courseContent;
    
    const translated = { ...courseContent };
    
    try {
      // Translate course fields
      if (courseContent.title) {
        translated.title = await LanguageService.translateContent(courseContent.title, targetLanguage);
      }
      if (courseContent.description) {
        translated.description = await LanguageService.translateContent(courseContent.description, targetLanguage);
      }
      if (courseContent.modules && Array.isArray(courseContent.modules)) {
        translated.modules = await Promise.all(
          courseContent.modules.map(async (module: any) => ({
            ...module,
            title: module.title ? await LanguageService.translateContent(module.title, targetLanguage) : module.title,
            content: module.content ? await LanguageService.translateContent(module.content, targetLanguage) : module.content
          }))
        );
      }
    } catch (error) {
      console.error('Error translating course content:', error);
      return courseContent; // Return original if translation fails
    }
    
    return translated;
  };

  // Initialize content when questionnaire changes
  useEffect(() => {
    console.log(`📝 Initializing questionnaire ${questionnaire.id} with ${questionnaire.questions?.length || 0} questions`);
    
    // Update original content reference
    originalContentRef.current = {
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questionnaire.questions || [],
      courseContent: questionnaire.courseContent
    };
    
    // Reset display content to original
    setDisplayContent({
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questionnaire.questions || [],
      courseContent: questionnaire.courseContent,
      isTranslating: false
    });
    
    setEditedQuestionnaire(questionnaire);
    setEditedQuestions(questionnaire.questions || []);
    
    // Translate if current language is not English
    const currentLanguage = LanguageService.getCurrentLanguage();
    if (currentLanguage !== 'en' && questionnaire.questions?.length > 0) {
      translateContent(currentLanguage);
    }
  }, [questionnaire.id, translateContent]);

  // Listen for language changes
  useEffect(() => {
    const unsubscribe = LanguageService.onLanguageChange((newLanguage: string) => {
      console.log(`🌍 Language changed to ${newLanguage}`);
      translateContent(newLanguage);
    });

    return () => {
      unsubscribe();
      if (translationControllerRef.current) {
        translationControllerRef.current.abort();
      }
    };
  }, [translateContent]);

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
      
      // For guest users, trigger a page reload to refresh the questionnaire list
      // This will hide the completed questionnaire from their view
      const currentUser = AuthService.getCurrentUser();
      if (currentUser?.role === 'guest') {
        console.log('🔄 Guest user completed questionnaire, reloading page...');
        window.location.reload();
      }
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
      estimatedTime: questionnaire.timeframe || 30,
      createdAt: new Date().toISOString(),
      difficulty: 'medium' as const,
      isActive: true
    };
  };

  const handleCourseComplete = (courseId: string) => {
    toast({
      title: "Course Completed!",
      description: "You can now access the questionnaire.",
    });
  };

  // SIMPLE RENDERING: Use display content directly
  const renderQuestionnaire = isEditing ? editedQuestionnaire : {
    ...questionnaire,
    title: displayContent.title,
    description: displayContent.description
  };
  
  const renderQuestions = isEditing ? editedQuestions : displayContent.questions;
  const renderCourseContent = displayContent.courseContent;

  // Debug logging
  console.log(`🎯 QuestionnaireDisplay render:`, {
    questionnaireId: questionnaire.id,
    language: currentLanguageRef.current,
    isTranslating: displayContent.isTranslating,
    questionsCount: renderQuestions.length,
    hasQuestions: renderQuestions.length > 0,
    isEditing
  });

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl overflow-hidden mb-4">
      <CardHeader className="p-6">
        <QuestionnaireHeader
          questionnaire={renderQuestionnaire}
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
        {displayContent.isTranslating && (
          <div className="text-sm text-blue-600 italic bg-blue-50 p-3 rounded-lg border border-blue-200 animate-pulse">
            🌐 Translating content to {LanguageService.getCurrentLanguage()}...
          </div>
        )}
      </CardHeader>

      {renderCourseContent && (
        <div className="border-b border-slate-200">
          <CourseDisplay 
            course={convertCourseContent(renderCourseContent)}
            onCourseComplete={handleCourseComplete}
          />
        </div>
      )}

      <CardContent>
        <QuestionsSection
          questions={renderQuestions}
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
