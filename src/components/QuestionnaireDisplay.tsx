
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, Edit, Trash2, Play, Square, Clock, Users, Hash, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ResponseService } from '@/services/ResponseService';
import SaveTestDialog from './SaveTestDialog';
import CourseDisplay from './CourseDisplay';

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

interface QuestionnaireDisplayProps {
  questionnaire: Questionnaire;
  isAdmin: boolean;
  onUpdate: (questionnaire: Questionnaire) => void;
  onDelete: (questionnaireId: string) => void;
}

const QuestionnaireDisplay = ({ questionnaire, isAdmin, onUpdate, onDelete }: QuestionnaireDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestionnaire, setEditedQuestionnaire] = useState<Questionnaire>(questionnaire);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionsVisible, setQuestionsVisible] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<Question[]>(questionnaire.questions || []);

  useEffect(() => {
    if (questionnaire) {
      setEditedQuestionnaire(questionnaire);
      setEditedQuestions(questionnaire.questions || []);
    }
  }, [questionnaire]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Save changes when exiting edit mode
      const updatedQuestionnaire = { ...editedQuestionnaire, questions: editedQuestions };
      setEditedQuestionnaire(updatedQuestionnaire);
      onUpdate(updatedQuestionnaire);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingQuestionId(null);
    setEditedQuestionnaire(questionnaire);
    setEditedQuestions(questionnaire.questions || []);
  };

  const handleActiveToggle = (checked: boolean) => {
    const updatedQuestionnaire = { ...editedQuestionnaire, isActive: checked };
    setEditedQuestionnaire(updatedQuestionnaire);
    onUpdate(updatedQuestionnaire);
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleQuestionEdit = (questionId: string, field: 'text' | 'options', value: string | string[]) => {
    setEditedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, [field]: value }
        : q
    ));
  };

  const handleQuestionOptionEdit = (questionId: string, optionIndex: number, value: string) => {
    setEditedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options?.map((opt, idx) => idx === optionIndex ? value : opt) || [] }
        : q
    ));
  };

  const allQuestionsAnswered = editedQuestions.every(question => responses[question.id]);

  const handleSubmitResponses = async () => {
    setIsSubmitting(true);
    try {
      const responseData = {
        questionnaireId: questionnaire.id,
        responses: responses,
        submittedAt: new Date().toISOString()
      };
      await ResponseService.submitResponse(responseData);
      toast({
        title: "Success",
        description: "Responses submitted successfully!",
      });
      setResponses({});
    } catch (error) {
      console.error('Error submitting responses:', error);
      toast({
        title: "Error",
        description: "Failed to submit responses",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Convert courseContent to the format expected by CourseDisplay
  const convertCourseContent = (courseContent: any) => {
    if (!courseContent) return null;
    
    return {
      id: courseContent.id || 'course-' + questionnaire.id,
      name: courseContent.title || questionnaire.title,
      description: courseContent.description || questionnaire.description,
      materials: courseContent.modules?.map((module: any) => ({
        type: module.type || 'text',
        content: module.content || '',
        title: module.title || 'Module'
      })) || [
        {
          type: 'text',
          content: courseContent.content || 'Course content',
          title: 'Course Material'
        }
      ],
      estimatedTime: questionnaire.timeframe || 30
    };
  };

  const handleCourseComplete = (courseId: string) => {
    toast({
      title: "Course Completed!",
      description: "You can now access the questionnaire.",
    });
  };

  return (
    <>
      <Card className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl overflow-hidden mb-4">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-violet-50 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedQuestionnaire.title}
                  onChange={(e) => setEditedQuestionnaire(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-bold mb-2 border-slate-300 focus:border-violet-500"
                />
              ) : (
                <CardTitle className="text-slate-900 font-poppins text-lg mb-2">
                  {questionnaire.title}
                </CardTitle>
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
                
                {editedQuestions && editedQuestions.length > 0 && (
                  <Badge variant="outline" className="text-slate-600 border-slate-300">
                    <Users className="h-3 w-3 mr-1" />
                    {editedQuestions.length} questions
                  </Badge>
                )}
              </div>
              
              {isEditing ? (
                <Textarea
                  value={editedQuestionnaire.description}
                  onChange={(e) => setEditedQuestionnaire(prev => ({ ...prev, description: e.target.value }))}
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
                      onCheckedChange={handleActiveToggle}
                    />
                  </div>
                )}
                
                {questionnaire.isSaved ? (
                  <>
                    <Button 
                      onClick={handleEditToggle} 
                      size="sm" 
                      variant={isEditing ? "default" : "outline"}
                      className={isEditing ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                    {isEditing && (
                      <Button onClick={handleCancelEdit} size="sm" variant="outline">
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
                  <Button onClick={() => setShowSaveDialog(true)} size="sm" variant="default">
                    <Save className="h-4 w-4 mr-2" />
                    Save Test
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Course Content Display */}
        {questionnaire.courseContent && (
          <div className="border-b border-slate-200">
            <CourseDisplay 
              course={convertCourseContent(questionnaire.courseContent)}
              onCourseComplete={handleCourseComplete}
            />
          </div>
        )}

        {/* Questions Display - Collapsible */}
        {editedQuestions && editedQuestions.length > 0 && (
          <CardContent className="p-0">
            <Collapsible open={questionsVisible} onOpenChange={setQuestionsVisible}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-6 hover:bg-slate-50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-900">
                      Questions ({editedQuestions.length})
                    </span>
                  </div>
                  {questionsVisible ? (
                    <div className="flex items-center space-x-2">
                      <EyeOff className="h-4 w-4 text-slate-500" />
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-slate-500" />
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-6 pb-6 space-y-6">
                  {editedQuestions.map((question, index) => (
                    <div key={question.id} className="border-b border-slate-100 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-3">
                        {isEditing && editingQuestionId === question.id ? (
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={question.text}
                              onChange={(e) => handleQuestionEdit(question.id, 'text', e.target.value)}
                              className="text-slate-900 font-medium border-slate-300 focus:border-violet-500"
                            />
                          </div>
                        ) : (
                          <h3 className="text-slate-900 font-medium font-poppins flex-1">
                            {index + 1}. {question.text}
                          </h3>
                        )}
                        
                        {isEditing && (
                          <Button
                            onClick={() => setEditingQuestionId(editingQuestionId === question.id ? null : question.id)}
                            size="sm"
                            variant="outline"
                            className="ml-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {question.options && (
                        <>
                          {isEditing && editingQuestionId === question.id ? (
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <span className="text-sm text-slate-500 w-6">{optionIndex + 1}.</span>
                                  <Input
                                    value={option}
                                    onChange={(e) => handleQuestionOptionEdit(question.id, optionIndex, e.target.value)}
                                    className="flex-1 border-slate-300 focus:border-violet-500"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <RadioGroup
                              value={responses[question.id] || ''}
                              onValueChange={(value) => handleResponseChange(question.id, value)}
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
                        </>
                      )}
                    </div>
                  ))}
                  
                  {!isAdmin && questionnaire.isActive && (
                    <div className="pt-4 border-t border-slate-200">
                      <Button 
                        onClick={handleSubmitResponses}
                        disabled={!allQuestionsAnswered || isSubmitting}
                        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 rounded-lg font-poppins font-medium py-3"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Submitting...</span>
                          </div>
                        ) : (
                          'Submit Responses'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        )}
      </Card>

      <SaveTestDialog
        questionnaire={questionnaire}
        onSave={onUpdate}
        onCancel={() => setShowSaveDialog(false)}
      />
    </>
  );
};

export default QuestionnaireDisplay;
