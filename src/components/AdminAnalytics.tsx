
import AnalyticsOverviewCards from './analytics/AnalyticsOverviewCards';
import TestManagementTable from './analytics/TestManagementTable';
import { useAnalytics } from '@/hooks/useAnalytics';

const AdminAnalytics = () => {
  const {
    analytics,
    processingTests,
    handleActivateTest,
    handleDeactivateTest,
    handleViewLeaderboard
  } = useAnalytics();

  return (
    <div className="space-y-6">
      {/* Analytics Overview Cards */}
      <AnalyticsOverviewCards analytics={analytics} />

      {/* Test Management Table */}
      <TestManagementTable
        testStats={analytics.testStats}
        processingTests={processingTests}
        onActivateTest={handleActivateTest}
        onDeactivateTest={handleDeactivateTest}
        onViewLeaderboard={handleViewLeaderboard}
      />
    </div>
  );
};

export default AdminAnalytics;
