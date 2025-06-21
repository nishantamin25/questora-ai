
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
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
  testName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isSaved?: boolean;
}

interface SaveTestDialogProps {
  questionnaire: Questionnaire;
  onSave: (savedQuestionnaire: Questionnaire) => void;
  onCancel: () => void;
}

const SaveTestDialog = ({ questionnaire, onSave, onCancel }: SaveTestDialogProps) => {
  const [testName, setTestName] = useState(questionnaire.testName || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(questionnaire.difficulty || 'medium');
  const [isActive, setIsActive] = useState(questionnaire.isActive || false);

  const handleSave = () => {
    if (!testName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test name",
        variant: "destructive"
      });
      return;
    }

    const savedQuestionnaire: Questionnaire = {
      ...questionnaire,
      testName: testName.trim(),
      difficulty,
      isActive,
      isSaved: true
    };

    onSave(savedQuestionnaire);
    toast({
      title: "Success",
      description: "Test saved successfully!",
    });
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-lg rounded-xl">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
        <CardTitle className="text-slate-900 flex items-center space-x-2 font-poppins">
          <Save className="h-5 w-5 text-violet-600" />
          <span>Save Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div>
          <Label htmlFor="testName" className="text-slate-700 font-medium font-poppins">Test Name</Label>
          <Input
            id="testName"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Enter a name for this test"
            className="mt-1 bg-white border-slate-300 text-slate-900 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
          />
        </div>

        <div>
          <Label htmlFor="difficulty" className="text-slate-700 font-medium font-poppins">Difficulty Level</Label>
          <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
            <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 focus:border-violet-500 focus:ring-violet-500 rounded-lg">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">🟢 Easy</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="hard">🔴 Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-violet-500 focus:ring-2"
          />
          <Label htmlFor="isActive" className="text-slate-700 font-inter">
            Make test active (visible to guests)
          </Label>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button onClick={handleSave} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white flex-1 rounded-lg font-poppins">
            <Save className="h-4 w-4 mr-2" />
            Save Test
          </Button>
          <Button onClick={onCancel} variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg font-poppins">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaveTestDialog;
