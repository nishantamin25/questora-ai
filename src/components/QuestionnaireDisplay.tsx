import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ResponseService } from '@/services/ResponseService';
import { LanguageService } from '@/services/LanguageService';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { CourseService } from '@/services/CourseService';
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
  courseId?: string;
  requiresCourseCompletion?: boolean;
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
  const [courseAccessBlocked, setCourseAccessBlocked] = useState(false);
  const [course, setCourse] = useState<any>(null);
  
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
  
  const currentUser = AuthService.getCurrentUser();

  // Check course completion and access
  useEffect(() => {
    const checkAccess = async () => {
      if (!isAdmin && questionnaire.requiresCourseCompletion && questionnaire.courseId) {
        // Load the course
        const courseData = CourseService.getCourseById(questionnaire.courseId);
        setCourse(courseData);
        
        // Check if course is completed
        const accessCheck = QuestionnaireService.canAccessQuestionnaire(questionnaire.id, currentUser?.role || 'guest');
        
        if (!accessCheck.canAccess) {
          setCourseAccessBlocked(true);
          setQuestionsVisible(false);
          
          if (accessCheck.reason) {
            toast({
              title: "Course Required",
              description: accessCheck.reason,
              variant: "default"
            });
          }
        } else {
          setCourseAccessBlocked(false);
        }
      }
    };

    checkAccess();
  }, [questionnaire, isAdmin, currentUser]);

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
    console.log('🎉 Course completed:', courseId);
    
    // Mark course as completed
    CourseService.markCourseCompleted(courseId);
    
    // Remove access block
    setCourseAccessBlocked(false);
    
    toast({
      title: "🎉 Course Completed!",
      description: "Excellent work! You can now access the assessment test.",
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

  // Determine what to show based on course completion requirement  
  const shouldShowCourse = !isAdmin && questionnaire.requiresCourseCompletion && questionnaire.courseId && course;
  const shouldBlockQuestions = !isAdmin && courseAccessBlocked;

  // Course access blocking UI
  const renderCourseRequirement = () => {
    if (!shouldShowCourse) return null;

    return (
      <div className="border-b border-slate-200">
        <div className="p-6 bg-blue-50 border-l-4 border-blue-400">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📚 Course Required
          </h3>
          <p className="text-blue-700 mb-4">
            You must complete the course below before you can access the test questions.
          </p>
          {courseAccessBlocked && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 font-medium">
                ⚠️ Test questions are locked until course completion
              </p>
            </div>
          )}
        </div>
        
        <CourseDisplay 
          course={convertCourseContent(course)}
          onCourseComplete={handleCourseComplete}
        />
      </div>
    );
  };

  // Test access denied UI
  const renderAccessDenied = () => {
    if (!shouldBlockQuestions) return null;

    return (
      <CardContent>
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Test Locked
          </h3>
          <p className="text-gray-600 mb-4">
            Complete the course above to unlock the test questions.
          </p>
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mx-auto max-w-md">
            <p className="text-blue-800 text-sm">
              💡 <strong>How to unlock:</strong> Read through all course materials and click "Complete Course" when finished.
            </p>
          </div>
        </div>
      </CardContent>
    );
  };

  console.log(`🎯 QuestionnaireDisplay render:`, {
    questionnaireId: questionnaire.id,
    isAdmin,
    shouldShowCourse,
    shouldBlockQuestions,
    courseAccessBlocked,
    hasCourse: !!course,
    questionsCount: renderQuestions.length
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

      {/* Show course requirement section */}
      {renderCourseRequirement()}

      {/* Show questions or access denied */}
      {shouldBlockQuestions ? renderAccessDenied() : (
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
      )}
    </Card>
  );
};

export default QuestionnaireDisplay;
