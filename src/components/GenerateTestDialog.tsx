
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, X, Key, Bot, GraduationCap, FileText, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ChatGPTService } from '@/services/ChatGPTService';
import ChatGPTKeyDialog from './ChatGPTKeyDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GenerateTestDialogProps {
  open: boolean;
  prompt: string;
  uploadedFiles: File[];
  onGenerate: (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number, timeframe: number, includeCourse: boolean, includeQuestionnaire: boolean) => void;
  onCancel: () => void;
}

const GenerateTestDialog = ({ open, prompt, uploadedFiles, onGenerate, onCancel }: GenerateTestDialogProps) => {
  const [testName, setTestName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(15);
  const [timeframe, setTimeframe] = useState(20);
  const [includeCourse, setIncludeCourse] = useState(false);
  const [includeQuestionnaire, setIncludeQuestionnaire] = useState(true);
  const [showChatGPTKeyDialog, setShowChatGPTKeyDialog] = useState(false);
  const [hasChatGPTKey, setHasChatGPTKey] = useState(false);
  const [contentType, setContentType] = useState<'questionnaires' | 'course' | 'both'>('questionnaires');

  // Check if course can be enabled based on uploaded files - more inclusive logic
  const canEnableCourse = uploadedFiles.length > 0 && uploadedFiles.some(file => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    console.log('Checking file for course capability:', fileName, fileType);
    
    // More inclusive file type checking
    const isValidFile = (
      // Image files
      fileType.startsWith('image/') ||
      fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ||
      
      // Video files
      fileType.startsWith('video/') ||
      fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i) ||
      
      // Audio files
      fileType.startsWith('audio/') ||
      fileName.match(/\.(mp3|wav|ogg|m4a|flac)$/i) ||
      
      // Document files
      fileType === 'application/pdf' ||
      fileName.match(/\.pdf$/i) ||
      fileName.match(/\.(doc|docx)$/i) ||
      fileType.includes('document') ||
      
      // Text files
      fileType.startsWith('text/') ||
      fileName.match(/\.(txt|md|csv|rtf)$/i) ||
      
      // Any file with content that we can attempt to read
      file.size > 0
    );
    
    console.log('File valid for course:', fileName, isValidFile);
    return isValidFile;
  });

  console.log('Can enable course:', canEnableCourse, 'Files:', uploadedFiles.length);

  // Update checkboxes based on content type selection
  useEffect(() => {
    console.log('Content type changed to:', contentType, 'Can enable course:', canEnableCourse);
    
    switch (contentType) {
      case 'questionnaires':
        setIncludeQuestionnaire(true);
        setIncludeCourse(false);
        break;
      case 'course':
        if (canEnableCourse) {
          setIncludeQuestionnaire(false);
          setIncludeCourse(true);
        } else {
          // Fallback to questionnaires if course can't be enabled
          setContentType('questionnaires');
          setIncludeQuestionnaire(true);
          setIncludeCourse(false);
          toast({
            title: "Course Not Available",
            description: "Upload files (images, videos, documents) to enable course generation",
            variant: "destructive"
          });
        }
        break;
      case 'both':
        setIncludeQuestionnaire(true);
        setIncludeCourse(canEnableCourse);
        if (!canEnableCourse) {
          toast({
            title: "Course Not Available", 
            description: "Upload files to enable course generation. Only questionnaires will be generated.",
            variant: "destructive"
          });
        }
        break;
    }
  }, [contentType, canEnableCourse]);

  // Calculate timeframe based on number of questions using specified mapping
  useEffect(() => {
    if (includeQuestionnaire) {
      const getTimeframeForQuestions = (questions: number): number => {
        if (questions <= 10) return 15;
        if (questions <= 15) return 20;
        if (questions <= 20) return 25;
        if (questions <= 25) return 30;
        if (questions <= 30) return 35;
        if (questions <= 40) return 45;
        return 50; // 50 questions
      };

      const calculatedTimeframe = getTimeframeForQuestions(numberOfQuestions);
      setTimeframe(calculatedTimeframe);
    }
  }, [numberOfQuestions, includeQuestionnaire]);

  // Check if ChatGPT API key exists
  useEffect(() => {
    const apiKey = ChatGPTService.getApiKey();
    setHasChatGPTKey(!!apiKey);
  }, []);

  const handleChatGPTKeySet = (apiKey: string) => {
    ChatGPTService.setApiKey(apiKey);
    setHasChatGPTKey(true);
    setShowChatGPTKeyDialog(false);
  };

  const handleGenerate = () => {
    if (!testName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test name",
        variant: "destructive"
      });
      return;
    }

    if (!includeCourse && !includeQuestionnaire) {
      toast({
        title: "Error",
        description: "Please select at least one content type",
        variant: "destructive"
      });
      return;
    }

    // Additional validation for course generation
    if (includeCourse && uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please upload files to generate course content",
        variant: "destructive"
      });
      return;
    }

    if (includeQuestionnaire && (numberOfQuestions < 10 || numberOfQuestions > 50)) {
      toast({
        title: "Error",
        description: "Number of questions must be between 10 and 50",
        variant: "destructive"
      });
      return;
    }

    if (includeQuestionnaire && (timeframe < 5 || timeframe > 180)) {
      toast({
        title: "Error",
        description: "Timeframe must be between 5 and 180 minutes",
        variant: "destructive"
      });
      return;
    }

    console.log('Generating with final options:', {
      testName: testName.trim(),
      difficulty,
      numberOfQuestions,
      timeframe,
      includeCourse,
      includeQuestionnaire,
      uploadedFilesCount: uploadedFiles.length
    });

    onGenerate(testName.trim(), difficulty, numberOfQuestions, timeframe, includeCourse, includeQuestionnaire);
  };

  const getRecommendedTimeframe = (questions: number): number => {
    if (questions <= 10) return 15;
    if (questions <= 15) return 20;
    if (questions <= 20) return 25;
    if (questions <= 25) return 30;
    if (questions <= 30) return 35;
    if (questions <= 40) return 45;
    return 50; // 50 questions
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center space-x-2 font-poppins text-lg">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span>Generate Content</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* ChatGPT Integration Status */}
            <div className={`p-4 rounded-xl border ${hasChatGPTKey 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className={`h-5 w-5 ${hasChatGPTKey ? 'text-green-600' : 'text-orange-600'}`} />
                  <div>
                    <p className={`font-medium text-sm ${hasChatGPTKey ? 'text-green-700' : 'text-orange-700'}`}>
                      {hasChatGPTKey ? 'ChatGPT Integration Active' : 'ChatGPT Integration Available'}
                    </p>
                    <p className={`text-xs ${hasChatGPTKey ? 'text-green-600' : 'text-orange-600'}`}>
                      {hasChatGPTKey 
                        ? 'Questions will be generated using ChatGPT for better relevance' 
                        : 'Setup ChatGPT for more relevant questions'
                      }
                    </p>
                  </div>
                </div>
                {!hasChatGPTKey && (
                  <Button
                    onClick={() => setShowChatGPTKeyDialog(true)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Setup
                  </Button>
                )}
              </div>
            </div>

            {/* Content Type Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 font-medium font-poppins mb-3 block">Content Type</Label>
                <Select value={contentType} onValueChange={(value: 'questionnaires' | 'course' | 'both') => setContentType(value)}>
                  <SelectTrigger className="w-full border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg bg-white">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-[100]">
                    <SelectItem value="questionnaires">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-violet-600" />
                        <span>Questionnaires Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="course" disabled={!canEnableCourse}>
                      <div className="flex items-center space-x-2">
                        <GraduationCap className={`h-4 w-4 ${canEnableCourse ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={canEnableCourse ? '' : 'text-gray-400'}>Course Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="both" disabled={!canEnableCourse}>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <GraduationCap className={`h-4 w-4 ${canEnableCourse ? 'text-blue-600' : 'text-gray-400'}`} />
                          <FileText className="h-4 w-4 text-violet-600" />
                        </div>
                        <span className={canEnableCourse ? '' : 'text-gray-400'}>Course + Questionnaires</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  {!canEnableCourse && uploadedFiles.length === 0 && "Upload files to enable course generation"}
                  {!canEnableCourse && uploadedFiles.length > 0 && "Files uploaded but not suitable for course generation"}
                  {canEnableCourse && uploadedFiles.length > 0 && `${uploadedFiles.length} file(s) uploaded and ready for course generation`}
                </p>
              </div>

              <div>
                <Label htmlFor="testName" className="text-slate-700 font-medium font-poppins">Test Name</Label>
                <Input
                  id="testName"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Enter a name for this test"
                  className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg font-inter"
                />
              </div>

              <div>
                <Label htmlFor="difficulty" className="text-slate-700 font-medium font-poppins">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
                  <SelectTrigger className="mt-1 border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg bg-white">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-[100]">
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {includeQuestionnaire && (
                <>
                  <div>
                    <Label htmlFor="numberOfQuestions" className="text-slate-700 font-medium font-poppins">Number of Questions</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full mt-1 justify-between border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg bg-white"
                        >
                          {numberOfQuestions} questions
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full bg-white border border-slate-200 shadow-lg z-[100]">
                        {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
                          <DropdownMenuItem 
                            key={num} 
                            onClick={() => setNumberOfQuestions(num)}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            {num} questions
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-xs text-slate-500 mt-1">Choose between 10 and 50 questions</p>
                  </div>

                  <div>
                    <Label htmlFor="timeframe" className="text-slate-700 font-medium font-poppins">Timeframe (minutes)</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full mt-1 justify-between border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg bg-white"
                        >
                          {timeframe} minutes
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full bg-white border border-slate-200 shadow-lg z-[100]">
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 90, 120, 150, 180].map((time) => (
                          <DropdownMenuItem 
                            key={time} 
                            onClick={() => setTimeframe(time)}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            {time} minutes
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-xs text-slate-500 mt-1">Recommended: {getRecommendedTimeframe(numberOfQuestions)} minutes for {numberOfQuestions} questions</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-3 pt-4 border-t border-slate-200">
              <Button 
                onClick={handleGenerate} 
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 flex-1 rounded-lg font-poppins font-medium"
                disabled={!testName.trim() || (!includeCourse && !includeQuestionnaire)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate Content
              </Button>
              <Button onClick={onCancel} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChatGPTKeyDialog
        open={showChatGPTKeyDialog}
        onKeySet={handleChatGPTKeySet}
        onCancel={() => setShowChatGPTKeyDialog(false)}
      />
    </>
  );
};

export default GenerateTestDialog;
