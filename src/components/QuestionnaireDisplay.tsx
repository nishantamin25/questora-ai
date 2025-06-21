
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Star, MessageSquare } from 'lucide-react';

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
}

interface QuestionnaireDisplayProps {
  questionnaire: Questionnaire;
}

const QuestionnaireDisplay = ({ questionnaire }: QuestionnaireDisplayProps) => {
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
        return 'bg-blue-100 text-blue-800';
      case 'text':
        return 'bg-green-100 text-green-800';
      case 'rating':
        return 'bg-yellow-100 text-yellow-800';
      case 'yes-no':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{questionnaire.description}</p>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(questionnaire.createdAt).toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questionnaire.questions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-1 rounded-full mt-1">
                  {getQuestionIcon(question.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
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
                      <p className="text-xs text-gray-500 mb-2">Options:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className="bg-gray-50 px-3 py-2 rounded text-sm"
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
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Total Questions:</strong> {questionnaire.questions.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionnaireDisplay;
