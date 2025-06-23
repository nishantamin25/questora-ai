
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: number;
}

interface QuestionDisplayProps {
  question: Question;
  index: number;
  response: string;
  onResponseChange: (questionId: string, value: string) => void;
}

const QuestionDisplay = ({ question, index, response, onResponseChange }: QuestionDisplayProps) => {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-b-0">
      <div className="mb-3">
        <h3 className="text-slate-900 font-medium font-poppins">
          {index + 1}. {question.text}
        </h3>
      </div>
      
      {question.options && (
        <RadioGroup
          value={response || ''}
          onValueChange={(value) => onResponseChange(question.id, value)}
          className="space-y-2"
        >
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option}
                id={`${question.id}-${optionIndex}`}
                className="border-slate-300"
              />
              <Label
                htmlFor={`${question.id}-${optionIndex}`}
                className="text-slate-700 font-inter cursor-pointer hover:text-slate-900"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
};

export default QuestionDisplay;
