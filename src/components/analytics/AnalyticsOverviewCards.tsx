
import { Card, CardContent } from '@/components/ui/card';
import { TestTube, Users, Eye, EyeOff } from 'lucide-react';

interface AnalyticsData {
  totalTests: number;
  activeTests: number;
  inactiveTests: number;
  totalUsers: number;
}

interface AnalyticsOverviewCardsProps {
  analytics: AnalyticsData;
}

const AnalyticsOverviewCards = ({ analytics }: AnalyticsOverviewCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <TestTube className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{analytics.totalTests}</p>
              <p className="text-xs text-gray-400">Total Tests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Eye className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{analytics.activeTests}</p>
              <p className="text-xs text-gray-400">Active Tests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <EyeOff className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{analytics.inactiveTests}</p>
              <p className="text-xs text-gray-400">Inactive Tests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
              <p className="text-xs text-gray-400">Total Users</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsOverviewCards;
