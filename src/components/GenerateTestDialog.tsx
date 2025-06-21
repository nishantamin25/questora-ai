
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, X, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GenerateTestDialogProps {
  open: boolean;
  prompt: string;
  uploadedFile: File | null;
  onGenerate: (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number) => void;
  onCancel: () => void;
}

const GenerateTestDialog = ({ open, prompt, uploadedFile, onGenerate, onCancel }: GenerateTestDialogProps) => {
  const [testName, setTestName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(15);

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

    onGenerate(testName.trim(), difficulty, numberOfQuestions);
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>Generate Test Configuration</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium mb-2">Your Prompt:</p>
                <p className="text-sm text-blue-800 bg-white p-2 rounded border border-blue-200">
                  {prompt}
                </p>
                {uploadedFile && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong className="text-blue-800">File:</strong> 
                    <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {uploadedFile.name}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="testName" className="text-gray-700 font-medium">Test Name</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Enter a name for this test"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="difficulty" className="text-gray-700 font-medium">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
                <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
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
              <Label htmlFor="numberOfQuestions" className="text-gray-700 font-medium">Number of Questions</Label>
              <Input
                id="numberOfQuestions"
                type="number"
                min={10}
                max={50}
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Between 10 and 50 questions</p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button onClick={handleGenerate} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 flex-1">
              <Bot className="h-4 w-4 mr-2" />
              Generate Test
            </Button>
            <Button onClick={onCancel} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
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
