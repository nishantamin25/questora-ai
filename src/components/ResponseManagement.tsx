
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponseService } from '@/services/ResponseService';
import { QuestionnaireService } from '@/services/QuestionnaireService';

const ResponseManagement = () => {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string | null>(null);
  const [responseStats, setResponseStats] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = () => {
    const allQuestionnaires = QuestionnaireService.getAllQuestionnaires();
    setQuestionnaires(allQuestionnaires);
  };

  const handleQuestionnaireSelect = (questionnaireId: string) => {
    setSelectedQuestionnaire(questionnaireId);
    const stats = ResponseService.getResponseStats(questionnaireId);
    const questionnaireResponses = ResponseService.getResponsesByQuestionnaire(questionnaireId);
    setResponseStats(stats);
    setResponses(questionnaireResponses);
  };

  const toggleResponseExpansion = (responseId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedResponses(newExpanded);
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Response Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Questionnaire Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Select Questionnaire</h3>
          <div className="space-y-2">
            {questionnaires.map((questionnaire) => {
              const responseCount = ResponseService.getResponsesByQuestionnaire(questionnaire.id).length;
              return (
                <Button
                  key={questionnaire.id}
                  variant={selectedQuestionnaire === questionnaire.id ? "default" : "outline"}
                  className={`w-full justify-between text-left ${
                    selectedQuestionnaire === questionnaire.id 
                      ? "bg-white text-black" 
                      : "border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                  }`}
                  onClick={() => handleQuestionnaireSelect(questionnaire.id)}
                >
                  <span className="truncate">{questionnaire.title}</span>
                  <Badge variant="secondary" className="ml-2">
                    {responseCount}
                  </Badge>
                </Button>
              );
            })}
            {questionnaires.length === 0 && (
              <p className="text-gray-400 text-sm">No questionnaires available</p>
            )}
          </div>
        </div>

        {/* Response Statistics */}
        {selectedQuestionnaire && responseStats && (
          <div className="space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="h-4 w-4 text-blue-400" />
                <h3 className="font-medium text-white">Response Overview</h3>
              </div>
              <p className="text-2xl font-bold text-white">{responseStats.totalResponses}</p>
              <p className="text-sm text-gray-400">Total Responses</p>
            </div>

            {/* Question Statistics */}
            {responseStats.questionStats.map((stat: any, index: number) => (
              <div key={stat.questionId} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">
                  Question {index + 1}: {stat.questionText}
                </h4>
                <div className="space-y-2">
                  {Object.entries(stat.optionCounts).map(([option, count]: [string, any]) => (
                    <div key={option} className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">{option}</span>
                      <div className="flex items-center space-x-2">
                        <div className="bg-gray-700 rounded-full h-2 w-20 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full"
                            style={{
                              width: `${(count / stat.totalAnswers) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-white text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Individual Responses */}
            <div className="space-y-3">
              <h3 className="font-medium text-white flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Individual Responses</span>
              </h3>
              {responses.map((response) => (
                <div key={response.id} className="bg-gray-800 border border-gray-700 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleResponseExpansion(response.id)}
                  >
                    <div>
                      <p className="text-white font-medium">{response.username}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(response.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    {expandedResponses.has(response.id) ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  
                  {expandedResponses.has(response.id) && (
                    <div className="border-t border-gray-700 p-4 space-y-3">
                      {response.answers.map((answer: any, index: number) => (
                        <div key={answer.questionId} className="space-y-1">
                          <p className="text-gray-300 text-sm">
                            {index + 1}. {answer.questionText}
                          </p>
                          <p className="text-white font-medium pl-4">
                            {answer.selectedOption}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {responses.length === 0 && (
                <p className="text-gray-400 text-sm">No responses yet</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseManagement;
