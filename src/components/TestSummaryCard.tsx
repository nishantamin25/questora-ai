
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, FileText, Play, Edit, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Questionnaire } from '@/types/SaveTestDialog';

interface TestSummaryCardProps {
  savedTest: Questionnaire;
  onActiveToggle: (checked: boolean) => void;
  onDone: () => void;
}

const TestSummaryCard = ({ savedTest, onActiveToggle, onDone }: TestSummaryCardProps) => {
  console.log('TestSummaryCard rendering with savedTest:', {
    testName: savedTest.testName,
    isActive: savedTest.isActive,
    questionCount: savedTest.questions.length
  });

  const handleActivate = () => {
    console.log('TestSummaryCard handleActivate called');
    onActiveToggle(true);
    
    toast({
      title: "Test Activated",
      description: "Test is now visible to participants",
    });
  };

  const handleEdit = () => {
    // This would typically open an edit dialog or navigate to edit page
    toast({
      title: "Edit Feature",
      description: "Edit functionality would be implemented here",
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

        <div className="flex space-x-2 mb-4">
          {!savedTest.isActive ? (
            <Button 
              onClick={handleActivate} 
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-poppins"
            >
              <Play className="h-4 w-4 mr-2" />
              Activate
            </Button>
          ) : (
            <Button 
              disabled
              className="flex-1 bg-green-100 text-green-800 border-green-200 rounded-lg font-poppins cursor-not-allowed"
            >
              <Check className="h-4 w-4 mr-2" />
              Active
            </Button>
          )}
          
          <Button 
            onClick={handleEdit} 
            variant="outline"
            className="flex-1 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg font-poppins"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
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
