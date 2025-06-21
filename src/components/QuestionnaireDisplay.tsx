
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Star, MessageSquare, Edit3, Trash2 } from 'lucide-react';
import QuestionnaireEditor from '@/components/QuestionnaireEditor';
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
                      <p className="text-xs text-gray-400 mb-2">Options:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className="bg-gray-700 px-3 py-2 rounded text-sm text-gray-200"
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
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionnaireDisplay;
