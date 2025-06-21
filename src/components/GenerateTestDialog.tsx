
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, X, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GenerateTestDialogProps {
  open: boolean;
  prompt: string;
  uploadedFile: File | null;
  onGenerate: (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number, timeframe: number) => void;
  onCancel: () => void;
}

const GenerateTestDialog = ({ open, prompt, uploadedFile, onGenerate, onCancel }: GenerateTestDialogProps) => {
  const [testName, setTestName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(15);
  const [timeframe, setTimeframe] = useState(20); // Default for 15 questions

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

  const handleGenerate = () => {
    if (!testName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test name",
        variant: "destructive"
      });
      return;
    }

    if (numberOfQuestions < 10 || numberOfQuestions > 50) {
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

    onGenerate(testName.trim(), difficulty, numberOfQuestions, timeframe);
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
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center space-x-2 font-poppins text-lg">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span>Formulate Questions</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
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

          <div className="space-y-4">
            <div>
              <Label htmlFor="testName" className="text-slate-700 font-medium font-poppins">Test Name</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Enter a name for this test"
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
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-200">
            <Button onClick={handleGenerate} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 flex-1 rounded-lg font-poppins font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Formulate Questions
            </Button>
            <Button onClick={onCancel} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateTestDialog;
