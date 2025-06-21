
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, LogOut, Settings, Upload, Send } from 'lucide-react';
import AdminConfig from '@/components/AdminConfig';
import QuestionnaireDisplay from '@/components/QuestionnaireDisplay';
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleGenerateQuestionnaire = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      let fileContent = '';
      if (uploadedFile) {
        fileContent = await readFileContent(uploadedFile);
      }
      
      const questionnaire = await QuestionnaireService.generateQuestionnaire(
        prompt,
        fileContent
      );
      
      setQuestionnaires(prev => [questionnaire, ...prev]);
      setPrompt('');
      setUploadedFile(null);
      
      toast({
        title: "Success",
        description: "Questionnaire generated successfully!",
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

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Questionnaire Bot</h1>
              <p className="text-sm text-gray-600">Welcome, {user.username} ({user.role})</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Config</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="flex items-center space-x-2"
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
            {/* Input Area */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Generate Questionnaire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Describe your questionnaire</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Create a questionnaire about customer satisfaction for an e-commerce website"
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="file">Upload file (optional)</Label>
                  <div className="mt-1 flex items-center space-x-2">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileUpload}
                      accept=".txt,.pdf,.doc,.docx"
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-gray-400" />
                  </div>
                  {uploadedFile && (
                    <p className="text-sm text-green-600 mt-1">
                      File uploaded: {uploadedFile.name}
                    </p>
                  )}
                </div>
                
                <Button
                  onClick={handleGenerateQuestionnaire}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Send className="h-4 w-4" />
                      <span>Generate Questionnaire</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Questionnaires */}
            <div className="space-y-4">
              {questionnaires.map((questionnaire, index) => (
                <QuestionnaireDisplay key={index} questionnaire={questionnaire} />
              ))}
              
              {questionnaires.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No questionnaires yet
                    </h3>
                    <p className="text-gray-600">
                      Enter a prompt above to generate your first questionnaire
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {user.role === 'admin' && showConfig && <AdminConfig />}
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-900">Be specific</p>
                  <p className="text-blue-700">Include the topic, target audience, and purpose</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-900">Upload context</p>
                  <p className="text-green-700">Add files to provide more context for better questions</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="font-semibold text-purple-900">Configure settings</p>
                  <p className="text-purple-700">{user.role === 'admin' ? 'Use the config panel to customize generation' : 'Ask an admin to configure question types and options'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
