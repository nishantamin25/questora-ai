import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, LogOut, Settings, Upload, Send, Paperclip, X, BarChart3, MessageSquare } from 'lucide-react';
import AdminConfig from '@/components/AdminConfig';
import AdminAnalytics from '@/components/AdminAnalytics';
import ResponseManagement from '@/components/ResponseManagement';
import QuestionnaireDisplay from '@/components/QuestionnaireDisplay';
import GenerateTestDialog from '@/components/GenerateTestDialog';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { toast } from '@/hooks/use-toast';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = () => {
    if (user.role === 'admin') {
      const allQuestionnaires = QuestionnaireService.getAllQuestionnaires();
      setQuestionnaires(allQuestionnaires);
    } else {
      // For guests, only show active and saved questionnaires
      const activeQuestionnaires = QuestionnaireService.getActiveQuestionnaires();
      setQuestionnaires(activeQuestionnaires);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only admin users can upload files",
        variant: "destructive"
      });
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      // Check file extension
      const allowedExtensions = ['.txt', '.docx', '.doc', '.pdf'];
      const fileName = file.name.toLowerCase();
      const isAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isAllowedExtension) {
        toast({
          title: "Invalid File Type",
          description: "Please upload only .txt, .docx, .doc, or .pdf files",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive"
        });
        return;
      }
      setUploadedFile(file);
      toast({
        title: "Success",
        description: `File "${file.name}" uploaded successfully`,
      });
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      
      // For PDF files, we'll read as text (limited support)
      // For .docx and .doc, we'll read as text (limited support)
      // For .txt files, this will work perfectly
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For other file types, we'll attempt to read as text
        // Note: This is a simplified approach. In a real app, you'd use specialized libraries
        reader.readAsText(file);
      }
    });
  };

  const handleGenerateClick = () => {
    if (user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only admin users can create questionnaires",
        variant: "destructive"
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive"
      });
      return;
    }

    setShowGenerateDialog(true);
  };

  const handleGenerateQuestionnaire = async (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number) => {
    setIsGenerating(true);
    setShowGenerateDialog(false);
    
    try {
      let fileContent = '';
      if (uploadedFile) {
        try {
          fileContent = await readFileContent(uploadedFile);
          console.log('File content read successfully:', fileContent.substring(0, 100) + '...');
        } catch (error) {
          console.error('Error reading file:', error);
          toast({
            title: "Warning",
            description: "Could not read file content. Generating questionnaire without file context.",
            variant: "destructive"
          });
        }
      }
      
      const questionnaire = await QuestionnaireService.generateQuestionnaire(
        prompt,
        { testName, difficulty, numberOfQuestions },
        fileContent
      );
      
      setQuestionnaires(prev => [questionnaire, ...prev]);
      setPrompt('');
      setUploadedFile(null);
      
      toast({
        title: "Success",
        description: "Questionnaire generated successfully! Click the save button to save your test.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate questionnaire",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestionnaire = (updatedQuestionnaire: any) => {
    QuestionnaireService.saveQuestionnaire(updatedQuestionnaire);
    loadQuestionnaires();
  };

  const handleDeleteQuestionnaire = (questionnaireId: string) => {
    QuestionnaireService.deleteQuestionnaire(questionnaireId);
    loadQuestionnaires();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
              <Bot className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Questora AI</h1>
              <p className="text-sm text-gray-400">Welcome, {user.username} ({user.role})</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {user.role === 'admin' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResponses(!showResponses)}
                  className="flex items-center space-x-2 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Responses</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="flex items-center space-x-2 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center space-x-2 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  <span>Config</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="flex items-center space-x-2 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Admin Response Management */}
            {user.role === 'admin' && showResponses && (
              <div className="mb-6">
                <ResponseManagement />
              </div>
            )}

            {/* Admin Analytics */}
            {user.role === 'admin' && showAnalytics && (
              <div className="mb-6">
                <AdminAnalytics />
              </div>
            )}

            {/* Generation Dialog */}
            <GenerateTestDialog
              open={showGenerateDialog}
              prompt={prompt}
              uploadedFile={uploadedFile}
              onGenerate={handleGenerateQuestionnaire}
              onCancel={() => setShowGenerateDialog(false)}
            />

            {/* Input Area - Only for Admin */}
            {user.role === 'admin' && !showGenerateDialog && (
              <Card className="mb-6 bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Generate Questionnaire</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="prompt" className="text-gray-300">Describe your questionnaire</Label>
                    <div className="relative mt-1">
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Create a questionnaire about customer satisfaction for an e-commerce website"
                        className="min-h-[120px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-12"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Paperclip className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          onChange={handleFileUpload}
                          accept=".txt,.pdf,.doc,.docx"
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    {uploadedFile && (
                      <div className="mt-2 flex items-center justify-between bg-gray-800 border border-gray-700 rounded-md px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-400">{uploadedFile.name}</span>
                        </div>
                        <button
                          onClick={removeFile}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleGenerateClick}
                    disabled={isGenerating}
                    className="w-full bg-white text-black hover:bg-gray-200"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Send className="h-4 w-4" />
                        <span>Configure & Generate</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Access restriction message for guest users */}
            {user.role === 'guest' && (
              <Card className="mb-6 bg-gray-900 border-gray-800">
                <CardContent className="p-8 text-center">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Available Tests
                  </h3>
                  <p className="text-gray-400">
                    Click on the answer options below to select your responses, then submit when you've answered all questions.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Questionnaires */}
            <div className="space-y-4">
              {questionnaires.map((questionnaire, index) => (
                <QuestionnaireDisplay 
                  key={questionnaire.id || index} 
                  questionnaire={questionnaire}
                  isAdmin={user.role === 'admin'}
                  onUpdate={handleUpdateQuestionnaire}
                  onDelete={handleDeleteQuestionnaire}
                />
              ))}
              
              {questionnaires.length === 0 && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {user.role === 'admin' ? 'No questionnaires yet' : 'No active tests available'}
                    </h3>
                    <p className="text-gray-400">
                      {user.role === 'admin' 
                        ? "Enter a prompt above to generate your first questionnaire"
                        : "No active tests have been published yet"
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {user.role === 'admin' && showConfig && <AdminConfig />}
            
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">
                  {user.role === 'admin' ? 'Admin Tips' : 'How to Answer'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {user.role === 'admin' ? (
                  <>
                    <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                      <p className="font-semibold text-blue-300">Save tests</p>
                      <p className="text-blue-400">After generating, click the save button to name your test and set difficulty</p>
                    </div>
                    <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
                      <p className="font-semibold text-green-300">View responses</p>
                      <p className="text-green-400">Use the Responses tab to see guest submissions and statistics</p>
                    </div>
                    <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
                      <p className="font-semibold text-purple-300">Manage activation</p>
                      <p className="text-purple-400">Only active tests are visible to guests</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                      <p className="font-semibold text-blue-300">Select answers</p>
                      <p className="text-blue-400">Click on any option to select it. Selected options will be highlighted in blue.</p>
                    </div>
                    <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
                      <p className="font-semibold text-green-300">Submit responses</p>
                      <p className="text-green-400">Answer all questions to enable the submit button at the bottom of each questionnaire.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
