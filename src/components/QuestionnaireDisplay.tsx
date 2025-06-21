
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, FileText, Star, MessageSquare, Edit3, Trash2, Send, Save, Trophy, Users, Clock, FileCheck } from 'lucide-react';
import QuestionnaireEditor from '@/components/QuestionnaireEditor';
import SaveTestDialog from '@/components/SaveTestDialog';
import { ResponseService } from '@/services/ResponseService';
import { AuthService } from '@/services/AuthService';
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

interface QuestionnaireDisplayProps {
  questionnaire: Questionnaire;
  isAdmin?: boolean;
  onUpdate?: (updatedQuestionnaire: Questionnaire) => void;
  onDelete?: (questionnaireId: string) => void;
}

const QuestionnaireDisplay = ({ questionnaire, isAdmin = false, onUpdate, onDelete }: QuestionnaireDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<{ score: number; totalQuestions: number; answers: any[] } | null>(null);

  const currentUser = AuthService.getCurrentUser();
  const isGuest = currentUser?.role === 'guest';

  // Get test taker count - fixed method name
  const responses = ResponseService.getResponsesByQuestionnaire(questionnaire.id);
  const testTakersCount = new Set(responses.map(r => r.username || r.userId)).size;

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'radio':
      case 'multiple-choice':
        return <CheckCircle className="h-4 w-4 text-violet-500" />;
      case 'text':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'rating':
        return <Star className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadge = () => {
    if (!questionnaire.isSaved) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-poppins">Unsaved</Badge>;
    }
    if (!questionnaire.isActive) {
      return <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-poppins">Inactive</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200 font-poppins">Active</Badge>;
  };

  const handleSave = (updatedQuestionnaire: Questionnaire) => {
    if (onUpdate) {
      onUpdate(updatedQuestionnaire);
    }
    setIsEditing(false);
  };

  const handleTestSave = (savedQuestionnaire: Questionnaire) => {
    if (onUpdate) {
      onUpdate(savedQuestionnaire);
    }
    setShowSaveDialog(false);
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
      // Calculate score based on correct answers
      const userAnswers = Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedOptionIndex: selectedIndex
      }));

      const results = ResponseService.calculateScore(userAnswers, questionnaire);
      setTestResults(results);

      const response = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        questionnaireId: questionnaire.id,
        questionnaireTitle: questionnaire.testName || questionnaire.title,
        userId: currentUser.token,
        username: currentUser.username,
        answers: results.answers,
        submittedAt: new Date().toISOString(),
        score: results.score,
        totalQuestions: results.totalQuestions
      };

      ResponseService.saveResponse(response);

      setShowResults(true);
      toast({
        title: "Response Submitted",
        description: `You scored ${results.score}/${results.totalQuestions}!`,
      });

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

  const resetTest = () => {
    setAnswers({});
    setShowResults(false);
    setTestResults(null);
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

  if (showSaveDialog) {
    return (
      <SaveTestDialog
        questionnaire={questionnaire}
        onSave={handleTestSave}
        onCancel={() => setShowSaveDialog(false)}
      />
    );
  }

  return (
    <Card className="animate-fade-in bg-white border border-slate-200 shadow-lg rounded-xl">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 flex-wrap">
              <CardTitle className="text-xl text-slate-900 font-poppins">
                {questionnaire.testName || questionnaire.title}
              </CardTitle>
              {getStatusBadge()}
              {isAdmin && questionnaire.difficulty && (
                <Badge className={getDifficultyColor(questionnaire.difficulty) + " font-poppins"}>
                  {questionnaire.difficulty.charAt(0).toUpperCase() + questionnaire.difficulty.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-2 font-inter">{questionnaire.description}</p>
            
            {/* Test Statistics */}
            {questionnaire.isSaved && (
              <div className="flex items-center space-x-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-violet-500" />
                  <span className="font-inter">{testTakersCount} test takers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileCheck className="h-4 w-4 text-green-500" />
                  <span className="font-inter">{questionnaire.questions.length} questions</span>
                </div>
                {questionnaire.timeframe && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-inter">{questionnaire.timeframe} minutes</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-slate-500 font-inter">
              {new Date(questionnaire.createdAt).toLocaleString()}
            </div>
            {isAdmin && (
              <div className="flex space-x-1">
                {!questionnaire.isSaved && (
                  <Button
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    className="bg-violet-600 text-white hover:bg-violet-700 rounded-lg font-poppins"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  className="rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {showResults && testResults && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900 font-poppins">Test Completed!</h3>
                <p className="text-slate-700 font-inter">
                  Your Score: <span className="font-bold text-green-700">{testResults.score}/{testResults.totalQuestions}</span>
                  {testResults.totalQuestions > 0 && (
                    <span className="ml-2 text-sm text-slate-600">
                      ({Math.round((testResults.score / testResults.totalQuestions) * 100)}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={resetTest} className="mt-3 bg-violet-600 text-white hover:bg-violet-700 rounded-lg font-poppins">
              Take Test Again
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {questionnaire.questions.map((question, index) => (
            <div key={question.id} className="border border-slate-200 rounded-xl p-4 bg-gradient-to-r from-slate-50 to-violet-50">
              <div className="flex items-start space-x-4">
                <div className="bg-violet-100 p-2 rounded-full mt-1 border border-violet-200">
                  {getQuestionIcon(question.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-slate-900 text-lg font-poppins">
                      {index + 1}. {question.text}
                    </h4>
                  </div>
                  
                  {question.options && question.options.length > 0 && (
                    <div className="mt-3">
                      {isGuest && !showResults ? (
                        <RadioGroup
                          value={answers[question.id]?.toString()}
                          onValueChange={(value) => handleAnswerSelect(question.id, parseInt(value))}
                          disabled={showResults}
                        >
                          <div className="grid grid-cols-1 gap-3">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-3">
                                <RadioGroupItem 
                                  value={optionIndex.toString()} 
                                  id={`${question.id}-${optionIndex}`}
                                  className="border-violet-400 text-violet-600"
                                />
                                <Label 
                                  htmlFor={`${question.id}-${optionIndex}`}
                                  className="text-slate-800 cursor-pointer flex-1 p-3 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-violet-200 font-inter"
                                >
                                  {String.fromCharCode(65 + optionIndex)}. {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : (
                        <div>
                          {!isGuest && <p className="text-xs text-slate-500 mb-3 font-inter">Options:</p>}
                          <div className="grid grid-cols-1 gap-2">
                            {question.options.map((option, optionIndex) => {
                              let optionStyle = "px-4 py-3 rounded-lg text-sm border font-inter";
                              
                              if (showResults && testResults) {
                                const userAnswer = testResults.answers.find(a => a.questionId === question.id);
                                const isSelected = userAnswer?.selectedOptionIndex === optionIndex;
                                const isCorrect = question.correctAnswer === optionIndex;
                                
                                if (isSelected && isCorrect) {
                                  optionStyle += " bg-green-100 border-green-300 text-green-800";
                                } else if (isSelected && !isCorrect) {
                                  optionStyle += " bg-red-100 border-red-300 text-red-800";
                                } else if (isCorrect) {
                                  optionStyle += " bg-green-50 border-green-200 text-green-700";
                                } else {
                                  optionStyle += " bg-slate-100 border-slate-200 text-slate-700";
                                }
                              } else {
                                optionStyle += " bg-white border-slate-200 text-slate-700";
                              }

                              return (
                                <div key={optionIndex} className={optionStyle}>
                                  {String.fromCharCode(65 + optionIndex)}. {option}
                                  {showResults && question.correctAnswer === optionIndex && (
                                    <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                                  )}
                                  {isAdmin && question.correctAnswer === optionIndex && !showResults && (
                                    <span className="ml-2 text-violet-600 font-medium">(Correct Answer)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
          <p className="text-sm text-slate-700 font-inter">
            <strong>Total Questions:</strong> {questionnaire.questions.length}
            {isGuest && !showResults && (
              <span className="ml-4">
                <strong>Answered:</strong> {Object.keys(answers).length}/{questionnaire.questions.length}
              </span>
            )}
            {questionnaire.timeframe && (
              <span className="ml-4">
                <strong>Time Limit:</strong> {questionnaire.timeframe} minutes
              </span>
            )}
          </p>
        </div>

        {/* Submit Button for Guests */}
        {isGuest && !showResults && (
          <div className="mt-6">
            <Button
              onClick={handleSubmitResponse}
              disabled={!isSubmitReady || isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 py-3 rounded-xl font-poppins"
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
              <p className="text-sm text-amber-600 mt-2 text-center font-inter">
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
