import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, LogOut, Upload, Zap, Paperclip, X, Trophy, MessageSquare } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = () => {
    try {
      if (user.role === 'admin') {
        const allQuestionnaires = QuestionnaireService.getAllQuestionnaires();
        console.log('Admin questionnaires loaded:', allQuestionnaires);
        setQuestionnaires(Array.isArray(allQuestionnaires) ? allQuestionnaires : []);
      } else {
        // For guests, only show active and saved questionnaires
        const activeQuestionnaires = QuestionnaireService.getActiveQuestionnaires();
        console.log('Guest questionnaires loaded:', activeQuestionnaires);
        setQuestionnaires(Array.isArray(activeQuestionnaires) ? activeQuestionnaires : []);
      }
    } catch (error) {
      console.error('Error loading questionnaires:', error);
      setQuestionnaires([]);
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
      // Check file extension - updated to include images and videos
      const allowedExtensions = ['.txt', '.docx', '.doc', '.pdf', '.png', '.svg', '.mp4'];
      const fileName = file.name.toLowerCase();
      const isAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isAllowedExtension) {
        toast({
          title: "Invalid File Type",
          description: "Please upload .txt, .docx, .doc, .pdf, .png, .svg, or .mp4 files",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit for videos
        toast({
          title: "Error",
          description: "File size must be less than 50MB",
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

  const handleGenerateQuestionnaire = async (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number, timeframe: number, includeCourse: boolean, includeQuestionnaire: boolean) => {
    setIsGenerating(true);
    setShowGenerateDialog(false);
    
    try {
      let fileContent = '';
      if (uploadedFile) {
        try {
          // For images and videos, we'll store the file reference for course generation
          if (uploadedFile.type.startsWith('image/') || uploadedFile.type.startsWith('video/')) {
            fileContent = `Media file: ${uploadedFile.name} (${uploadedFile.type})`;
          } else {
            fileContent = await readFileContent(uploadedFile);
          }
          console.log('File content prepared successfully');
        } catch (error) {
          console.error('Error reading file:', error);
          toast({
            title: "Warning",
            description: "Could not read file content. Generating questionnaire without file context.",
            variant: "destructive"
          });
        }
      }
      
      // Combine file content with options for the service call
      const extendedPrompt = fileContent ? `${prompt}\n\nFile content: ${fileContent}` : prompt;
      
      const questionnaire = await QuestionnaireService.generateQuestionnaire(
        extendedPrompt,
        { testName, difficulty, numberOfQuestions, timeframe, includeCourse, includeQuestionnaire }
      );
      
      setQuestionnaires(prev => [questionnaire, ...prev]);
      setPrompt('');
      setUploadedFile(null);
      
      toast({
        title: "Success",
        description: "Content generated successfully! Click the save button to save your content.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestionnaire = (updatedQuestionnaire: any) => {
    try {
      QuestionnaireService.saveQuestionnaire(updatedQuestionnaire);
      loadQuestionnaires();
    } catch (error) {
      console.error('Error updating questionnaire:', error);
      toast({
        title: "Error",
        description: "Failed to update questionnaire",
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuestionnaire = (questionnaireId: string) => {
    try {
      QuestionnaireService.deleteQuestionnaire(questionnaireId);
      loadQuestionnaires();
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      toast({
        title: "Error",
        description: "Failed to delete questionnaire",
        variant: "destructive"
      });
    }
  };

  // Ensure we have valid data before rendering
  const validQuestionnaires = questionnaires.filter(q => q && typeof q === 'object');
  console.log('Rendering questionnaires:', validQuestionnaires);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-2 rounded-lg shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-poppins">Questora AI</h1>
              <p className="text-sm text-slate-600 font-inter">Welcome, {user.username} ({user.role})</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {user.role === 'admin' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResponses(!showResponses)}
                  className="flex items-center space-x-2 border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:border-violet-300 font-poppins rounded-lg"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Responses</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="flex items-center space-x-2 border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:border-violet-300 font-poppins rounded-lg"
                >
                  <Trophy className="h-4 w-4" />
                  <span>Leaderboard</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="flex items-center space-x-2 border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:border-red-300 hover:text-red-600 font-poppins rounded-lg"
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

            {/* Admin Leaderboard */}
            {user.role === 'admin' && showLeaderboard && (
              <div className="mb-6">
                <Leaderboard />
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
              <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
                  <CardTitle className="text-slate-900 font-poppins">Generate Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <Label htmlFor="prompt" className="text-slate-700 font-medium font-poppins">Describe your content</Label>
                    <div className="relative mt-1">
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Create content about customer satisfaction for an e-commerce website"
                        className="min-h-[120px] bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 pr-12 rounded-lg focus:border-violet-500 focus:ring-violet-500 font-inter"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Paperclip className="h-5 w-5 text-slate-400 hover:text-violet-600 transition-colors" />
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          onChange={handleFileUpload}
                          accept=".txt,.pdf,.doc,.docx,.png,.svg,.mp4"
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    {uploadedFile && (
                      <div className="mt-2 flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-4 w-4 text-violet-600" />
                          <span className="text-sm text-violet-800 font-medium font-inter">{uploadedFile.name}</span>
                        </div>
                        <button
                          onClick={removeFile}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleGenerateClick}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 rounded-lg font-poppins font-medium py-3"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span>Generate Content</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Access restriction message for guest users */}
            {user.role === 'guest' && (
              <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                <CardContent className="p-8 text-center">
                  <Bot className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 font-poppins">
                    Available Tests
                  </h3>
                  <p className="text-slate-600 font-inter">
                    Click on the answer options below to select your responses, then submit when you've answered all questions.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Questionnaires */}
            <div className="space-y-4">
              {validQuestionnaires.map((questionnaire, index) => {
                // Ensure we have a valid questionnaire object with required properties
                if (!questionnaire || typeof questionnaire !== 'object') {
                  console.warn('Invalid questionnaire at index', index, questionnaire);
                  return null;
                }

                const questionnaireId = questionnaire.id || `questionnaire-${index}`;
                console.log('Rendering questionnaire:', questionnaireId, questionnaire);
                
                return (
                  <QuestionnaireDisplay 
                    key={questionnaireId} 
                    questionnaire={questionnaire}
                    isAdmin={user.role === 'admin'}
                    onUpdate={handleUpdateQuestionnaire}
                    onDelete={handleDeleteQuestionnaire}
                  />
                );
              })}
              
              {validQuestionnaires.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                  <CardContent className="p-8 text-center">
                    <Bot className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 font-poppins">
                      {user.role === 'admin' ? 'No questionnaires yet' : 'No active tests available'}
                    </h3>
                    <p className="text-slate-600 font-inter">
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
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
                <CardTitle className="text-slate-900 font-poppins">
                  {user.role === 'admin' ? 'Admin Tips' : 'How to Answer'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm p-6">
                {user.role === 'admin' ? (
                  <>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold text-blue-700 font-poppins">Save tests</p>
                      <p className="text-blue-600 font-inter">After generating, click the save button to name your test and set difficulty</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-700 font-poppins">View responses</p>
                      <p className="text-green-600 font-inter">Use the Responses tab to see guest submissions and statistics</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg">
                      <p className="font-semibold text-purple-700 font-poppins">View leaderboard</p>
                      <p className="text-purple-600 font-inter">Check the Leaderboard tab to see top performers for each test</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold text-blue-700 font-poppins">Select answers</p>
                      <p className="text-blue-600 font-inter">Click on any option to select it. Selected options will be highlighted in blue.</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-700 font-poppins">Submit responses</p>
                      <p className="text-green-600 font-inter">Answer all questions to enable the submit button at the bottom of each questionnaire.</p>
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
