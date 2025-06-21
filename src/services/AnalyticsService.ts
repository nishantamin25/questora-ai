
interface TestAnalytics {
  totalTests: number;
  activeTests: number;
  inactiveTests: number;
  totalUsers: number;
  testStats: Array<{
    id: string;
    title: string;
    isActive: boolean;
    usersTaken: number;
  }>;
}

class AnalyticsServiceClass {
  getAnalytics(): TestAnalytics {
    const questionnaires = this.getAllQuestionnaires();
    const userStats = this.getUserStats();
    
    return {
      totalTests: questionnaires.length,
      activeTests: questionnaires.filter(q => q.isActive).length,
      inactiveTests: questionnaires.filter(q => !q.isActive).length,
      totalUsers: userStats.totalUsers,
      testStats: questionnaires.map(q => ({
        id: q.id,
        title: q.title,
        isActive: q.isActive,
        usersTaken: userStats.testUserCounts[q.id] || 0
      }))
    };
  }

  private getAllQuestionnaires() {
    const stored = localStorage.getItem('questionnaires');
    if (stored) {
      return JSON.parse(stored).map((q: any) => ({
        ...q,
        isActive: q.isActive !== undefined ? q.isActive : false
      }));
    }
    return [];
  }

  private getUserStats() {
    const userStats = localStorage.getItem('userStats');
    if (userStats) {
      return JSON.parse(userStats);
    }
    return {
      totalUsers: 0,
      testUserCounts: {}
    };
  }

  activateQuestionnaire(questionnaireId: string): void {
    const questionnaires = this.getAllQuestionnaires();
    const updatedQuestionnaires = questionnaires.map((q: any) => 
      q.id === questionnaireId ? { ...q, isActive: true } : q
    );
    localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
  }

  deactivateQuestionnaire(questionnaireId: string): void {
    const questionnaires = this.getAllQuestionnaires();
    const updatedQuestionnaires = questionnaires.map((q: any) => 
      q.id === questionnaireId ? { ...q, isActive: false } : q
    );
    localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
  }
}

export const AnalyticsService = new AnalyticsServiceClass();
