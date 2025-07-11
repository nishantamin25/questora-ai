
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
import CourseDisplay from '@/components/CourseDisplay';
import GenerateTestDialog from '@/components/GenerateTestDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SettingsDialog from '@/components/SettingsDialog';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { CourseService } from '@/services/CourseService';
import { GuestAssignmentService } from '@/services/GuestAssignmentService';
import { GuestFilterService } from '@/services/GuestFilterService';
import { FileProcessingService } from '@/services/FileProcessingService';
import { LanguageService } from '@/services/LanguageService';
import { toast } from '@/hooks/use-toast';
import CourseCard from '@/components/CourseCard';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onRefresh?: () => void;
}

const Dashboard = ({ user, onLogout, onRefresh }: DashboardProps) => {
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedFileContent, setProcessedFileContent] = useState<string>('');
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [unsavedQuestionnaires, setUnsavedQuestionnaires] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
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
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editedCourse, setEditedCourse] = useState<any>(null);

  useEffect(() => {
    loadQuestionnaires();
    loadCourses();
    loadCompletedCourses();
    cleanupOldAssignments();
  }, []);

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      processFilesForContent(uploadedFiles);
    } else {
      setProcessedFileContent('');
    }
  }, [uploadedFiles]);

  const loadQuestionnaires = async () => {
    try {
      if (user.role === 'admin') {
        const allQuestionnaires = await QuestionnaireService.getAllQuestionnaires();
        console.log('Admin questionnaires loaded:', allQuestionnaires);
        setQuestionnaires(Array.isArray(allQuestionnaires) ? allQuestionnaires : []);
      } else {
        const activeQuestionnaires = await QuestionnaireService.getActiveQuestionnaires();
        console.log('Guest questionnaires loaded:', activeQuestionnaires);
        setQuestionnaires(Array.isArray(activeQuestionnaires) ? activeQuestionnaires : []);
      }
    } catch (error) {
      console.error('Error loading questionnaires:', error);
      setQuestionnaires([]);
    }
  };

  const loadCourses = () => {
    try {
      const allCourses = CourseService.getAllCourses();
      console.log('Courses loaded:', allCourses);
      setCourses(Array.isArray(allCourses) ? allCourses : []);
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
  };

  const loadCompletedCourses = () => {
    try {
      const completed = localStorage.getItem(`completed_courses_${user.username}`);
      if (completed) {
        setCompletedCourses(new Set(JSON.parse(completed)));
      }
    } catch (error) {
      console.error('Error loading completed courses:', error);
    }
  };

  const handleCourseComplete = (courseId: string) => {
    const newCompleted = new Set(completedCourses);
    newCompleted.add(courseId);
    setCompletedCourses(newCompleted);
    
    localStorage.setItem(`completed_courses_${user.username}`, JSON.stringify(Array.from(newCompleted)));
    
    console.log(`Course ${courseId} completed by ${user.username}`, newCompleted);
  };

  // Course management functions
  const handleCourseEditToggle = (courseId: string) => {
    if (editingCourseId === courseId) {
      // Save the changes
      if (editedCourse) {
        try {
          CourseService.saveCourse(editedCourse);
          loadCourses();
          toast({
            title: "Success",
            description: "Course updated successfully!",
          });
        } catch (error) {
          console.error('Error saving course:', error);
          toast({
            title: "Error",
            description: "Failed to save course changes",
            variant: "destructive"
          });
        }
      }
      setEditingCourseId(null);
      setEditedCourse(null);
    } else {
      // Start editing
      const courseToEdit = courses.find(c => c.id === courseId);
      if (courseToEdit) {
        setEditingCourseId(courseId);
        setEditedCourse({ ...courseToEdit });
      }
    }
  };

  const handleCourseCancelEdit = () => {
    setEditingCourseId(null);
    setEditedCourse(null);
  };

  const handleCourseActiveToggle = (checked: boolean) => {
    if (editedCourse) {
      setEditedCourse({ ...editedCourse, isActive: checked });
    }
  };

  const handleCourseDelete = (courseId: string) => {
    try {
      CourseService.deleteCourse(courseId);
      loadCourses();
      toast({
        title: "Success",
        description: "Course deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive"
      });
    }
  };

  const handleCourseSave = (course: any) => {
    try {
      CourseService.saveCourse(course);
      loadCourses();
      toast({
        title: "Success",
        description: "Course saved successfully!",
      });
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Error",
        description: "Failed to save course",
        variant: "destructive"
      });
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
      const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "Error",
          description: `Files must be less than 50MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
        return;
      }

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
        description: `${files.length} file(s) processed successfully. Content is ready for course and test generation.`,
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

    console.log('Generate button clicked, opening dialog with:', {
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
      
      let generatedCourse = null;
      if (includeCourse && (fileContentToUse.length > 50 || uploadedFiles.length > 0)) {
        console.log('Generating course...');
        generatedCourse = await CourseService.generateCourse(
          "Generate course content from uploaded files",
          uploadedFiles,
          fileContentToUse,
          testName
        );
        CourseService.saveCourse(generatedCourse);
        loadCourses();
        console.log('Course generated and saved:', generatedCourse.id);
      }
      
      const generatedQuestionnaires = [];
      
      if (includeQuestionnaire) {
        for (let setIndex = 1; setIndex <= numberOfSets; setIndex++) {
          console.log(`Generating questionnaire set ${setIndex} of ${numberOfSets}...`);
          
          const questionnaire = await QuestionnaireService.generateQuestionnaire(
            "Generate questions from uploaded files",
            { testName, difficulty, numberOfQuestions, timeframe, includeCourse: false, includeQuestionnaire: true },
            fileContentToUse,
            setIndex,
            numberOfSets
          );
          
          questionnaire.setNumber = setIndex;
          questionnaire.totalSets = numberOfSets;
          
          if (generatedCourse) {
            questionnaire.course = generatedCourse;
          }
          
          generatedQuestionnaires.push(questionnaire);
          console.log(`Generated questionnaire set ${setIndex} successfully:`, {
            id: questionnaire.id,
            questionsCount: questionnaire.questions?.length || 0
          });
        }
      }
      
      if (generatedQuestionnaires.length > 0) {
        setUnsavedQuestionnaires(prev => [...generatedQuestionnaires, ...prev]);
      }
      
      setUploadedFiles([]);
      setProcessedFileContent('');
      
      let successMessage = '';
      if (generatedCourse && generatedQuestionnaires.length > 0) {
        successMessage = `Generated course and ${generatedQuestionnaires.length} questionnaire set(s) with file content analysis`;
      } else if (generatedCourse) {
        successMessage = 'Generated course with file content analysis';
      } else if (generatedQuestionnaires.length > 0) {
        successMessage = `Generated ${generatedQuestionnaires.length} questionnaire set(s)`;
      }
      
      if (uploadedFiles.length > 0) {
        successMessage += ` from ${uploadedFiles.length} file(s)`;
      }
        
      toast({
        title: "Success",
        description: successMessage,
      });
      
      console.log('Generation completed successfully:', {
        courseGenerated: !!generatedCourse,
        questionnaireCount: generatedQuestionnaires.length,
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
      setUnsavedQuestionnaires(prev => prev.filter(q => q.id !== updatedQuestionnaire.id));
      loadQuestionnaires();
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
      QuestionnaireService.deleteQuestionnaire(deleteDialog.questionnaireId);
      setUnsavedQuestionnaires(prev => prev.filter(q => q.id !== deleteDialog.questionnaireId));
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

  const cleanupOldAssignments = async () => {
    try {
      await GuestAssignmentService.cleanupOldAssignments();
    } catch (error) {
      console.error('Error cleaning up old assignments:', error);
    }
  };

  const filterQuestionnairesForGuest = async (questionnaires: any[]) => {
    if (user.role === 'admin') {
      return questionnaires;
    }

    // First, filter out completed questionnaires for guest users
    const uncompletedQuestionnaires = GuestFilterService.filterCompletedQuestionnaires(questionnaires, user);

    const testGroups: Record<string, any[]> = {};
    uncompletedQuestionnaires.forEach(q => {
      const testKey = q.testName || q.title;
      if (!testGroups[testKey]) {
        testGroups[testKey] = [];
      }
      testGroups[testKey].push(q);
    });

    const filteredQuestionnaires: any[] = [];
    
    for (const [testName, testQuestionnaires] of Object.entries(testGroups)) {
      if (testQuestionnaires.length > 1 && testQuestionnaires[0].totalSets > 1) {
        const totalSets = testQuestionnaires[0].totalSets;
        const testId = testQuestionnaires[0].id.split('-')[0];
        const assignedSetNumber = await GuestAssignmentService.getGuestSetNumber(user.username, testId, totalSets);
        const assignedQuestionnaire = testQuestionnaires.find(q => q.setNumber === assignedSetNumber);
        if (assignedQuestionnaire) {
          filteredQuestionnaires.push(assignedQuestionnaire);
        }
      } else {
        filteredQuestionnaires.push(...testQuestionnaires);
      }
    }

    return filteredQuestionnaires;
  };

  const [filteredQuestionnaires, setFilteredQuestionnaires] = useState<any[]>([]);

  useEffect(() => {
    const filterQuestionnaires = async () => {
      const allQuestionnaires = user.role === 'admin' 
        ? [...unsavedQuestionnaires, ...questionnaires]
        : questionnaires;

      const filtered = await filterQuestionnairesForGuest(allQuestionnaires);
      const validQuestionnaires = filtered.filter(q => q && typeof q === 'object');
      
      // For guest users, filter out questionnaires that have associated courses which haven't been completed
      const accessibleQuestionnaires = user.role === 'admin' 
        ? validQuestionnaires 
        : validQuestionnaires.filter(q => {
            // If questionnaire has an associated course, check if it's completed
            if (q.courseContent || q.course) {
              const courseId = q.courseContent?.id || q.course?.id;
              if (courseId) {
                return completedCourses.has(courseId);
              }
            }
            // If no associated course, questionnaire is accessible
            return true;
          });

      setFilteredQuestionnaires(accessibleQuestionnaires);
    };

    filterQuestionnaires();
  }, [questionnaires, unsavedQuestionnaires, user.role, completedCourses]);

  const validQuestionnaires = filteredQuestionnaires;
  const accessibleQuestionnaires = filteredQuestionnaires;

  const handleQuestionnaireRefresh = () => {
    loadQuestionnaires();
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        testName={deleteDialog.testName}
      />

      <SettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        userRole={user.role}
      />

      <GenerateTestDialog
        open={showGenerateDialog}
        uploadedFiles={uploadedFiles}
        processedFileContent={processedFileContent}
        onGenerate={handleGenerateQuestionnaire}
        onCancel={() => setShowGenerateDialog(false)}
      />

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
          <div className="lg:col-span-2">
            {user.role === 'admin' && showResponses && (
              <div className="mb-6">
                <ResponseManagement />
              </div>
            )}

            {user.role === 'admin' && showLeaderboard && (
              <div className="mb-6">
                <Leaderboard />
              </div>
            )}

            {user.role === 'admin' && (
              <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 rounded-t-xl">
                  <CardTitle className="text-slate-900 font-poppins">{LanguageService.translate('dashboard.generateContent')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <Label htmlFor="file-upload" className="text-slate-700 font-medium font-poppins">Upload Files</Label>
                    <div className="mt-1">
                      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-violet-400 transition-colors">
                        <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600 mb-2 font-inter">
                          Click to upload files or drag and drop
                        </p>
                        <p className="text-sm text-slate-500 font-inter">
                          Supports PDF, Word, text, images, videos, and audio files (max 50MB each)
                        </p>
                        <input
                          id="file-upload"
                          type="file"
                          onChange={handleFileUpload}
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
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
                  
                  <div className="relative z-10">
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
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Courses Section */}
            {courses.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 font-poppins">
                  {user.role === 'admin' ? 'Generated Courses' : 'Available Courses'}
                </h3>
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isAdmin={user.role === 'admin'}
                    onUpdate={handleCourseSave}
                    onDelete={handleCourseDelete}
                    onComplete={handleCourseComplete}
                    isCompleted={completedCourses.has(course.id)}
                  />
                ))}
              </div>
            )}

            {/* Tests Section */}
            <div className="space-y-4">
              {accessibleQuestionnaires.map((questionnaire, index) => {
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
                    onRefresh={handleQuestionnaireRefresh}
                  />
                );
              })}
              
              {user.role === 'guest' && (
                (() => {
                  // Calculate how many questionnaires are locked due to incomplete courses
                  const allQuestionnaires = questionnaires.filter(q => q && typeof q === 'object');
                  const lockedCount = allQuestionnaires.filter(q => {
                    if (q.courseContent || q.course) {
                      const courseId = q.courseContent?.id || q.course?.id;
                      if (courseId) {
                        return !completedCourses.has(courseId);
                      }
                    }
                    return false;
                  }).length;

                  return lockedCount > 0 ? (
                    <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
                            <h4 className="font-medium text-orange-800 mb-2">🔒 Additional Tests Available</h4>
                            <p className="text-orange-700 text-sm">
                              Complete the course above to unlock additional tests.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null;
                })()
              )}
              
              {validQuestionnaires.length === 0 && courses.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
                  <CardContent className="p-8 text-center">
                    <Bot className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 font-poppins">
                      {user.role === 'admin' ? 'No content yet' : LanguageService.translate('dashboard.noTests')}
                    </h3>
                    <p className="text-slate-600 font-inter">
                      {user.role === 'admin' 
                        ? "Upload files above to generate your first course and questionnaire"
                        : LanguageService.translate('dashboard.noTestsDesc')
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

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
                      <p className="text-blue-600 font-inter">Upload documents, images, or videos for content analysis and generation</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-700 font-poppins">Generate courses</p>
                      <p className="text-green-600 font-inter">Enable course generation to create structured learning materials with PDF download</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg">
                      <p className="font-semibold text-purple-700 font-poppins">View responses</p>
                      <p className="text-purple-600 font-inter">Use the Responses tab to see guest submissions and statistics</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold text-blue-700 font-poppins">Complete courses first</p>
                      <p className="text-blue-600 font-inter">You must complete the course before you can access the test</p>
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
