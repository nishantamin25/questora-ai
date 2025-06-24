
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, LogOut, Upload, Zap, Paperclip, X, Trophy, MessageSquare, Settings } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import ResponseManagement from '@/components/ResponseManagement';
import QuestionnaireDisplay from '@/components/QuestionnaireDisplay';
import GenerateTestDialog from '@/components/GenerateTestDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SettingsDialog from '@/components/SettingsDialog';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { GuestAssignmentService } from '@/services/GuestAssignmentService';
import { FileProcessingService } from '@/services/FileProcessingService';
import { LanguageService } from '@/services/LanguageService';
import { toast } from '@/hooks/use-toast';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedFileContent, setProcessedFileContent] = useState<string>('');
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [unsavedQuestionnaires, setUnsavedQuestionnaires] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; questionnaireId: string; testName: string }>({
    open: false,
    questionnaireId: '',
    testName: ''
  });

  useEffect(() => {
    loadQuestionnaires();
    // Clean up old guest assignments periodically
    GuestAssignmentService.cleanupOldAssignments();
  }, []);

  // Process files immediately when they are uploaded
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      processFilesForContent(uploadedFiles);
    } else {
      setProcessedFileContent('');
    }
  }, [uploadedFiles]);

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

  const getSupportedFileTypes = () => {
    return {
      text: ['.txt', '.md', '.csv', '.pdf', '.doc', '.docx'],
      document: ['.pdf', '.doc', '.docx'],
      image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
      video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
      audio: ['.mp3', '.wav', '.ogg', '.m4a']
    };
  };

  const getFileCategory = (file: File): string => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) return 'document';
    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'document';
    if (fileName.endsWith('.csv')) return 'text';
    
    return 'other';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only admin users can upload files",
        variant: "destructive"
      });
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    console.log('Files uploaded:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    try {
      // Check file size for each file (50MB limit)
      const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "Error",
          description: `Files must be less than 50MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Validate file types
      const supportedTypes = getSupportedFileTypes();
      const allSupportedExtensions = Object.values(supportedTypes).flat();
      
      const unsupportedFiles = files.filter(file => {
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allSupportedExtensions.some(ext => fileName.endsWith(ext));
        const hasValidMimeType = file.type.startsWith('image/') || 
                                file.type.startsWith('video/') || 
                                file.type.startsWith('audio/') ||
                                file.type.startsWith('text/') ||
                                file.type === 'application/pdf';
        return !hasValidExtension && !hasValidMimeType;
      });

      if (unsupportedFiles.length > 0) {
        toast({
          title: "Unsupported Files",
          description: `Some files are not supported: ${unsupportedFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
      }

      // Add supported files
      const supportedFiles = files.filter(file => !unsupportedFiles.includes(file));
      if (supportedFiles.length > 0) {
        setUploadedFiles(prev => {
          const newFiles = [...prev, ...supportedFiles];
          console.log('Updated uploaded files state:', newFiles.map(f => f.name));
          return newFiles;
        });
        
        toast({
          title: "Success",
          description: `${supportedFiles.length} file(s) uploaded successfully and are being processed`,
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Error",
        description: "Error processing files",
        variant: "destructive"
      });
    } finally {
      // Clear the input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const processFilesForContent = async (files: File[]): Promise<void> => {
    if (files.length === 0) {
      setProcessedFileContent('');
      return;
    }

    console.log(`Starting file processing for ${files.length} files...`);
    setIsProcessingFiles(true);
    
    try {
      const filePromises = files.map(async (file) => {
        try {
          console.log(`Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
          const processedFile = await FileProcessingService.processFile(file);
          
          console.log(`Successfully processed ${file.name}:`, {
            type: processedFile.type,
            contentLength: processedFile.content.length,
            extractionMethod: processedFile.metadata.extractionMethod
          });
          
          return `=== File: ${file.name} ===
Type: ${processedFile.type}
Size: ${Math.round(file.size / 1024)}KB
Extraction Method: ${processedFile.metadata.extractionMethod}
Content:
${processedFile.content}

`;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return `=== File: ${file.name} ===
Error: Could not process file content - ${error instanceof Error ? error.message : 'Unknown error'}
Type: ${getFileCategory(file)}
Size: ${Math.round(file.size / 1024)}KB
Note: File processing failed, but file information is available.

`;
        }
      });
      
      const processedContents = await Promise.all(filePromises);
      const combinedContent = processedContents.join('\n');
      
      console.log(`File processing completed. Total content length: ${combinedContent.length} characters`);
      console.log('Combined file content preview:', combinedContent.substring(0, 500) + '...');
      
      setProcessedFileContent(combinedContent);
      
      toast({
        title: "Files Processed",
        description: `${files.length} file(s) processed successfully. Content is ready for course generation.`,
      });
    } catch (error) {
      console.error('Error during batch file processing:', error);
      const errorContent = `Error processing uploaded files: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setProcessedFileContent(errorContent);
      
      toast({
        title: "Processing Error",
        description: "Some files could not be processed, but generation will continue with available content.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      console.log('File removed. Remaining files:', newFiles.map(f => f.name));
      return newFiles;
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

    console.log('Generate button clicked with:', {
      prompt: prompt.trim(),
      uploadedFilesCount: uploadedFiles.length,
      processedContentLength: processedFileContent.length,
      hasFileContent: !!processedFileContent
    });

    setShowGenerateDialog(true);
  };

  const handleGenerateQuestionnaire = async (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number, timeframe: number, includeCourse: boolean, includeQuestionnaire: boolean, numberOfSets: number = 1) => {
    setIsGenerating(true);
    setShowGenerateDialog(false);
    
    console.log('Starting questionnaire generation with:', {
      testName,
      difficulty,
      numberOfQuestions,
      timeframe,
      includeCourse,
      includeQuestionnaire,
      numberOfSets,
      uploadedFilesCount: uploadedFiles.length,
      processedContentLength: processedFileContent.length,
      hasProcessedContent: !!processedFileContent.trim()
    });
    
    try {
      // Use the already processed file content
      const fileContentToUse = processedFileContent.trim();
      
      if (uploadedFiles.length > 0 && !fileContentToUse) {
        console.warn('Files uploaded but no processed content available, waiting for processing...');
        toast({
          title: "Processing Files",
          description: "Files are still being processed. Please wait a moment and try again.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }
      
      console.log('Using file content for generation:', {
        hasContent: !!fileContentToUse,
        contentLength: fileContentToUse.length,
        contentPreview: fileContentToUse.substring(0, 200) + '...'
      });
      
      // Generate multiple sets if requested
      const generatedQuestionnaires = [];
      
      for (let setIndex = 1; setIndex <= numberOfSets; setIndex++) {
        console.log(`Generating set ${setIndex} of ${numberOfSets}...`);
        
        const questionnaire = await QuestionnaireService.generateQuestionnaire(
          prompt,
          { testName, difficulty, numberOfQuestions, timeframe, includeCourse, includeQuestionnaire },
          fileContentToUse, // Pass the processed content directly
          setIndex,
          numberOfSets
        );
        
        // Add set information to the questionnaire
        questionnaire.setNumber = setIndex;
        questionnaire.totalSets = numberOfSets;
        
        generatedQuestionnaires.push(questionnaire);
        console.log(`Generated set ${setIndex} successfully:`, {
          id: questionnaire.id,
          questionsCount: questionnaire.questions?.length || 0
        });
      }
      
      // Store all generated questionnaires as unsaved
      setUnsavedQuestionnaires(prev => [...generatedQuestionnaires, ...prev]);
      setPrompt('');
      setUploadedFiles([]);
      setProcessedFileContent('');
      
      // Success message
      const successMessage = uploadedFiles.length > 0 
        ? `Generated ${numberOfSets} questionnaire set(s) with file content analysis from ${uploadedFiles.length} file(s)`
        : `Generated ${numberOfSets} questionnaire set(s) successfully`;
        
      toast({
        title: "Success",
        description: successMessage,
      });
      
      console.log('Generation completed successfully:', {
        generatedCount: generatedQuestionnaires.length,
        withFileContent: !!fileContentToUse
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Error",
        description: `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestionnaire = (updatedQuestionnaire: any) => {
    try {
      QuestionnaireService.saveQuestionnaire(updatedQuestionnaire);
      
      // Remove from unsaved questionnaires if it was there
      setUnsavedQuestionnaires(prev => prev.filter(q => q.id !== updatedQuestionnaire.id));
      
      // Reload saved questionnaires from localStorage
      loadQuestionnaires();
      
      // No success toast needed - keep it simple
    } catch (error) {
      console.error('Error updating questionnaire:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update questionnaire";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeleteRequest = (questionnaireId: string, testName: string) => {
    setDeleteDialog({
      open: true,
      questionnaireId,
      testName
    });
  };

  const handleDeleteConfirm = () => {
    try {
      // Try to delete from saved questionnaires first
      QuestionnaireService.deleteQuestionnaire(deleteDialog.questionnaireId);
      
      // Also remove from unsaved questionnaires if it exists there
      setUnsavedQuestionnaires(prev => prev.filter(q => q.id !== deleteDialog.questionnaireId));
      
      // Reload saved questionnaires
      loadQuestionnaires();
      
      setDeleteDialog({ open: false, questionnaireId: '', testName: '' });
      
      toast({
        title: "Success",
        description: "Test deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      toast({
        title: "Error",
        description: "Failed to delete questionnaire",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, questionnaireId: '', testName: '' });
  };

  // Filter questionnaires for guests to show only their assigned set
  const filterQuestionnairesForGuest = (questionnaires: any[]) => {
    if (user.role === 'admin') {
      return questionnaires;
    }

    // Group questionnaires by test name
    const testGroups: Record<string, any[]> = {};
    questionnaires.forEach(q => {
      const testKey = q.testName || q.title;
      if (!testGroups[testKey]) {
        testGroups[testKey] = [];
      }
      testGroups[testKey].push(q);
    });

    // For each test group, assign the guest to a specific set
    const filteredQuestionnaires: any[] = [];
    Object.entries(testGroups).forEach(([testName, testQuestionnaires]) => {
      if (testQuestionnaires.length > 1 && testQuestionnaires[0].totalSets > 1) {
        // This is a multi-set test
        const totalSets = testQuestionnaires[0].totalSets;
        const testId = testQuestionnaires[0].id.split('-')[0]; // Use base ID for assignment
        const assignedSetNumber = GuestAssignmentService.getGuestSetNumber(user.username, testId, totalSets);
        
        // Find the questionnaire for the assigned set
        const assignedQuestionnaire = testQuestionnaires.find(q => q.setNumber === assignedSetNumber);
        if (assignedQuestionnaire) {
          filteredQuestionnaires.push(assignedQuestionnaire);
        }
      } else {
        // Single set test, include all
        filteredQuestionnaires.push(...testQuestionnaires);
      }
    });

    return filteredQuestionnaires;
  };

  // Combine saved and unsaved questionnaires for display
  const allQuestionnaires = user.role === 'admin' 
    ? [...unsavedQuestionnaires, ...questionnaires]
    : questionnaires;

  // Filter questionnaires based on user role
  const filteredQuestionnaires = filterQuestionnairesForGuest(allQuestionnaires);

  // Ensure we have valid data before rendering
  const validQuestionnaires = filteredQuestionnaires.filter(q => q && typeof q === 'object');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        testName={deleteDialog.testName}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        userRole={user.role}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-2 rounded-lg shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-poppins">Questora AI</h1>
              <p className="text-sm text-slate-600 font-inter">{LanguageService.translate('dashboard.welcome')}, {user.username} ({LanguageService.translate(`dashboard.${user.role}`)})</p>
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
                  <span>{LanguageService.translate('nav.responses')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="flex items-center space-x-2 border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:border-violet-300 font-poppins rounded-lg"
                >
                  <Trophy className="h-4 w-4" />
                  <span>{LanguageService.translate('nav.leaderboard')}</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
              className="flex items-center space-x-2 border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:border-violet-300 font-poppins rounded-lg"
            >
              <Settings className="h-4 w-4" />
              <span>{LanguageService.translate('nav.settings')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="flex items-center space-x-2 border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:border-red-300 hover:text-red-600 font-poppins rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              <span>{LanguageService.translate('nav.logout')}</span>
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
              uploadedFiles={uploadedFiles}
              processedFileContent={processedFileContent}
              onGenerate={handleGenerateQuestionnaire}
              onCancel={() => setShowGenerateDialog(false)}
            />

            {/* Input Area - Only for Admin */}
            {user.role === 'admin' && !showGenerateDialog && (
              <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
                  <CardTitle className="text-slate-900 font-poppins">{LanguageService.translate('dashboard.generateContent')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <Label htmlFor="prompt" className="text-slate-700 font-medium font-poppins">{LanguageService.translate('dashboard.describeContent')}</Label>
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
                          multiple
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-2">
                              <Upload className="h-4 w-4 text-violet-600" />
                              <div className="flex flex-col">
                                <span className="text-sm text-violet-800 font-medium font-inter">{file.name}</span>
                                <span className="text-xs text-violet-600">
                                  {Math.round(file.size / 1024)}KB • {isProcessingFiles ? 'Processing...' : 'Processed'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        {processedFileContent && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 font-medium">
                              ✅ {uploadedFiles.length} file(s) processed successfully ({processedFileContent.length} characters extracted)
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleGenerateClick}
                    disabled={isGenerating || isProcessingFiles}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 rounded-lg font-poppins font-medium py-3"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{LanguageService.translate('common.generating')}</span>
                      </div>
                    ) : isProcessingFiles ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing Files...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span>{LanguageService.translate('common.generate')}</span>
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
                    {LanguageService.translate('dashboard.availableTests')}
                  </h3>
                  <p className="text-slate-600 font-inter">
                    {LanguageService.translate('dashboard.howToAnswer')}
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
                
                return (
                  <QuestionnaireDisplay 
                    key={questionnaireId} 
                    questionnaire={questionnaire}
                    isAdmin={user.role === 'admin'}
                    onUpdate={handleUpdateQuestionnaire}
                    onDelete={(id) => handleDeleteRequest(id, questionnaire.title || questionnaire.testName || 'Test')}
                  />
                );
              })}
              
              {validQuestionnaires.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                  <CardContent className="p-8 text-center">
                    <Bot className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 font-poppins">
                      {user.role === 'admin' ? 'No questionnaires yet' : LanguageService.translate('dashboard.noTests')}
                    </h3>
                    <p className="text-slate-600 font-inter">
                      {user.role === 'admin' 
                        ? "Enter a prompt above to generate your first questionnaire"
                        : LanguageService.translate('dashboard.noTestsDesc')
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
                  {user.role === 'admin' ? 'Admin Tips' : LanguageService.translate('dashboard.howToAnswer')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm p-6">
                {user.role === 'admin' ? (
                  <>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold text-blue-700 font-poppins">Upload files</p>
                      <p className="text-blue-600 font-inter">Click the paperclip icon to upload documents, images, or videos for content analysis</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-700 font-poppins">Save tests</p>
                      <p className="text-green-600 font-inter">After generating, click the save button to name your test and set difficulty</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg">
                      <p className="font-semibold text-purple-700 font-poppins">View responses</p>
                      <p className="text-purple-600 font-inter">Use the Responses tab to see guest submissions and statistics</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold text-blue-700 font-poppins">{LanguageService.translate('question.selectAnswer')}</p>
                      <p className="text-blue-600 font-inter">Click on any option to select it. Selected options will be highlighted in blue.</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-700 font-poppins">{LanguageService.translate('question.submitResponse')}</p>
                      <p className="text-green-600 font-inter">{LanguageService.translate('question.answerAll')}</p>
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
