
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import QuestionDisplay from './QuestionDisplay';
import QuestionEditor from './QuestionEditor';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: number;
}

interface QuestionsSectionProps {
  questions: Question[];
  isEditing: boolean;
  isAdmin: boolean;
  isActive: boolean;
  questionsVisible: boolean;
  responses: Record<string, string>;
  isSubmitting: boolean;
  onQuestionsVisibleChange: (visible: boolean) => void;
  onResponseChange: (questionId: string, value: string) => void;
  onQuestionTextEdit: (questionId: string, value: string) => void;
  onOptionEdit: (questionId: string, optionIndex: number, value: string) => void;
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, optionIndex: number) => void;
  onSubmitResponses: () => void;
}

const QuestionsSection = ({
  questions,
  isEditing,
  isAdmin,
  isActive,
  questionsVisible,
  responses,
  isSubmitting,
  onQuestionsVisibleChange,
  onResponseChange,
  onQuestionTextEdit,
  onOptionEdit,
  onAddOption,
  onRemoveOption,
  onSubmitResponses
}: QuestionsSectionProps) => {
  const allQuestionsAnswered = questions.every(question => responses[question.id]);

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="p-0">
      <Collapsible open={questionsVisible} onOpenChange={onQuestionsVisibleChange}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-6 hover:bg-slate-50"
          >
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-900">
                Questions ({questions.length})
              </span>
            </div>
            {questionsVisible ? (
              <div className="flex items-center space-x-2">
                <EyeOff className="h-4 w-4 text-slate-500" />
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-slate-500" />
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-6">
            {questions.map((question, index) => (
              isEditing ? (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  onQuestionTextEdit={onQuestionTextEdit}
                  onOptionEdit={onOptionEdit}
                  onAddOption={onAddOption}
                  onRemoveOption={onRemoveOption}
                />
              ) : (
                <QuestionDisplay
                  key={question.id}
                  question={question}
                  index={index}
                  response={responses[question.id]}
                  onResponseChange={onResponseChange}
                />
              )
            ))}
            
            {!isAdmin && isActive && (
              <div className="pt-4 border-t border-slate-200">
                <Button 
                  onClick={onSubmitResponses}
                  disabled={!allQuestionsAnswered || isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 rounded-lg font-poppins font-medium py-3"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit Responses'
                  )}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default QuestionsSection;
