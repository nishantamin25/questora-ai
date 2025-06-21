
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
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
      options: q.options?.length === 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D']
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

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: 'New question',
      type: 'multiple-choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D']
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
    // Validate that all questions have 4 options
    const invalidQuestions = editedQuestionnaire.questions.filter(q => !q.options || q.options.length !== 4);
    if (invalidQuestions.length > 0) {
      toast({
        title: "Error",
        description: "All questions must have exactly 4 options",
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
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Edit3 className="h-5 w-5" />
            <span>Edit Questionnaire</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={onCancel} variant="outline" className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title and Description */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-gray-300">Title</Label>
            <Input
              id="title"
              value={editedQuestionnaire.title}
              onChange={(e) => setEditedQuestionnaire(prev => ({ ...prev, title: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-gray-300">Description</Label>
            <Textarea
              id="description"
              value={editedQuestionnaire.description}
              onChange={(e) => setEditedQuestionnaire(prev => ({ ...prev, description: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Questions</h3>
            <Button onClick={handleAddQuestion} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {editedQuestionnaire.questions.map((question, index) => (
            <div key={question.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-medium text-gray-300">Question {index + 1}</h4>
                <Button
                  onClick={() => handleDeleteQuestion(question.id)}
                  size="sm"
                  variant="destructive"
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">Question Text</Label>
                  <Textarea
                    value={question.text}
                    onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Options (exactly 4 required)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {(question.options || []).map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <span className="text-gray-400 font-mono">{String.fromCharCode(65 + optionIndex)}.</span>
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(question.id, optionIndex, e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                        />
                      </div>
                    ))}
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
