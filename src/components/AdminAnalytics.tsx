
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { BarChart3, Users, TestTube, Trophy, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    totalTests: 0,
    activeTests: 0,
    inactiveTests: 0,
    totalUsers: 0,
    testStats: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const questionnaires = await QuestionnaireService.getAllQuestionnaires();
      const savedQuestionnaires = questionnaires.filter(q => q.isSaved);
      
      const totalTests = savedQuestionnaires.length;
      const activeTests = savedQuestionnaires.filter(q => q.isActive).length;
      const inactiveTests = totalTests - activeTests;
      
      const testStats = savedQuestionnaires.map(q => ({
        id: q.id,
        title: q.title,
        isActive: q.isActive,
        usersTaken: 0 // This would need to be calculated from responses
      }));

      setAnalytics({
        totalTests,
        activeTests,
        inactiveTests,
        totalUsers: 0, // This would need to be calculated separately
        testStats
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTest = async (testId: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      await QuestionnaireService.activateQuestionnaire(testId);
      
      // Update the local state while preserving order
      setAnalytics(prev => {
        const updatedTestStats = prev.testStats.map(test => 
          test.id === testId 
            ? { ...test, isActive: true }
            : test
        );
        
        return {
          ...prev,
          activeTests: prev.activeTests + 1,
          inactiveTests: prev.inactiveTests - 1,
          testStats: updatedTestStats
        };
      });

      toast({
        title: "Success",
        description: "Test activated successfully",
      });
    } catch (error) {
      console.error('Failed to activate test:', error);
      toast({
        title: "Error",
        description: "Failed to activate test",
        variant: "destructive"
      });
      // Reload analytics to ensure consistency
      loadAnalytics();
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateTest = async (testId: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      await QuestionnaireService.deactivateQuestionnaire(testId);
      
      // Update the local state while preserving order
      setAnalytics(prev => {
        const updatedTestStats = prev.testStats.map(test => 
          test.id === testId 
            ? { ...test, isActive: false }
            : test
        );
        
        return {
          ...prev,
          activeTests: prev.activeTests - 1,
          inactiveTests: prev.inactiveTests + 1,
          testStats: updatedTestStats
        };
      });

      toast({
        title: "Success",
        description: "Test deactivated successfully",
      });
    } catch (error) {
      console.error('Failed to deactivate test:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate test",
        variant: "destructive"
      });
      // Reload analytics to ensure consistency
      loadAnalytics();
    } finally {
      setLoading(false);
    }
  };

  const handleViewLeaderboard = (testId: string, testTitle: string) => {
    // For now, just show a toast - in a real app this would navigate to leaderboard
    toast({
      title: "Leaderboard",
      description: `Viewing leaderboard for "${testTitle}"`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview Cards */}
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

      {/* Test Management Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Test Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.testStats.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No tests created yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.testStats.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
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
                      onClick={() => handleViewLeaderboard(test.id, test.title)}
                      className="flex items-center space-x-1 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>Leaderboard</span>
                    </Button>
                    
                    {test.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeactivateTest(test.id)}
                        disabled={loading}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleActivateTest(test.id)}
                        disabled={loading}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
