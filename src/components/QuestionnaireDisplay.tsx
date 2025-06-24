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
  
  // CRITICAL FIX: Maintain stable original content that never changes
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
  
  // CRITICAL FIX: Separate display content that updates during translation
  const [displayContent, setDisplayContent] = useState<{
    title: string;
    description: string;
    questions: Question[];
    courseContent?: any;
    currentLanguage: string;
  }>({
    title: questionnaire.title,
    description: questionnaire.description,
    questions: questionnaire.questions || [],
    courseContent: questionnaire.courseContent,
    currentLanguage: LanguageService.getCurrentLanguage()
  });
  
  const [isTranslating, setIsTranslating] = useState(false);

  // CRITICAL FIX: Atomic translation function that never clears questions
  const translateContentToLanguage = useCallback(async (targetLanguage: string) => {
    // NEVER translate if questions don't exist
    if (!originalContent.questions || originalContent.questions.length === 0) {
      console.warn('No questions to translate');
      return;
    }

    // Don't translate if already in target language
    if (displayContent.currentLanguage === targetLanguage) {
      return;
    }

    console.log(`Starting translation from ${displayContent.currentLanguage} to ${targetLanguage}...`);
    console.log(`Original questions count: ${originalContent.questions.length}`);
    console.log(`Current display questions count: ${displayContent.questions.length}`);

    setIsTranslating(true);

    try {
      // CRITICAL: Start with current display content to preserve questions
      const newDisplayContent = {
        ...displayContent,
        currentLanguage: targetLanguage
      };

      if (targetLanguage === 'en') {
        // Switch back to English - use original content
        newDisplayContent.title = originalContent.title;
        newDisplayContent.description = originalContent.description;
        newDisplayContent.questions = originalContent.questions;
        newDisplayContent.courseContent = originalContent.courseContent;
      } else {
        // Translate to target language
        console.log('Translating title and description...');
        if (originalContent.title) {
          newDisplayContent.title = await LanguageService.translateContent(
            originalContent.title, 
            targetLanguage
          );
        }
        
        if (originalContent.description) {
          newDisplayContent.description = await LanguageService.translateContent(
            originalContent.description, 
            targetLanguage
          );
        }
        
        // CRITICAL: Translate questions while preserving them
        console.log(`Translating ${originalContent.questions.length} questions...`);
        const translatedQuestions = await LanguageService.translateQuestions(
          originalContent.questions, 
          targetLanguage
        );
        
        // CRITICAL: Always preserve questions - use original as fallback
        newDisplayContent.questions = translatedQuestions && translatedQuestions.length > 0 
          ? translatedQuestions 
          : originalContent.questions;
        
        // Translate course content if present
        if (originalContent.courseContent) {
          const courseContent = { ...originalContent.courseContent };
          
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
          
          newDisplayContent.courseContent = courseContent;
        }
      }
      
      // CRITICAL: Single atomic update to prevent questions from disappearing
      console.log(`Translation completed. Final questions count: ${newDisplayContent.questions.length}`);
      setDisplayContent(newDisplayContent);
      
    } catch (error) {
      console.error('Translation error:', error);
      
      // CRITICAL: On error, preserve current state and just update language
      setDisplayContent(prev => ({
        ...prev,
        currentLanguage: targetLanguage
      }));
      
      toast({
        title: "Translation Error",
        description: "Failed to translate content. Content preserved in current language.",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  }, [originalContent, displayContent]);

  // Initialize display content on mount
  useEffect(() => {
    if (questionnaire) {
      setEditedQuestionnaire(questionnaire);
      setEditedQuestions(questionnaire.questions || []);
      
      const currentLanguage = LanguageService.getCurrentLanguage();
      
      // CRITICAL: Initialize with questionnaire data and current language
      setDisplayContent({
        title: questionnaire.title,
        description: questionnaire.description,
        questions: questionnaire.questions || [],
        courseContent: questionnaire.courseContent,
        currentLanguage: currentLanguage
      });
      
      // Translate if not in English
      if (currentLanguage !== 'en') {
        translateContentToLanguage(currentLanguage);
      }
    }
  }, [questionnaire.id]); // Only depend on questionnaire ID to prevent loops

  // Listen for language changes
  useEffect(() => {
    const unsubscribe = LanguageService.onLanguageChange((newLanguage: string) => {
      console.log(`Language changed to ${newLanguage}, current display language: ${displayContent.currentLanguage}`);
      
      // CRITICAL: Only translate if language actually changed
      if (newLanguage !== displayContent.currentLanguage) {
        console.log(`Initiating translation to ${newLanguage}...`);
        translateContentToLanguage(newLanguage);
      }
    });

    return unsubscribe;
  }, [displayContent.currentLanguage, translateContentToLanguage]);

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

  // CRITICAL FIX: Use display content for rendering, always ensure questions exist
  const displayQuestionnaire = isEditing ? editedQuestionnaire : {
    ...questionnaire,
    title: displayContent.title,
    description: displayContent.description
  };
  
  // CRITICAL FIX: Always ensure questions are available - never empty
  const displayQuestions = isEditing 
    ? editedQuestions 
    : (displayContent.questions && displayContent.questions.length > 0 
        ? displayContent.questions 
        : originalContent.questions); // Always fallback to original
  
  const displayCourseContent = displayContent.courseContent;

  // CRITICAL: Debug logging
  console.log('QuestionnaireDisplay render:', {
    questionnaireId: questionnaire.id,
    isEditing,
    displayQuestionsCount: displayQuestions.length,
    displayLanguage: displayContent.currentLanguage,
    isTranslating,
    originalQuestionsCount: originalContent.questions.length
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
        {isTranslating && (
          <div className="text-sm text-slate-500 italic">
            Translating content to {LanguageService.getCurrentLanguage()}...
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
