
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Save, Edit, Trash2, Clock, Users, Hash } from 'lucide-react';

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

interface QuestionnaireHeaderProps {
  questionnaire: Questionnaire;
  editedQuestionnaire: Questionnaire;
  isEditing: boolean;
  isAdmin: boolean;
  isPartOfSet: boolean;
  onQuestionnaireChange: (questionnaire: Questionnaire) => void;
  onEditToggle: () => void;
  onCancelEdit: () => void;
  onActiveToggle: (checked: boolean) => void;
  onDelete: (questionnaireId: string) => void;
  onSaveTest: () => void;
}

const QuestionnaireHeader = ({
  questionnaire,
  editedQuestionnaire,
  isEditing,
  isAdmin,
  isPartOfSet,
  onQuestionnaireChange,
  onEditToggle,
  onCancelEdit,
  onActiveToggle,
  onDelete,
  onSaveTest
}: QuestionnaireHeaderProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSetColor = (setNumber: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-lime-100 text-lime-800 border-lime-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-rose-100 text-rose-800 border-rose-200'
    ];
    return colors[(setNumber - 1) % colors.length];
  };

  return (
    <div className="bg-gradient-to-r from-slate-50 to-violet-50 border-b border-slate-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editedQuestionnaire.title}
              onChange={(e) => onQuestionnaireChange({ ...editedQuestionnaire, title: e.target.value })}
              className="text-lg font-bold mb-2 border-slate-300 focus:border-violet-500"
            />
          ) : (
            <h3 className="text-slate-900 font-poppins text-lg mb-2 font-bold">
              {questionnaire.title}
            </h3>
          )}
          
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {questionnaire.difficulty && (
              <Badge variant="secondary" className={`${getDifficultyColor(questionnaire.difficulty)} font-medium`}>
                {questionnaire.difficulty.charAt(0).toUpperCase() + questionnaire.difficulty.slice(1)}
              </Badge>
            )}
            
            {questionnaire.setNumber && questionnaire.totalSets && questionnaire.totalSets > 1 && (
              <Badge variant="secondary" className={`${getSetColor(questionnaire.setNumber)} font-medium`}>
                <Hash className="h-3 w-3 mr-1" />
                Set {questionnaire.setNumber}
              </Badge>
            )}
            
            {questionnaire.timeframe && (
              <Badge variant="outline" className="text-slate-600 border-slate-300">
                <Clock className="h-3 w-3 mr-1" />
                {questionnaire.timeframe} min
              </Badge>
            )}
            
            {questionnaire.questions && questionnaire.questions.length > 0 && (
              <Badge variant="outline" className="text-slate-600 border-slate-300">
                <Users className="h-3 w-3 mr-1" />
                {questionnaire.questions.length} questions
              </Badge>
            )}
          </div>
          
          {isEditing ? (
            <Textarea
              value={editedQuestionnaire.description}
              onChange={(e) => onQuestionnaireChange({ ...editedQuestionnaire, description: e.target.value })}
              className="text-slate-600 border-slate-300 focus:border-violet-500"
            />
          ) : (
            <p className="text-slate-600 font-inter text-sm">
              {questionnaire.description}
            </p>
          )}
        </div>
        
        {isAdmin && (
          <div className="flex items-center space-x-2 ml-4">
            {questionnaire.isSaved && (
              <div className="flex items-center space-x-2">
                <Label htmlFor={`active-${questionnaire.id}`} className="text-sm text-slate-600">
                  Active
                </Label>
                <Switch
                  id={`active-${questionnaire.id}`}
                  checked={questionnaire.isActive || false}
                  onCheckedChange={onActiveToggle}
                />
              </div>
            )}
            
            {questionnaire.isSaved ? (
              <>
                <Button 
                  onClick={onEditToggle} 
                  size="sm" 
                  variant={isEditing ? "default" : "outline"}
                  className={isEditing ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                </Button>
                {isEditing && (
                  <Button onClick={onCancelEdit} size="sm" variant="outline">
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={() => onDelete(questionnaire.id)} 
                  size="sm" 
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              !isPartOfSet && (
                <Button onClick={onSaveTest} size="sm" variant="default">
                  <Save className="h-4 w-4 mr-2" />
                  Save Test
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionnaireHeader;
