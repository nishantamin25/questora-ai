
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, CheckCircle, Power } from 'lucide-react';
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
  timeframe?: number;
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
  const [showSummary, setShowSummary] = useState(false);
  const [savedTest, setSavedTest] = useState<Questionnaire | null>(null);

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
      isActive: false, // Initially inactive when saved
      isSaved: true
    };

    setSavedTest(savedQuestionnaire);
    setShowSummary(true);
    onSave(savedQuestionnaire);
    
    toast({
      title: "Success",
      description: "Test saved successfully!",
    });
  };

  const handleMakeActive = () => {
    if (savedTest) {
      const updatedTest = { ...savedTest, isActive: !savedTest.isActive };
      setSavedTest(updatedTest);
      onSave(updatedTest);
      
      toast({
        title: savedTest.isActive ? "Test Deactivated" : "Test Activated",
        description: savedTest.isActive ? "Test is no longer visible to guests" : "Test is now visible to guests",
      });
    }
  };

  if (showSummary && savedTest) {
    return (
      <Card className="bg-white border border-slate-200 shadow-lg rounded-xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 rounded-t-xl">
          <CardTitle className="text-slate-900 flex items-center space-x-2 font-poppins">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Test Saved Successfully</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 font-poppins">{savedTest.testName}</h3>
              {savedTest.isActive && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  active
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-4 font-inter">Test your general knowledge across various topics</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-600 font-poppins">0</p>
                <p className="text-sm text-slate-600 font-inter">participants</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-600 font-poppins">{savedTest.questions.length}</p>
                <p className="text-sm text-slate-600 font-inter">questions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-600 font-poppins">{savedTest.timeframe}</p>
                <p className="text-sm text-slate-600 font-inter">minutes</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button 
              onClick={handleMakeActive} 
              className={`flex-1 rounded-lg font-poppins ${
                savedTest.isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <Power className="h-4 w-4 mr-2" />
              {savedTest.isActive ? 'Deactivate Test' : 'Make Active'}
            </Button>
            <Button onClick={onCancel} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-poppins px-8">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
