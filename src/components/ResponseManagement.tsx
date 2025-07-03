
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Download, FileText, Eye, EyeOff } from 'lucide-react';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { ResponseService } from '@/services/ResponseService';

const ResponseManagement = () => {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
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

  const loadResponses = async (questionnaireId: string) => {
    try {
      const questionnaireResponses = await ResponseService.getResponsesByQuestionnaire(questionnaireId);
      const questionnaireStats = await ResponseService.getResponseStats(questionnaireId);
      
      setResponses(questionnaireResponses);
      setStats(questionnaireStats);
      setSelectedQuestionnaire(questionnaireId);
    } catch (error) {
      console.error('Failed to load responses:', error);
      setResponses([]);
      setStats(null);
    }
  };

  const toggleDetailedStats = () => {
    setShowDetailedStats(!showDetailedStats);
  };

  const getTopOptions = (optionCounts: { [key: string]: number }, topN: number = 5) => {
    return Object.entries(optionCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, topN);
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

  const prepareResponseExportData = () => {
    return responses.map(response => {
      // Calculate correct answers from the response
      const correctAnswers = response.answers.filter(answer => answer.isCorrect).length;
      
      return {
        Player: response.username,
        Score: `${correctAnswers}/${response.totalQuestions}`,
        Submitted: new Date(response.submittedAt).toLocaleDateString(),
        Answers: response.answers.map(answer => `${answer.questionText}: ${answer.selectedOption}`).join('; ')
      };
    });
  };

  const getCurrentTestTitle = () => {
    const currentTest = questionnaires.find(q => q.id === selectedQuestionnaire);
    return currentTest ? currentTest.title : 'Responses';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Response Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Select Test to View Responses</h3>
          <div className="space-y-2">
            {questionnaires.map((questionnaire) => {
              const responseCount = responseCounts[questionnaire.id] || 0;
              const isSelected = selectedQuestionnaire === questionnaire.id;
              
              return (
                <Button
                  key={questionnaire.id}
                  variant="outline"
                  className={`w-full justify-between text-left border-gray-700 bg-gray-800 text-white hover:bg-gray-700 ${
                    isSelected ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => loadResponses(questionnaire.id)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{questionnaire.title}</span>
                    <Badge variant="secondary" className="ml-2">
                      <Users className="h-3 w-3 mr-1" />
                      {responseCount}
                    </Badge>
                  </div>
                </Button>
              );
            })}
            
            {questionnaires.length === 0 && (
              <p className="text-gray-400 text-sm">No tests available</p>
            )}
          </div>
        </div>

        {/* Responses Table */}
        {selectedQuestionnaire && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Responses</span>
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(prepareResponseExportData(), `${getCurrentTestTitle()}_responses`)}
                  className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(prepareResponseExportData(), `${getCurrentTestTitle()}_responses`)}
                  className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleDetailedStats}
                  className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-700"
                >
                  {showDetailedStats ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Stats
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Stats
                    </>
                  )}
                </Button>
              </div>
            </div>

            {responses.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No responses yet for this test</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Player</TableHead>
                    <TableHead className="text-gray-300">Score</TableHead>
                    <TableHead className="text-gray-300">Submitted</TableHead>
                    <TableHead className="text-gray-300">Answers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => {
                    // Calculate correct answers from the response
                    const correctAnswers = response.answers.filter(answer => answer.isCorrect).length;
                    
                    return (
                      <TableRow key={response.id} className="border-gray-700">
                        <TableCell className="text-white font-medium">{response.username}</TableCell>
                        <TableCell className="text-white">{correctAnswers}/{response.totalQuestions}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{new Date(response.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {response.answers.map(answer => (
                            <div key={answer.questionId}>
                              {answer.questionText}: {answer.selectedOption}
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Detailed Statistics */}
        {selectedQuestionnaire && showDetailedStats && stats && (
          <div className="space-y-4">
            <h3 className="text-white font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Detailed Statistics</span>
            </h3>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium">Overall Stats</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-gray-400">Total Responses: <span className="text-white">{stats.totalResponses}</span></p>
                  <p className="text-gray-400">Average Score: <span className="text-white">{stats.averageScore.toFixed(2)}</span></p>
                </div>
                {stats.totalResponses > 0 && (
                  <div>
                    <h5 className="text-gray-300 font-medium mb-2">Score Distribution</h5>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={responses.map(r => ({ name: r.username, score: r.score }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="name" stroke="#A0AEC0" />
                        <YAxis stroke="#A0AEC0" />
                        <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none', color: '#fff' }} />
                        <Bar dataKey="score" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {stats.questionStats.map((questionStat, index) => (
              <div key={questionStat.questionId} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium">Question {index + 1}: {questionStat.questionText}</h4>
                <p className="text-gray-400">Total Answers: <span className="text-white">{questionStat.totalAnswers}</span></p>
                
                {Object.keys(questionStat.optionCounts).length > 0 ? (
                  <>
                    <h5 className="text-gray-300 font-medium mb-2">Top Answered Options</h5>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={getTopOptions(questionStat.optionCounts).map(([option, count]) => ({ name: option, value: count }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label
                        >
                          {getTopOptions(questionStat.optionCounts).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="list-disc pl-5 text-gray-400">
                      {getTopOptions(questionStat.optionCounts).map(([option, count]) => (
                        <li key={option}>
                          {option}: <span className="text-white">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-gray-400">No answers yet for this question</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseManagement;
