import { useState, useEffect, useCallback } from 'react';
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
  
  // Store original content (in English) and translated versions
  const [originalContent] = useState<{
    title: string;
    description: string;
    questions: Question[];
    courseContent?: any;
  }>({
    title: questionnaire.title,
    description: questionnaire.description,
    questions: questionnaire.questions || [],
    courseContent: questionnaire.courseContent
  });
  
  // CRITICAL FIX: Initialize with original content to prevent empty questions
  const [translatedContent, setTranslatedContent] = useState<{
    title: string;
    description: string;
    questions: Question[];
    courseContent?: any;
  }>({
    title: questionnaire.title,
    description: questionnaire.description,
    questions: questionnaire.questions || [], // Always start with questions visible
    courseContent: questionnaire.courseContent
  });
  
  const [currentTranslationLanguage, setCurrentTranslationLanguage] = useState<string>(() => {
    return LanguageService.getCurrentLanguage();
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const translateContentToLanguage = useCallback(async (targetLanguage: string) => {
    // CRITICAL FIX: Never clear questions during translation
    const sourceContent = originalContent;
    
    if (targetLanguage === 'en') {
      // If switching back to English, use original content
      setTranslatedContent({
        title: sourceContent.title,
        description: sourceContent.description,
        questions: sourceContent.questions, // Always preserve questions
        courseContent: sourceContent.courseContent
      });
      setCurrentTranslationLanguage('en');
      return;
    }

    // Don't translate if already in the target language
    if (currentTranslationLanguage === targetLanguage) {
      return;
    }

    setIsTranslating(true);
    console.log(`Translating questionnaire content from original to ${targetLanguage}...`);

    try {
      // CRITICAL FIX: Create complete content object with existing questions as fallback
      const newTranslatedContent = {
        title: sourceContent.title,
        description: sourceContent.description,
        questions: translatedContent.questions, // Keep current questions during translation
        courseContent: sourceContent.courseContent
      };
      
      // Translate title and description
      if (sourceContent.title) {
        newTranslatedContent.title = await LanguageService.translateContent(
          sourceContent.title, 
          targetLanguage
        );
      }
      
      if (sourceContent.description) {
        newTranslatedContent.description = await LanguageService.translateContent(
          sourceContent.description, 
          targetLanguage
        );
      }
      
      // CRITICAL FIX: Only translate questions if they exist and always preserve them
      if (sourceContent.questions && sourceContent.questions.length > 0) {
        console.log(`Translating ${sourceContent.questions.length} questions to ${targetLanguage}...`);
        const translatedQuestions = await LanguageService.translateQuestions(
          sourceContent.questions, 
          targetLanguage
        );
        // Ensure we never lose questions due to translation failure
        newTranslatedContent.questions = translatedQuestions && translatedQuestions.length > 0 
          ? translatedQuestions 
          : sourceContent.questions; // Fallback to original if translation fails
      } else {
        // Preserve existing questions if no source questions
        newTranslatedContent.questions = translatedContent.questions;
      }
      
      // Translate course content if present
      if (sourceContent.courseContent) {
        const courseContent = { ...sourceContent.courseContent };
        
        if (courseContent.title) {
          courseContent.title = await LanguageService.translateContent(
            courseContent.title, 
            targetLanguage
          );
        }
        
        if (courseContent.description) {
          courseContent.description = await LanguageService.translateContent(
            courseContent.description, 
            targetLanguage
          );
        }
        
        if (courseContent.modules && Array.isArray(courseContent.modules)) {
          courseContent.modules = await Promise.all(
            courseContent.modules.map(async (module: any) => ({
              ...module,
              title: module.title ? await LanguageService.translateContent(module.title, targetLanguage) : module.title,
              content: module.content ? await LanguageService.translateContent(module.content, targetLanguage) : module.content
            }))
          );
        }
        
        newTranslatedContent.courseContent = courseContent;
      }
      
      // CRITICAL FIX: Atomic update to prevent questions from disappearing
      setTranslatedContent(newTranslatedContent);
      setCurrentTranslationLanguage(targetLanguage);
      
      console.log(`Translation to ${targetLanguage} completed successfully`, {
        questionsCount: newTranslatedContent.questions.length,
        questionsPreserved: true
      });
    } catch (error) {
      console.error('Error translating questionnaire:', error);
      
      // CRITICAL FIX: On error, preserve all existing content including questions
      toast({
        title: "Translation Error",
        description: "Failed to translate content. Keeping current language version.",
        variant: "destructive"
      });
      
      // Don't change currentTranslationLanguage on error to prevent infinite loops
    } finally {
      setIsTranslating(false);
    }
  }, [originalContent, currentTranslationLanguage, translatedContent.questions]);

  // Initialize with questionnaire data
  useEffect(() => {
    if (questionnaire) {
      setEditedQuestionnaire(questionnaire);
      setEditedQuestions(questionnaire.questions || []);
      
      // CRITICAL FIX: Always ensure questions are visible from the start
      const currentLanguage = LanguageService.getCurrentLanguage();
      
      // Initialize translated content with original content
      setTranslatedContent({
        title: questionnaire.title,
        description: questionnaire.description,
        questions: questionnaire.questions || [], // Always preserve questions
        courseContent: questionnaire.courseContent
      });
      
      // Only translate if we're not in English and haven't translated yet
      if (currentLanguage !== 'en' && currentLanguage !== currentTranslationLanguage) {
        // Translate asynchronously without clearing existing content
        translateContentToLanguage(currentLanguage);
      } else {
        setCurrentTranslationLanguage(currentLanguage);
      }
    }
  }, [questionnaire]); // Removed dependencies that cause loops

  // Listen for language changes using the LanguageService listener
  useEffect(() => {
    const unsubscribe = LanguageService.onLanguageChange((newLanguage: string) => {
      console.log(`QuestionnaireDisplay: Language changed to ${newLanguage}, current: ${currentTranslationLanguage}`);
      
      // CRITICAL FIX: Always translate when language changes, but preserve questions
      if (newLanguage !== currentTranslationLanguage) {
        console.log(`Translating content from ${currentTranslationLanguage} to ${newLanguage}...`);
        translateContentToLanguage(newLanguage);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [currentTranslationLanguage, translateContentToLanguage]);

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

  // Use appropriate content based on editing state
  const displayQuestionnaire = isEditing ? editedQuestionnaire : {
    ...questionnaire,
    title: translatedContent.title,
    description: translatedContent.description
  };
  
  // CRITICAL FIX: Always ensure questions are available and never empty
  const displayQuestions = isEditing 
    ? editedQuestions 
    : (translatedContent.questions && translatedContent.questions.length > 0 
        ? translatedContent.questions 
        : originalContent.questions); // Fallback to original if translated is empty
  
  const displayCourseContent = translatedContent.courseContent;

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
        {isTranslating && (
          <div className="text-sm text-slate-500 italic">
            Translating content to {LanguageService.getCurrentLanguage()}...
          </div>
        )}
      </CardHeader>

      {/* Course Content Display */}
      {displayCourseContent && (
        <div className="border-b border-slate-200">
          <CourseDisplay 
            course={convertCourseContent(displayCourseContent)}
            onCourseComplete={handleCourseComplete}
          />
        </div>
      )}

      {/* Questions Display - Collapsible */}
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
