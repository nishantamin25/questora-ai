
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, X, CheckCircle, Clock, Users, FileText } from 'lucide-react';
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

  console.log('SaveTestDialog render:', { showSummary, savedTest, testName, isActive });

  const handleSave = () => {
    console.log('handleSave called with testName:', testName);
    
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
      isSaved: true,
      timeframe: questionnaire.timeframe || 15 // Default timeframe if not set
    };

    console.log('Setting savedTest:', savedQuestionnaire);
    setSavedTest(savedQuestionnaire);
    setShowSummary(true);
    onSave(savedQuestionnaire);
    
    toast({
      title: "Success",
      description: "Test saved successfully!",
    });
  };

  const handleActiveToggle = (checked: boolean) => {
    console.log('handleActiveToggle called with:', checked);
    if (savedTest) {
      const updatedTest = { ...savedTest, isActive: checked };
      setSavedTest(updatedTest);
      setIsActive(checked);
      onSave(updatedTest);
      
      toast({
        title: checked ? "Test Activated" : "Test Deactivated",
        description: checked ? "Test is now visible to guests" : "Test is no longer visible to guests",
      });
    }
  };

  console.log('About to render, showSummary:', showSummary, 'savedTest exists:', !!savedTest);

  if (showSummary && savedTest) {
    console.log('Rendering summary view for test:', savedTest.testName);
    return (
      <Card className="bg-white border border-slate-200 shadow-lg rounded-xl max-w-md mx-auto">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 rounded-t-xl">
          <CardTitle className="text-slate-900 flex items-center space-x-2 font-poppins">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Test Saved Successfully</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900 font-poppins">{savedTest.testName}</h3>
              {savedTest.isActive && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  active
                </Badge>
              )}
            </div>
            
            <p className="text-slate-600 mb-6 font-inter">{savedTest.description}</p>
            
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>{savedTest.questions.length} questions</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{savedTest.timeframe || 15} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>0 participants</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg">
            <div>
              <Label htmlFor="active-toggle" className="font-medium font-poppins">Make Test Active</Label>
              <p className="text-sm text-slate-600 font-inter">Allow guests to take this test</p>
            </div>
            <Switch
              id="active-toggle"
              checked={savedTest.isActive}
              onCheckedChange={handleActiveToggle}
            />
          </div>

          <Button 
            onClick={onCancel} 
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-poppins"
          >
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  console.log('Rendering initial save form');
  return (
    <Card className="bg-white border border-slate-200 shadow-lg rounded-xl max-w-md mx-auto">
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
