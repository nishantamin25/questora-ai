
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
}

interface QuestionnaireEditorProps {
  questionnaire: Questionnaire;
  onSave: (updatedQuestionnaire: Questionnaire) => void;
  onCancel: () => void;
}

const QuestionnaireEditor = ({ questionnaire, onSave, onCancel }: QuestionnaireEditorProps) => {
  const [editedQuestionnaire, setEditedQuestionnaire] = useState<Questionnaire>({
    ...questionnaire,
    questions: questionnaire.questions.map(q => ({
      ...q,
      options: q.options?.length === 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: q.correctAnswer ?? 0
    }))
  });

  const handleQuestionTextChange = (questionId: string, newText: string) => {
    setEditedQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, text: newText } : q
      )
    }));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, newOption: string) => {
    setEditedQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? {
          ...q,
          options: q.options?.map((opt, idx) => idx === optionIndex ? newOption : opt)
        } : q
      )
    }));
  };

  const handleCorrectAnswerChange = (questionId: string, correctIndex: number) => {
    setEditedQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, correctAnswer: correctIndex } : q
      )
    }));
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: 'New question',
      type: 'multiple-choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0
    };

    setEditedQuestionnaire(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const handleDeleteQuestion = (questionId: string) => {
    setEditedQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleSave = () => {
    // Validate that all questions have 4 options and a correct answer
    const invalidQuestions = editedQuestionnaire.questions.filter(q => 
      !q.options || q.options.length !== 4 || q.correctAnswer === undefined
    );
    if (invalidQuestions.length > 0) {
      toast({
        title: "Error",
        description: "All questions must have exactly 4 options and a correct answer selected",
        variant: "destructive"
      });
      return;
    }

    onSave(editedQuestionnaire);
    toast({
      title: "Success",
      description: "Questionnaire updated successfully",
    });
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-lg rounded-xl">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center space-x-2 font-poppins">
            <Edit3 className="h-5 w-5 text-violet-600" />
            <span>Edit Questionnaire</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-poppins">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={onCancel} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Title and Description */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-700 font-medium font-poppins">Title</Label>
            <Input
              id="title"
              value={editedQuestionnaire.title}
              onChange={(e) => setEditedQuestionnaire(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-slate-700 font-medium font-poppins">Description</Label>
            <Textarea
              id="description"
              value={editedQuestionnaire.description}
              onChange={(e) => setEditedQuestionnaire(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
              rows={3}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 font-poppins">Questions</h3>
            <Button onClick={handleAddQuestion} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-poppins">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {editedQuestionnaire.questions.map((question, index) => (
            <div key={question.id} className="border border-slate-300 rounded-xl p-4 bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-slate-800 font-poppins">Question {index + 1}</h4>
                <Button
                  onClick={() => handleDeleteQuestion(question.id)}
                  size="sm"
                  variant="destructive"
                  className="ml-2 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-700 font-medium font-poppins text-sm">Question Text</Label>
                  <Textarea
                    value={question.text}
                    onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                    className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-slate-700 font-medium font-poppins text-sm">Options & Correct Answer</Label>
                  <div className="mt-2 space-y-2">
                    <RadioGroup
                      value={question.correctAnswer?.toString()}
                      onValueChange={(value) => handleCorrectAnswerChange(question.id, parseInt(value))}
                    >
                      {(question.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2 p-2 bg-white border border-slate-200 rounded-lg">
                          <RadioGroupItem 
                            value={optionIndex.toString()} 
                            id={`${question.id}-correct-${optionIndex}`}
                            className="border-green-500 text-green-600"
                          />
                          <Label 
                            htmlFor={`${question.id}-correct-${optionIndex}`}
                            className="text-xs text-slate-600 font-medium min-w-[20px]"
                          >
                            {String.fromCharCode(65 + optionIndex)}.
                          </Label>
                          <Input
                            value={option}
                            onChange={(e) => handleOptionChange(question.id, optionIndex, e.target.value)}
                            className="flex-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 text-sm rounded-lg font-inter"
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                          />
                        </div>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-slate-500 font-inter">
                      Select the radio button next to the correct answer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionnaireEditor;
