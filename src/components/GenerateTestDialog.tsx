import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, X, Sparkles, Key, Bot, GraduationCap, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ChatGPTService } from '@/services/ChatGPTService';
import ChatGPTKeyDialog from './ChatGPTKeyDialog';

interface GenerateTestDialogProps {
  open: boolean;
  prompt: string;
  uploadedFile: File | null;
  onGenerate: (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number, timeframe: number, includeCourse: boolean, includeQuestionnaire: boolean) => void;
  onCancel: () => void;
}

const GenerateTestDialog = ({ open, prompt, uploadedFile, onGenerate, onCancel }: GenerateTestDialogProps) => {
  const [testName, setTestName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(15);
  const [timeframe, setTimeframe] = useState(20);
  const [includeCourse, setIncludeCourse] = useState(false);
  const [includeQuestionnaire, setIncludeQuestionnaire] = useState(true);
  const [showChatGPTKeyDialog, setShowChatGPTKeyDialog] = useState(false);
  const [hasChatGPTKey, setHasChatGPTKey] = useState(false);

  // Calculate timeframe based on number of questions using specified mapping
  useEffect(() => {
    const getTimeframeForQuestions = (questions: number): number => {
      if (questions <= 10) return 15;
      if (questions <= 15) return 20;
      if (questions <= 20) return 25;
      if (questions <= 25) return 30;
      if (questions <= 30) return 35;
      if (questions <= 40) return 45;
      return 50; // 50 questions
    };

    const calculatedTimeframe = getTimeframeForQuestions(numberOfQuestions);
    setTimeframe(calculatedTimeframe);
  }, [numberOfQuestions]);

  // Check if ChatGPT API key exists
  useEffect(() => {
    const apiKey = ChatGPTService.getApiKey();
    setHasChatGPTKey(!!apiKey);
  }, []);

  const handleChatGPTKeySet = (apiKey: string) => {
    ChatGPTService.setApiKey(apiKey);
    setHasChatGPTKey(true);
    setShowChatGPTKeyDialog(false);
  };

  const handleGenerate = () => {
    if (!testName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test name",
        variant: "destructive"
      });
      return;
    }

    if (!includeCourse && !includeQuestionnaire) {
      toast({
        title: "Error",
        description: "Please select at least one option: Course or Questionnaires",
        variant: "destructive"
      });
      return;
    }

    if (includeQuestionnaire && (numberOfQuestions < 10 || numberOfQuestions > 50)) {
      toast({
        title: "Error",
        description: "Number of questions must be between 10 and 50",
        variant: "destructive"
      });
      return;
    }

    if (timeframe < 5 || timeframe > 180) {
      toast({
        title: "Error",
        description: "Timeframe must be between 5 and 180 minutes",
        variant: "destructive"
      });
      return;
    }

    onGenerate(testName.trim(), difficulty, numberOfQuestions, timeframe, includeCourse, includeQuestionnaire);
  };

  const getRecommendedTimeframe = (questions: number): number => {
    if (questions <= 10) return 15;
    if (questions <= 15) return 20;
    if (questions <= 20) return 25;
    if (questions <= 25) return 30;
    if (questions <= 30) return 35;
    if (questions <= 40) return 45;
    return 50; // 50 questions
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center space-x-2 font-poppins text-lg">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span>Generate Content</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* ChatGPT Integration Status */}
            <div className={`p-4 rounded-xl border ${hasChatGPTKey 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className={`h-5 w-5 ${hasChatGPTKey ? 'text-green-600' : 'text-orange-600'}`} />
                  <div>
                    <p className={`font-medium text-sm ${hasChatGPTKey ? 'text-green-700' : 'text-orange-700'}`}>
                      {hasChatGPTKey ? 'ChatGPT Integration Active' : 'ChatGPT Integration Available'}
                    </p>
                    <p className={`text-xs ${hasChatGPTKey ? 'text-green-600' : 'text-orange-600'}`}>
                      {hasChatGPTKey 
                        ? 'Questions will be generated using ChatGPT for better relevance' 
                        : 'Setup ChatGPT for more relevant questions'
                      }
                    </p>
                  </div>
                </div>
                {!hasChatGPTKey && (
                  <Button
                    onClick={() => setShowChatGPTKeyDialog(true)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Setup
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-violet-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium mb-2">Your Prompt:</p>
                  <p className="text-sm text-violet-800 bg-white p-3 rounded-lg border border-violet-200 font-inter">
                    {prompt}
                  </p>
                  {uploadedFile && (
                    <p className="text-sm text-slate-700 mt-2">
                      <strong className="text-violet-800">File:</strong> 
                      <span className="ml-1 px-2 py-1 bg-violet-100 text-violet-800 rounded text-xs font-medium">
                        {uploadedFile.name}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content Type Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 font-medium font-poppins mb-3 block">Content Type</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Checkbox
                      id="include-course"
                      checked={includeCourse}
                      onCheckedChange={(checked) => setIncludeCourse(checked as boolean)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="include-course" className="text-slate-700 font-medium cursor-pointer">
                        Course
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 ml-9">Generate a course that guests must complete before taking the test</p>

                  <div className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Checkbox
                      id="include-questionnaire"
                      checked={includeQuestionnaire}
                      onCheckedChange={(checked) => setIncludeQuestionnaire(checked as boolean)}
                      className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-violet-600" />
                      <Label htmlFor="include-questionnaire" className="text-slate-700 font-medium cursor-pointer">
                        Questionnaires
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 ml-9">Generate multiple-choice questions for testing</p>
                </div>
              </div>

              <div>
                <Label htmlFor="testName" className="text-slate-700 font-medium font-poppins">Content Name</Label>
                <Input
                  id="testName"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Enter a name for this content"
                  className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
                />
              </div>

              <div>
                <Label htmlFor="difficulty" className="text-slate-700 font-medium font-poppins">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
                  <SelectTrigger className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {includeQuestionnaire && (
                <>
                  <div>
                    <Label htmlFor="numberOfQuestions" className="text-slate-700 font-medium font-poppins">Number of Questions</Label>
                    <Input
                      id="numberOfQuestions"
                      type="number"
                      min={10}
                      max={50}
                      value={numberOfQuestions}
                      onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                      className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
                    />
                    <p className="text-xs text-slate-500 mt-1">Between 10 and 50 questions</p>
                  </div>

                  <div>
                    <Label htmlFor="timeframe" className="text-slate-700 font-medium font-poppins">Timeframe (minutes)</Label>
                    <Input
                      id="timeframe"
                      type="number"
                      min={5}
                      max={180}
                      value={timeframe}
                      onChange={(e) => setTimeframe(Number(e.target.value))}
                      className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
                    />
                    <p className="text-xs text-slate-500 mt-1">Recommended: {getRecommendedTimeframe(numberOfQuestions)} minutes for {numberOfQuestions} questions</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-3 pt-4 border-t border-slate-200">
              <Button onClick={handleGenerate} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 flex-1 rounded-lg font-poppins font-medium">
                <Zap className="h-4 w-4 mr-2" />
                Generate Content
              </Button>
              <Button onClick={onCancel} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChatGPTKeyDialog
        open={showChatGPTKeyDialog}
        onKeySet={handleChatGPTKeySet}
        onCancel={() => setShowChatGPTKeyDialog(false)}
      />
    </>
  );
};

export default GenerateTestDialog;
