
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Edit3, Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';
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

  console.log('🎯 QuestionnaireEditor - Current questions:', editedQuestionnaire.questions.map(q => ({
    id: q.id,
    text: q.text.substring(0, 30) + '...',
    correctAnswer: q.correctAnswer,
    hasOptions: !!q.options
  })));

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
    console.log(`🎯 Admin selecting correct answer for question ${questionId}: Option ${String.fromCharCode(65 + correctIndex)} (index ${correctIndex})`);
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

  const validateQuestionnaire = () => {
    const errors: string[] = [];

    if (!editedQuestionnaire.title.trim()) {
      errors.push("Title is required");
    }

    editedQuestionnaire.questions.forEach((question, index) => {
      if (!question.text.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }
      if (!question.options || question.options.length !== 4) {
        errors.push(`Question ${index + 1}: Must have exactly 4 options`);
      }
      if (question.options?.some(opt => !opt.trim())) {
        errors.push(`Question ${index + 1}: All options must have text`);
      }
      if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer > 3) {
        errors.push(`Question ${index + 1}: Must have a valid correct answer selected`);
      }
    });

    return errors;
  };

  const handleSave = () => {
    const validationErrors = validateQuestionnaire();
    
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join('. '),
        variant: "destructive"
      });
      return;
    }

    // Log the admin's answer selections for debugging
    console.log('💾 Saving questionnaire with admin-selected answers:');
    editedQuestionnaire.questions.forEach((q, index) => {
      console.log(`Question ${index + 1}: Correct answer is ${String.fromCharCode(65 + (q.correctAnswer || 0))} (index ${q.correctAnswer})`);
    });

    onSave(editedQuestionnaire);
    toast({
      title: "Success",
      description: "Questionnaire updated successfully with your selected correct answers",
    });
  };

  const getAnswerStatus = (question: Question) => {
    if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer > 3) {
      return { status: 'error', message: 'No correct answer selected' };
    }
    const optionLetter = String.fromCharCode(65 + question.correctAnswer);
    return { status: 'success', message: `Correct answer: ${optionLetter}` };
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-lg rounded-xl">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center space-x-2 font-poppins">
            <Edit3 className="h-5 w-5 text-violet-600" />
            <span>Edit Questionnaire & Select Correct Answers</span>
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

          {editedQuestionnaire.questions.map((question, index) => {
            const answerStatus = getAnswerStatus(question);
            
            return (
              <div key={question.id} className="border-2 border-slate-300 rounded-xl p-6 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-bold text-slate-800 font-poppins text-lg">Question {index + 1}</h4>
                    <div className={`flex items-center text-sm px-3 py-2 rounded-full font-semibold ${
                      answerStatus.status === 'error' 
                        ? 'bg-red-100 text-red-700 border border-red-300' 
                        : 'bg-green-100 text-green-700 border border-green-300'
                    }`}>
                      {answerStatus.status === 'error' && <AlertCircle className="h-4 w-4 mr-1" />}
                      {answerStatus.message}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteQuestion(question.id)}
                    size="sm"
                    variant="destructive"
                    className="ml-2 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <Label className="text-slate-700 font-bold font-poppins text-base">Question Text</Label>
                    <Textarea
                      value={question.text}
                      onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                      className="mt-2 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter text-base"
                      rows={3}
                    />
                  </div>

                  {/* ALWAYS SHOW THE RADIO BUTTON SECTION */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-4 border-blue-300 rounded-xl p-6 shadow-lg">
                    <div className="mb-6 text-center">
                      <h5 className="text-2xl font-bold text-blue-800 font-poppins mb-3">
                        🎯 SELECT THE CORRECT ANSWER
                      </h5>
                      <p className="text-blue-700 font-medium font-inter text-lg">
                        Click the radio button (○) next to the correct option below
                      </p>
                    </div>
                    
                    <RadioGroup
                      value={question.correctAnswer?.toString() || "0"}
                      onValueChange={(value) => {
                        const correctIndex = parseInt(value);
                        console.log(`🎯 RADIO BUTTON CLICKED - Question ${question.id}, selecting option ${correctIndex} (${String.fromCharCode(65 + correctIndex)})`);
                        handleCorrectAnswerChange(question.id, correctIndex);
                      }}
                      className="space-y-4"
                    >
                      {(question.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((option, optionIndex) => (
                        <div key={optionIndex} className={`flex items-center space-x-4 p-6 rounded-xl border-3 transition-all duration-200 cursor-pointer ${
                          question.correctAnswer === optionIndex 
                            ? 'bg-green-200 border-green-600 shadow-xl ring-4 ring-green-400' 
                            : 'bg-white border-gray-400 hover:border-blue-500 hover:shadow-lg hover:bg-blue-50'
                        }`}>
                          <div className="flex items-center space-x-4">
                            <RadioGroupItem 
                              value={optionIndex.toString()} 
                              id={`${question.id}-answer-${optionIndex}`}
                              className={`w-8 h-8 border-4 ${
                                question.correctAnswer === optionIndex 
                                  ? 'border-green-600 bg-green-600 text-white' 
                                  : 'border-blue-600 hover:border-blue-700'
                              }`}
                            />
                            <Label 
                              htmlFor={`${question.id}-answer-${optionIndex}`}
                              className="text-xl font-bold text-slate-800 min-w-[50px] cursor-pointer font-poppins"
                            >
                              {String.fromCharCode(65 + optionIndex)}.
                            </Label>
                          </div>
                          <Input
                            value={option}
                            onChange={(e) => handleOptionChange(question.id, optionIndex, e.target.value)}
                            className="flex-1 border-2 border-slate-400 focus:border-violet-600 focus:ring-violet-600 text-lg rounded-lg font-inter font-medium py-3"
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                          />
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <div className="mt-6 text-center bg-white rounded-lg p-4 border-2 border-blue-200">
                      <p className="text-lg text-blue-800 font-bold font-inter">
                        <strong>Current selection:</strong> Option {String.fromCharCode(65 + (question.correctAnswer || 0))} 
                        {question.correctAnswer !== undefined ? ' ✅' : ' ❌ (Please select an answer)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionnaireEditor;
