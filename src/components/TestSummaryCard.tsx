
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Questionnaire } from '@/types/SaveTestDialog';

interface TestSummaryCardProps {
  savedTest: Questionnaire;
  onActiveToggle: (checked: boolean) => void;
  onDone: () => void;
}

const TestSummaryCard = ({ savedTest, onActiveToggle, onDone }: TestSummaryCardProps) => {
  const handleActiveToggle = (checked: boolean) => {
    console.log('handleActiveToggle called with:', checked);
    onActiveToggle(checked);
    
    toast({
      title: checked ? "Test Activated" : "Test Deactivated",
      description: checked ? "Test is now visible to guests" : "Test is no longer visible to guests",
    });
  };

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
            checked={savedTest.isActive || false}
            onCheckedChange={handleActiveToggle}
          />
        </div>

        <Button 
          onClick={onDone} 
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-poppins"
        >
          Done
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestSummaryCard;
