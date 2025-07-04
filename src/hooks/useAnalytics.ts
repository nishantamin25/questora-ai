
import { useState, useEffect } from 'react';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { toast } from '@/hooks/use-toast';

interface TestStat {
  id: string;
  title: string;
  isActive: boolean;
  usersTaken: number;
}

interface AnalyticsData {
  totalTests: number;
  activeTests: number;
  inactiveTests: number;
  totalUsers: number;
  testStats: TestStat[];
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTests: 0,
    activeTests: 0,
    inactiveTests: 0,
    totalUsers: 0,
    testStats: []
  });
  const [loading, setLoading] = useState(false);
  const [processingTests, setProcessingTests] = useState(new Set<string>());

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
    if (loading || processingTests.has(testId)) return;
    
    // Add test to processing set to prevent concurrent operations
    setProcessingTests(prev => new Set(prev).add(testId));
    
    try {
      // First update the UI optimistically
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

      // Then perform the backend operation
      await QuestionnaireService.activateQuestionnaire(testId);

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
      // Revert the optimistic update on error
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
    } finally {
      // Remove test from processing set
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  const handleDeactivateTest = async (testId: string) => {
    if (loading || processingTests.has(testId)) return;
    
    // Add test to processing set to prevent concurrent operations
    setProcessingTests(prev => new Set(prev).add(testId));
    
    try {
      // First update the UI optimistically
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

      // Then perform the backend operation
      await QuestionnaireService.deactivateQuestionnaire(testId);

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
      // Revert the optimistic update on error
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
    } finally {
      // Remove test from processing set
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  const handleViewLeaderboard = (testId: string, testTitle: string) => {
    // For now, just show a toast - in a real app this would navigate to leaderboard
    toast({
      title: "Leaderboard",
      description: `Viewing leaderboard for "${testTitle}"`,
    });
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    analytics,
    loading,
    processingTests,
    handleActivateTest,
    handleDeactivateTest,
    handleViewLeaderboard,
    loadAnalytics
  };
};
