
import { useState, useEffect } from 'react';
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
  const [translatedQuestionnaire, setTranslatedQuestionnaire] = useState<Questionnaire>(questionnaire);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (questionnaire) {
      setEditedQuestionnaire(questionnaire);
      setEditedQuestions(questionnaire.questions || []);
      
      // Translate questionnaire content when component mounts or language changes
      translateQuestionnaireContent(questionnaire);
    }
  }, [questionnaire]);

  // Monitor language changes and retranslate content
  useEffect(() => {
    const currentLanguage = LanguageService.getCurrentLanguage();
    if (currentLanguage !== 'en' && !isEditing) {
      translateQuestionnaireContent(questionnaire);
    } else if (currentLanguage === 'en') {
      setTranslatedQuestionnaire(questionnaire);
    }
  }, []);

  const translateQuestionnaireContent = async (originalQuestionnaire: Questionnaire) => {
    const currentLanguage = LanguageService.getCurrentLanguage();
    
    if (currentLanguage === 'en') {
      setTranslatedQuestionnaire(originalQuestionnaire);
      return;
    }

    setIsTranslating(true);
    console.log(`Translating questionnaire content to ${currentLanguage}...`);

    try {
      const translatedQuestionnaire = { ...originalQuestionnaire };
      
      // Translate title and description
      if (originalQuestionnaire.title) {
        translatedQuestionnaire.title = await LanguageService.translateContent(
          originalQuestionnaire.title, 
          currentLanguage
        );
      }
      
      if (originalQuestionnaire.description) {
        translatedQuestionnaire.description = await LanguageService.translateContent(
          originalQuestionnaire.description, 
          currentLanguage
        );
      }
      
      // Translate questions
      if (originalQuestionnaire.questions && originalQuestionnaire.questions.length > 0) {
        translatedQuestionnaire.questions = await LanguageService.translateQuestions(
          originalQuestionnaire.questions, 
          currentLanguage
        );
      }
      
      // Translate course content if present
      if (originalQuestionnaire.courseContent) {
        const courseContent = { ...originalQuestionnaire.courseContent };
        
        if (courseContent.title) {
          courseContent.title = await LanguageService.translateContent(
            courseContent.title, 
            currentLanguage
          );
        }
        
        if (courseContent.description) {
          courseContent.description = await LanguageService.translateContent(
            courseContent.description, 
            currentLanguage
          );
        }
        
        if (courseContent.modules && Array.isArray(courseContent.modules)) {
          courseContent.modules = await Promise.all(
            courseContent.modules.map(async (module: any) => ({
              ...module,
              title: module.title ? await LanguageService.translateContent(module.title, currentLanguage) : module.title,
              content: module.content ? await LanguageService.translateContent(module.content, currentLanguage) : module.content
            }))
          );
        }
        
        translatedQuestionnaire.courseContent = courseContent;
      }
      
      setTranslatedQuestionnaire(translatedQuestionnaire);
      console.log('Questionnaire translation completed successfully');
    } catch (error) {
      console.error('Error translating questionnaire:', error);
      // Fallback to original content if translation fails
      setTranslatedQuestionnaire(originalQuestionnaire);
    } finally {
      setIsTranslating(false);
    }
  };

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

  // Use translated questionnaire for display, original for editing
  const displayQuestionnaire = isEditing ? editedQuestionnaire : translatedQuestionnaire;
  const displayQuestions = isEditing ? editedQuestions : translatedQuestionnaire.questions || [];

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
            Translating content...
          </div>
        )}
      </CardHeader>

      {/* Course Content Display */}
      {displayQuestionnaire.courseContent && (
        <div className="border-b border-slate-200">
          <CourseDisplay 
            course={convertCourseContent(displayQuestionnaire.courseContent)}
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
