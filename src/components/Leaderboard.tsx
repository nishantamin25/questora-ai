import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, ChevronDown, ChevronUp, Users, Download, FileText } from 'lucide-react';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { ResponseService } from '@/services/ResponseService';

const Leaderboard = () => {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = async () => {
    try {
      const allQuestionnaires = await QuestionnaireService.getAllQuestionnaires();
      const savedQuestionnaires = allQuestionnaires.filter(q => q.isSaved);
      setQuestionnaires(savedQuestionnaires);
      
      // Load response counts for each questionnaire
      const counts: Record<string, number> = {};
      for (const questionnaire of savedQuestionnaires) {
        const responses = await ResponseService.getResponsesByQuestionnaire(questionnaire.id);
        counts[questionnaire.id] = responses.length;
      }
      setResponseCounts(counts);
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
    }
  };

  const loadLeaderboard = async (questionnaireId: string) => {
    try {
      const responses = await ResponseService.getResponsesByQuestionnaire(questionnaireId);
      
      // Sort responses by correct answers count (highest first), then by submission time (earliest first)
      const sortedResponses = responses
        .filter(response => response.answers && Array.isArray(response.answers))
        .map(response => {
          // Calculate correct answers from the response
          const correctAnswers = response.answers.filter(answer => answer.isCorrect).length;
          return { ...response, correctAnswersCount: correctAnswers };
        })
        .sort((a, b) => {
          if (b.correctAnswersCount !== a.correctAnswersCount) {
            return b.correctAnswersCount - a.correctAnswersCount;
          }
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        });

      setLeaderboardData(sortedResponses);
      setSelectedTest(questionnaireId);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setLeaderboardData([]);
    }
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

  const getScorePercentage = (correctAnswers: number, totalQuestions: number) => {
    if (!totalQuestions) return 0;
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  const exportToExcel = (data: any[], filename: string) => {
    const csvContent = convertToCSV(data);
    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  const exportToPDF = (data: any[], filename: string) => {
    const htmlContent = convertToHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>${filename}</h1>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    ).join('\n');
    
    return `${headers}\n${rows}`;
  };

  const convertToHTML = (data: any[]) => {
    if (data.length === 0) return '<p>No data available</p>';
    
    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const dataRows = data.map(row => 
      `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`
    ).join('');
    
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table>`;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const prepareLeaderboardExportData = () => {
    return leaderboardData.map((response, index) => {
      const correctAnswers = response.correctAnswersCount || 0;
      return {
        Rank: index + 1,
        Player: response.username,
        Score: `${correctAnswers}/${response.totalQuestions}`,
        Percentage: `${getScorePercentage(correctAnswers, response.totalQuestions || 0)}%`,
        Submitted: new Date(response.submittedAt).toLocaleDateString()
      };
    });
  };

  const getCurrentTestTitle = () => {
    const currentTest = questionnaires.find(q => q.id === expandedTest);
    return currentTest ? currentTest.title : 'Leaderboard';
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
              const responseCount = responseCounts[questionnaire.id] || 0;
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
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium flex items-center space-x-2">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span>Top Performers</span>
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToExcel(prepareLeaderboardExportData(), `${getCurrentTestTitle()}_leaderboard`)}
                                className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-700"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Excel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToPDF(prepareLeaderboardExportData(), `${getCurrentTestTitle()}_leaderboard`)}
                                className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-700"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Export PDF
                              </Button>
                            </div>
                          </div>
                          
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
                                const correctAnswers = response.correctAnswersCount || 0;
                                const percentage = getScorePercentage(correctAnswers, response.totalQuestions || 0);
                                
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
                                      {correctAnswers}/{response.totalQuestions}
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
