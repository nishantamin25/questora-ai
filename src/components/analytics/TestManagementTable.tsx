
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import TestManagementRow from './TestManagementRow';

interface TestStat {
  id: string;
  title: string;
  isActive: boolean;
  usersTaken: number;
}

interface TestManagementTableProps {
  testStats: TestStat[];
  processingTests: Set<string>;
  onActivateTest: (testId: string) => void;
  onDeactivateTest: (testId: string) => void;
  onViewLeaderboard: (testId: string, testTitle: string) => void;
}

const TestManagementTable = ({ 
  testStats, 
  processingTests, 
  onActivateTest, 
  onDeactivateTest, 
  onViewLeaderboard 
}: TestManagementTableProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Test Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {testStats.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No tests created yet</p>
        ) : (
          <div className="space-y-3">
            {testStats.map((test) => (
              <TestManagementRow
                key={test.id}
                test={test}
                isProcessing={processingTests.has(test.id)}
                onActivate={onActivateTest}
                onDeactivate={onDeactivateTest}
                onViewLeaderboard={onViewLeaderboard}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestManagementTable;
