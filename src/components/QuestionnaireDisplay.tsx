import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, FileText, Star, MessageSquare, Edit3, Trash2, Send, Save, Trophy, Users, Clock, FileCheck, ChevronDown, ChevronUp, Eye, EyeOff, Play, Timer } from 'lucide-react';
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
  // Always call all hooks at the top level, regardless of conditions
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<{ score: number; totalQuestions: number; answers: any[] } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasStartedTest, setHasStartedTest] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  // Get current user and calculate derived state
  const currentUser = AuthService.getCurrentUser();
  const isGuest = currentUser?.role === 'guest';

  // Safely handle questionnaire data with proper fallback
  const safeQuestionnaire: Questionnaire = questionnaire || {
    id: '',
    title: '',
    description: '',
    questions: [],
    createdAt: new Date().toISOString(),
    isActive: false,
    testName: '',
    difficulty: 'easy',
    isSaved: false,
    timeframe: undefined
  };
  
  // Check if guest has already submitted this test - only if we have valid data
  const guestHasSubmitted = isGuest && safeQuestionnaire.id && ResponseService.getResponsesByQuestionnaire(safeQuestionnaire.id)
    .some(response => response.userId === currentUser?.token);

  // Get test taker count - only if we have valid questionnaire id
  const responses = safeQuestionnaire.id ? ResponseService.getResponsesByQuestionnaire(safeQuestionnaire.id) : [];
  const testTakersCount = new Set(responses.map(r => r.username || r.userId)).size;

  // Timer effect - always called but only active when conditions are met
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            // Auto-submit when time runs out
            handleSubmitResponse();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerActive, timeRemaining]);

  // Early return after all hooks are called
  if (isGuest && guestHasSubmitted) {
    return null;
  }

  // Validate questionnaire data
  if (!safeQuestionnaire.id || !Array.isArray(safeQuestionnaire.questions)) {
    console.warn('Invalid questionnaire data:', questionnaire);
    return (
      <Card className="animate-fade-in bg-red-50 border border-red-200 shadow-lg rounded-xl">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 font-inter">Invalid questionnaire data</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartTest = () => {
    setHasStartedTest(true);
    setIsExpanded(true);
    
    // Initialize timer if timeframe is set
    if (safeQuestionnaire.timeframe) {
      const totalSeconds = safeQuestionnaire.timeframe * 60;
      setTimeRemaining(totalSeconds);
      setTimerActive(true);
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'radio':
      case 'multiple-choice':
        return <CheckCircle className="h-4 w-4 text-slate-600" />;
      case 'text':
        return <MessageSquare className="h-4 w-4 text-slate-600" />;
      case 'rating':
        return <Star className="h-4 w-4 text-slate-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-600" />;
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
    if (!safeQuestionnaire.isSaved) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-poppins">Unsaved</Badge>;
    }
    if (!safeQuestionnaire.isActive) {
      return <Badge className="bg-slate-200 text-slate-700 border-slate-300 font-poppins">Inactive</Badge>;
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
      onDelete(safeQuestionnaire.id);
      toast({
        title: "Success",
        description: "Questionnaire deleted successfully",
      });
    }
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (!isGuest || !hasStartedTest) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitResponse = async () => {
    if (!isGuest || !currentUser || !hasStartedTest) return;

    // Stop timer
    setTimerActive(false);

    // Check if all questions are answered
    const unansweredQuestions = safeQuestionnaire.questions.filter(q => !(q.id in answers));
    if (unansweredQuestions.length > 0) {
      toast({
        title: "Incomplete Response",
        description: `Please answer all ${safeQuestionnaire.questions.length} questions before submitting.`,
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

      const results = ResponseService.calculateScore(userAnswers, safeQuestionnaire);
      setTestResults(results);

      const response = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        questionnaireId: safeQuestionnaire.id,
        questionnaireTitle: safeQuestionnaire.testName || safeQuestionnaire.title,
        userId: currentUser.token,
        username: currentUser.username,
        answers: results.answers,
        submittedAt: new Date().toISOString(),
        score: results.score,
        totalQuestions: results.totalQuestions
      };

      ResponseService.saveResponse(response);

      // For guests, just show that it was submitted without revealing results
      setIsSubmitted(true);
      toast({
        title: "Response Submitted",
        description: "Your response has been submitted successfully!",
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

  const isSubmitReady = safeQuestionnaire.questions.every(q => q.id in answers);

  const handleToggleActive = (checked: boolean) => {
    console.log('Toggle active status:', checked);
    
    const updatedQuestionnaire = {
      ...safeQuestionnaire,
      isActive: checked
    };
    
    if (onUpdate) {
      onUpdate(updatedQuestionnaire);
    }
    
    toast({
      title: checked ? "Test Activated" : "Test Deactivated",
      description: checked 
        ? "Test is now visible to participants" 
        : "Test is no longer visible to participants",
    });
  };

  if (isEditing) {
    return (
      <QuestionnaireEditor
        questionnaire={safeQuestionnaire}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  if (showSaveDialog) {
    return (
      <SaveTestDialog
        questionnaire={safeQuestionnaire}
        onSave={handleTestSave}
        onCancel={() => setShowSaveDialog(false)}
      />
    );
  }

  return (
    <Card className="animate-fade-in bg-slate-50 border border-slate-300 shadow-lg rounded-xl">
      <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300 rounded-t-xl">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 flex-wrap">
              <CardTitle className="text-xl text-slate-800 font-poppins">
                {safeQuestionnaire.testName || safeQuestionnaire.title}
              </CardTitle>
              {getStatusBadge()}
              {isAdmin && safeQuestionnaire.difficulty && (
                <Badge className={getDifficultyColor(safeQuestionnaire.difficulty) + " font-poppins"}>
                  {safeQuestionnaire.difficulty.charAt(0).toUpperCase() + safeQuestionnaire.difficulty.slice(1)}
                </Badge>
              )}
            </div>
            
            {/* Timer Display for Guests */}
            {isGuest && hasStartedTest && timeRemaining !== null && (
              <div className="flex items-center space-x-2 mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Timer className="h-4 w-4 text-blue-600" />
                <span className={`font-mono font-bold ${timeRemaining <= 300 ? 'text-red-600' : 'text-blue-600'}`}>
                  Time Remaining: {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            
            {/* Test Info for Guests - show before starting test */}
            {isGuest && !hasStartedTest && !isSubmitted && (
              <div className="flex items-center space-x-6 mt-3 text-sm text-slate-700">
                <div className="flex items-center space-x-1">
                  <FileCheck className="h-4 w-4 text-slate-600" />
                  <span className="font-inter font-medium">{safeQuestionnaire.questions.length}</span>
                  <span className="font-inter text-slate-600">questions</span>
                </div>
                {safeQuestionnaire.timeframe && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <span className="font-inter font-medium">{safeQuestionnaire.timeframe}</span>
                    <span className="font-inter text-slate-600">minutes</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Compact Test Statistics for Admin */}
            {safeQuestionnaire.isSaved && !isGuest && (
              <div className="flex items-center space-x-6 mt-3 text-sm text-slate-700">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-slate-600" />
                  <span className="font-inter font-medium">{testTakersCount}</span>
                  <span className="font-inter text-slate-600">participants</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileCheck className="h-4 w-4 text-slate-600" />
                  <span className="font-inter font-medium">{safeQuestionnaire.questions.length}</span>
                  <span className="font-inter text-slate-600">questions</span>
                </div>
                {safeQuestionnaire.timeframe && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <span className="font-inter font-medium">{safeQuestionnaire.timeframe}</span>
                    <span className="font-inter text-slate-600">minutes</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <div className="flex items-center space-x-2">
                {/* Enhanced Active/Inactive Toggle - only show for saved tests */}
                {safeQuestionnaire.isSaved && (
                  <div className="flex items-center space-x-3 px-4 py-2 bg-white border border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-2">
                      {safeQuestionnaire.isActive ? (
                        <Eye className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      )}
                      <span className={`text-sm font-medium font-inter transition-colors duration-200 ${
                        safeQuestionnaire.isActive 
                          ? 'text-emerald-700' 
                          : 'text-slate-600'
                      }`}>
                        {safeQuestionnaire.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="relative">
                      <Switch
                        checked={safeQuestionnaire.isActive || false}
                        onCheckedChange={handleToggleActive}
                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-300 transition-colors duration-200"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-1">
                  {!safeQuestionnaire.isSaved && (
                    <Button
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="bg-slate-600 text-white hover:bg-slate-700 rounded-lg font-poppins"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-slate-400 text-slate-700 hover:bg-slate-100 rounded-lg font-poppins"
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
              </div>
            )}
            
            {/* Expand/Collapse Button - only for admins */}
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-600 hover:text-slate-800"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            
            {/* Start Test Button for Guests */}
            {isGuest && !hasStartedTest && !isSubmitted && (
              <Button
                onClick={handleStartTest}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 rounded-lg font-poppins px-6"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Test
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {/* Expandable Content */}
      {(isExpanded || (isGuest && hasStartedTest)) && (
        <CardContent className="p-6">
          <p className="text-sm text-slate-700 mb-4 font-inter">{safeQuestionnaire.description}</p>
          
          {/* Admin Results Display - only for admins */}
          {isAdmin && showResults && testResults && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-amber-600" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 font-poppins">Test Completed!</h3>
                  <p className="text-slate-800 font-inter">
                    Your Score: <span className="font-bold text-emerald-700">{testResults.score}/{testResults.totalQuestions}</span>
                    {testResults.totalQuestions > 0 && (
                      <span className="ml-2 text-sm text-slate-700">
                        ({Math.round((testResults.score / testResults.totalQuestions) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button onClick={resetTest} className="mt-3 bg-slate-600 text-white hover:bg-slate-700 rounded-lg font-poppins">
                Take Test Again
              </Button>
            </div>
          )}

          {/* Guest Submission Confirmation - simple message for guests */}
          {isGuest && isSubmitted && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 font-poppins">Response Submitted!</h3>
                  <p className="text-slate-800 font-inter">
                    Thank you for completing the test. Your responses have been recorded.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {safeQuestionnaire.questions.map((question, index) => (
              <div key={question.id} className="border border-slate-300 rounded-xl p-4 bg-gradient-to-r from-slate-100 to-slate-200">
                <div className="flex items-start space-x-4">
                  <div className="bg-slate-200 p-2 rounded-full mt-1 border border-slate-300">
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
                        {isGuest && hasStartedTest && !isSubmitted ? (
                          <RadioGroup
                            value={answers[question.id]?.toString()}
                            onValueChange={(value) => handleAnswerSelect(question.id, parseInt(value))}
                            disabled={isSubmitted}
                          >
                            <div className="grid grid-cols-1 gap-3">
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-3">
                                  <RadioGroupItem 
                                    value={optionIndex.toString()} 
                                    id={`${question.id}-${optionIndex}`}
                                    className="border-slate-500 text-slate-700"
                                  />
                                  <Label 
                                    htmlFor={`${question.id}-${optionIndex}`}
                                    className="text-slate-800 cursor-pointer flex-1 p-3 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-slate-400 font-inter"
                                  >
                                    {String.fromCharCode(65 + optionIndex)}. {option}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        ) : (
                          <div>
                            {!isGuest && <p className="text-xs text-slate-600 mb-3 font-inter">Options:</p>}
                            <div className="grid grid-cols-1 gap-2">
                              {question.options.map((option, optionIndex) => {
                                let optionStyle = "px-4 py-3 rounded-lg text-sm border font-inter";
                                
                                // Only show colored results for admins, not guests
                                if (isAdmin && showResults && testResults) {
                                  const userAnswer = testResults.answers.find(a => a.questionId === question.id);
                                  const isSelected = userAnswer?.selectedOptionIndex === optionIndex;
                                  const isCorrect = question.correctAnswer === optionIndex;
                                  
                                  if (isSelected && isCorrect) {
                                    optionStyle += " bg-emerald-100 border-emerald-300 text-emerald-800";
                                  } else if (isSelected && !isCorrect) {
                                    optionStyle += " bg-red-100 border-red-300 text-red-800";
                                  } else if (isCorrect) {
                                    optionStyle += " bg-emerald-50 border-emerald-200 text-emerald-700";
                                  } else {
                                    optionStyle += " bg-slate-200 border-slate-300 text-slate-700";
                                  }
                                } else {
                                  // For guests or when not showing results, just use neutral styling
                                  if (isGuest && isSubmitted && answers[question.id] === optionIndex) {
                                    optionStyle += " bg-blue-50 border-blue-200 text-blue-800"; // Just highlight selected option for guests
                                  } else {
                                    optionStyle += " bg-white border-slate-300 text-slate-800";
                                  }
                                }

                                return (
                                  <div key={optionIndex} className={optionStyle}>
                                    {String.fromCharCode(65 + optionIndex)}. {option}
                                    {isAdmin && showResults && question.correctAnswer === optionIndex && (
                                      <span className="ml-2 text-emerald-600 font-medium">(Correct)</span>
                                    )}
                                    {isAdmin && question.correctAnswer === optionIndex && !showResults && (
                                      <span className="ml-2 text-slate-700 font-medium">(Correct Answer)</span>
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
          
          <div className="mt-6 p-4 bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300 rounded-xl">
            <p className="text-sm text-slate-800 font-inter">
              <strong>Total Questions:</strong> {safeQuestionnaire.questions.length}
              {isGuest && hasStartedTest && !isSubmitted && (
                <span className="ml-4">
                  <strong>Answered:</strong> {Object.keys(answers).length}/{safeQuestionnaire.questions.length}
                </span>
              )}
              {safeQuestionnaire.timeframe && !isGuest && (
                <span className="ml-4">
                  <strong>Time Limit:</strong> {safeQuestionnaire.timeframe} minutes
                </span>
              )}
            </p>
          </div>

          {/* Submit Button for Guests - only show if test has started and not yet submitted */}
          {isGuest && hasStartedTest && !isSubmitted && (
            <div className="mt-6">
              <Button
                onClick={handleSubmitResponse}
                disabled={!isSubmitReady || isSubmitting}
                className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 py-3 rounded-xl font-poppins"
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
      )}
    </Card>
  );
};

export default QuestionnaireDisplay;
