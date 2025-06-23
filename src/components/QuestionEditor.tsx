
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: number;
}

interface QuestionEditorProps {
  question: Question;
  index: number;
  onQuestionTextEdit: (questionId: string, value: string) => void;
  onOptionEdit: (questionId: string, optionIndex: number, value: string) => void;
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, optionIndex: number) => void;
}

const QuestionEditor = ({
  question,
  index,
  onQuestionTextEdit,
  onOptionEdit,
  onAddOption,
  onRemoveOption
}: QuestionEditorProps) => {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-b-0">
      <div className="mb-3">
        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Question {index + 1}</Label>
          <Textarea
            value={question.text}
            onChange={(e) => onQuestionTextEdit(question.id, e.target.value)}
            className="text-slate-900 font-medium border-slate-300 focus:border-violet-500"
            rows={2}
          />
        </div>
      </div>
      
      {question.options && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 font-medium">Options</Label>
            <Button
              type="button"
              onClick={() => onAddOption(question.id)}
              size="sm"
              variant="outline"
              className="text-violet-600 border-violet-300 hover:bg-violet-50"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Option
            </Button>
          </div>
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center space-x-2">
              <span className="text-sm text-slate-500 w-6">{optionIndex + 1}.</span>
              <Input
                value={option}
                onChange={(e) => onOptionEdit(question.id, optionIndex, e.target.value)}
                className="flex-1 border-slate-300 focus:border-violet-500"
              />
              {question.options && question.options.length > 2 && (
                <Button
                  type="button"
                  onClick={() => onRemoveOption(question.id, optionIndex)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;
