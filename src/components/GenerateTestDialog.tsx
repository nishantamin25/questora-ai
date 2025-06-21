
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, X } from 'lucide-react';
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
      <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>Generate Test Configuration</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong className="text-blue-800">Prompt:</strong> {prompt}
            </p>
            {uploadedFile && (
              <p className="text-sm text-gray-700 mt-2">
                <strong className="text-blue-800">File:</strong> {uploadedFile.name}
              </p>
            )}
          </div>

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
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="numberOfQuestions" className="text-gray-700 font-medium">Number of Questions (10-50)</Label>
            <Input
              id="numberOfQuestions"
              type="number"
              min={10}
              max={50}
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
              className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={handleGenerate} className="bg-blue-600 text-white hover:bg-blue-700 flex-1">
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
