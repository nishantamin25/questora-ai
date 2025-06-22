
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { ResponseService } from '@/services/ResponseService';

const Leaderboard = () => {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = () => {
    const allQuestionnaires = QuestionnaireService.getAllQuestionnaires();
    setQuestionnaires(allQuestionnaires.filter(q => q.isSaved));
  };

  const loadLeaderboard = (questionnaireId: string) => {
    const responses = ResponseService.getResponsesByQuestionnaire(questionnaireId);
    
    // Sort responses by score (highest first), then by submission time (earliest first)
    const sortedResponses = responses
      .filter(response => response.score !== undefined)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return (b.score || 0) - (a.score || 0);
        }
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });

    setLeaderboardData(sortedResponses);
    setSelectedTest(questionnaireId);
  };

  const toggleTestExpansion = (testId: string) => {
    if (expandedTest === testId) {
      setExpandedTest(null);
      setSelectedTest(null);
      setLeaderboardData([]);
    } else {
      setExpandedTest(testId);
      loadLeaderboard(testId);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-gray-400 font-bold">{rank}</span>;
    }
  };

  const getScorePercentage = (score: number, totalQuestions: number) => {
    if (!totalQuestions) return 0;
    return Math.round((score / totalQuestions) * 100);
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>Leaderboard</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Select Test to View Rankings</h3>
          <div className="space-y-2">
            {questionnaires.map((questionnaire) => {
              const responseCount = ResponseService.getResponsesByQuestionnaire(questionnaire.id).length;
              const isExpanded = expandedTest === questionnaire.id;
              
              return (
                <div key={questionnaire.id} className="space-y-2">
                  <Button
                    variant="outline"
                    className={`w-full justify-between text-left border-gray-700 bg-gray-800 text-white hover:bg-gray-700 ${
                      isExpanded ? 'bg-gray-700' : ''
                    }`}
                    onClick={() => toggleTestExpansion(questionnaire.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="truncate">{questionnaire.title}</span>
                      <Badge variant="secondary" className="ml-2">
                        <Users className="h-3 w-3 mr-1" />
                        {responseCount}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Leaderboard Table */}
                  {isExpanded && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      {leaderboardData.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No submissions yet for this test</p>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="text-white font-medium flex items-center space-x-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span>Top Performers</span>
                          </h4>
                          
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-700">
                                <TableHead className="text-gray-300">Rank</TableHead>
                                <TableHead className="text-gray-300">Player</TableHead>
                                <TableHead className="text-gray-300">Score</TableHead>
                                <TableHead className="text-gray-300">Percentage</TableHead>
                                <TableHead className="text-gray-300">Submitted</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leaderboardData.map((response, index) => {
                                const rank = index + 1;
                                const percentage = getScorePercentage(response.score || 0, response.totalQuestions || 0);
                                
                                return (
                                  <TableRow 
                                    key={response.id} 
                                    className={`border-gray-700 ${
                                      rank <= 3 ? 'bg-gray-750' : ''
                                    }`}
                                  >
                                    <TableCell className="text-white">
                                      <div className="flex items-center space-x-2">
                                        {getRankIcon(rank)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-white font-medium">
                                      {response.username}
                                    </TableCell>
                                    <TableCell className="text-white">
                                      {response.score}/{response.totalQuestions}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <div className="bg-gray-700 rounded-full h-2 w-16 overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${
                                              percentage >= 80 ? 'bg-green-500' :
                                              percentage >= 60 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                        <span className="text-white text-sm font-medium">
                                          {percentage}%
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-gray-400 text-sm">
                                      {new Date(response.submittedAt).toLocaleDateString()}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {questionnaires.length === 0 && (
              <p className="text-gray-400 text-sm">No tests available</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
