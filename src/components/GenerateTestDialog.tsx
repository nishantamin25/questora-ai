
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GenerateTestDialogProps {
  prompt: string;
  uploadedFile: File | null;
  onGenerate: (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number) => void;
  onCancel: () => void;
}

const GenerateTestDialog = ({ prompt, uploadedFile, onGenerate, onCancel }: GenerateTestDialogProps) => {
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
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span>Generate Test Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Prompt:</strong> {prompt}
          </p>
          {uploadedFile && (
            <p className="text-sm text-blue-300 mt-1">
              <strong>File:</strong> {uploadedFile.name}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="testName" className="text-gray-300">Test Name</Label>
          <Input
            id="testName"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Enter a name for this test"
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div>
          <Label htmlFor="difficulty" className="text-gray-300">Difficulty Level</Label>
          <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
          <Label htmlFor="numberOfQuestions" className="text-gray-300">Number of Questions (10-50)</Label>
          <Input
            id="numberOfQuestions"
            type="number"
            min={10}
            max={50}
            value={numberOfQuestions}
            onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div className="flex space-x-2 pt-4">
          <Button onClick={handleGenerate} className="bg-white text-black hover:bg-gray-200 flex-1">
            <Bot className="h-4 w-4 mr-2" />
            Generate Test
          </Button>
          <Button onClick={onCancel} variant="outline" className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenerateTestDialog;
