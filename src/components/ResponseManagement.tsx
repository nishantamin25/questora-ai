
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, User, CheckCircle, XCircle, MessageSquare, FileText, Clock } from 'lucide-react';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { ResponseService } from '@/services/ResponseService';

const ResponseManagement = () => {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null);
  const [testResponses, setTestResponses] = useState<any[]>([]);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = () => {
    const allQuestionnaires = QuestionnaireService.getAllQuestionnaires();
    setQuestionnaires(allQuestionnaires.filter(q => q.isSaved));
  };

  const openTest = (questionnaire: any) => {
    const responses = ResponseService.getResponsesByQuestionnaire(questionnaire.id);
    setTestResponses(responses);
    setSelectedTest(questionnaire);
    setSelectedResponse(null);
  };

  const openPersonResponse = (response: any) => {
    setSelectedResponse(response);
  };

  const goBackToTestList = () => {
    setSelectedTest(null);
    setSelectedResponse(null);
    setTestResponses([]);
  };

  const goBackToPersonList = () => {
    setSelectedResponse(null);
  };

  const getScorePercentage = (score: number, totalQuestions: number) => {
    if (!totalQuestions) return 0;
    return Math.round((score / totalQuestions) * 100);
  };

  // Show individual person's response
  if (selectedResponse) {
    const percentage = getScorePercentage(selectedResponse.score || 0, selectedResponse.totalQuestions || 0);
    
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBackToPersonList}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Participants
              </Button>
            </div>
          </div>
          <CardTitle className="text-white flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{selectedResponse.username}'s Response</span>
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Submitted: {new Date(selectedResponse.submittedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Score: {selectedResponse.score}/{selectedResponse.totalQuestions} ({percentage}%)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {selectedResponse.answers.map((answer: any, index: number) => (
              <div key={answer.questionId} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-white font-medium">
                    Question {index + 1}: {answer.questionText}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {answer.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Answer:</span>
                    <Badge 
                      variant={answer.isCorrect ? "default" : "destructive"}
                      className={answer.isCorrect ? "bg-green-600" : "bg-red-600"}
                    >
                      {answer.selectedOption}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show list of people who took the selected test
  if (selectedTest) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBackToTestList}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tests
              </Button>
            </div>
          </div>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{selectedTest.title} - Participants</span>
          </CardTitle>
          <div className="text-sm text-gray-400">
            {testResponses.length} participant{testResponses.length !== 1 ? 's' : ''}
          </div>
        </CardHeader>
        <CardContent>
          {testResponses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No responses yet for this test</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Participant</TableHead>
                  <TableHead className="text-gray-300">Score</TableHead>
                  <TableHead className="text-gray-300">Percentage</TableHead>
                  <TableHead className="text-gray-300">Submitted</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testResponses.map((response) => {
                  const percentage = getScorePercentage(response.score || 0, response.totalQuestions || 0);
                  
                  return (
                    <TableRow key={response.id} className="border-gray-700">
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{response.username}</span>
                        </div>
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
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPersonResponse(response)}
                          className="border-gray-600 text-white hover:bg-gray-700"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Answers
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show list of tests (default view)
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Response Management</span>
        </CardTitle>
        <div className="text-sm text-gray-400">
          Select a test to view participant responses
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {questionnaires.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No tests available</p>
        ) : (
          <div className="space-y-3">
            {questionnaires.map((questionnaire) => {
              const responseCount = ResponseService.getResponsesByQuestionnaire(questionnaire.id).length;
              
              return (
                <div
                  key={questionnaire.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => openTest(questionnaire)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <h4 className="text-white font-medium">{questionnaire.title}</h4>
                        <p className="text-gray-400 text-sm">
                          {questionnaire.difficulty} • {questionnaire.questions?.length || 0} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-gray-700">
                        <Users className="h-3 w-3 mr-1" />
                        {responseCount} response{responseCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseManagement;
