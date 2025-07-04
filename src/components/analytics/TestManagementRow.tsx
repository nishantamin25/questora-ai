
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface TestStat {
  id: string;
  title: string;
  isActive: boolean;
  usersTaken: number;
}

interface TestManagementRowProps {
  test: TestStat;
  isProcessing: boolean;
  onActivate: (testId: string) => void;
  onDeactivate: (testId: string) => void;
  onViewLeaderboard: (testId: string, testTitle: string) => void;
}

const TestManagementRow = ({ 
  test, 
  isProcessing, 
  onActivate, 
  onDeactivate, 
  onViewLeaderboard 
}: TestManagementRowProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex-1">
        <h4 className="font-medium text-white">{test.title}</h4>
        <p className="text-sm text-gray-400">{test.usersTaken} users completed</p>
      </div>
      
      <div className="flex items-center space-x-3">
        <Badge 
          variant={test.isActive ? "default" : "secondary"}
          className={test.isActive ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"}
        >
          {test.isActive ? "Active" : "Inactive"}
        </Badge>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewLeaderboard(test.id, test.title)}
          className="flex items-center space-x-1 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
        >
          <Trophy className="h-4 w-4" />
          <span>Leaderboard</span>
        </Button>
        
        {test.isActive ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeactivate(test.id)}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Deactivate'}
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onActivate(test.id)}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Activate'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TestManagementRow;
