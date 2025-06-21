
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Star, MessageSquare, Edit3, Trash2, Send } from 'lucide-react';
import QuestionnaireEditor from '@/components/QuestionnaireEditor';
import { ResponseService } from '@/services/ResponseService';
import { AuthService } from '@/services/AuthService';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive?: boolean;
}

interface QuestionnaireDisplayProps {
  questionnaire: Questionnaire;
  isAdmin?: boolean;
  onUpdate?: (updatedQuestionnaire: Questionnaire) => void;
  onDelete?: (questionnaireId: string) => void;
}

const QuestionnaireDisplay = ({ questionnaire, isAdmin = false, onUpdate, onDelete }: QuestionnaireDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = AuthService.getCurrentUser();
  const isGuest = currentUser?.role === 'guest';

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice':
        return <CheckCircle className="h-4 w-4" />;
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'rating':
        return <Star className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple-choice':
        return 'bg-blue-600 text-blue-100';
      case 'text':
        return 'bg-green-600 text-green-100';
      case 'rating':
        return 'bg-yellow-600 text-yellow-100';
      case 'yes-no':
        return 'bg-purple-600 text-purple-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const handleSave = (updatedQuestionnaire: Questionnaire) => {
    if (onUpdate) {
      onUpdate(updatedQuestionnaire);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this questionnaire?')) {
      onDelete(questionnaire.id);
      toast({
        title: "Success",
        description: "Questionnaire deleted successfully",
      });
    }
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (!isGuest) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitResponse = async () => {
    if (!isGuest || !currentUser) return;

    // Check if all questions are answered
    const unansweredQuestions = questionnaire.questions.filter(q => !(q.id in answers));
    if (unansweredQuestions.length > 0) {
      toast({
        title: "Incomplete Response",
        description: `Please answer all ${questionnaire.questions.length} questions before submitting.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        questionnaireId: questionnaire.id,
        questionnaireTitle: questionnaire.title,
        userId: currentUser.token,
        username: currentUser.username,
        answers: questionnaire.questions.map(question => ({
          questionId: question.id,
          questionText: question.text,
          selectedOption: question.options?.[answers[question.id]] || '',
          selectedOptionIndex: answers[question.id]
        })),
        submittedAt: new Date().toISOString()
      };

      ResponseService.saveResponse(response);

      toast({
        title: "Response Submitted",
        description: "Thank you for completing the questionnaire!",
      });

      // Reset answers after successful submission
      setAnswers({});
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitReady = questionnaire.questions.every(q => q.id in answers);

  if (isEditing) {
    return (
      <QuestionnaireEditor
        questionnaire={questionnaire}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Card className="animate-fade-in bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg text-white">{questionnaire.title}</CardTitle>
              {questionnaire.isActive !== undefined && (
                <Badge 
                  variant={questionnaire.isActive ? "default" : "secondary"}
                  className={questionnaire.isActive ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"}
                >
                  {questionnaire.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">{questionnaire.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500">
              {new Date(questionnaire.createdAt).toLocaleString()}
            </div>
            {isAdmin && (
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questionnaire.questions.map((question, index) => (
            <div key={question.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 p-1 rounded-full mt-1">
                  {getQuestionIcon(question.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white">
                      {index + 1}. {question.text}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 ${getQuestionTypeColor(question.type)}`}
                    >
                      {question.type.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  {question.options && question.options.length > 0 && (
                    <div className="mt-2">
                      {!isGuest && (
                        <p className="text-xs text-gray-400 mb-2">Options:</p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className={`px-3 py-2 rounded text-sm transition-colors cursor-pointer ${
                              isGuest 
                                ? answers[question.id] === optionIndex
                                  ? 'bg-blue-600 text-white border-2 border-blue-400'
                                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-2 border-transparent'
                                : 'bg-gray-700 text-gray-200'
                            }`}
                            onClick={() => handleAnswerSelect(question.id, optionIndex)}
                          >
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>Total Questions:</strong> {questionnaire.questions.length}
            {isGuest && (
              <span className="ml-4">
                <strong>Answered:</strong> {Object.keys(answers).length}/{questionnaire.questions.length}
              </span>
            )}
          </p>
        </div>

        {/* Submit Button for Guests */}
        {isGuest && (
          <div className="mt-4">
            <Button
              onClick={handleSubmitResponse}
              disabled={!isSubmitReady || isSubmitting}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Submit Response</span>
                </div>
              )}
            </Button>
            {!isSubmitReady && (
              <p className="text-sm text-yellow-400 mt-2 text-center">
                Please answer all questions to submit your response
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionnaireDisplay;
