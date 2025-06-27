
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Image, Video, Music, File, CheckCircle, AlertCircle } from 'lucide-react';

interface GenerateTestDialogProps {
  open: boolean;
  prompt: string;
  uploadedFiles: File[];
  processedFileContent?: string;
  onGenerate: (testName: string, difficulty: 'easy' | 'medium' | 'hard', numberOfQuestions: number, timeframe: number, includeCourse: boolean, includeQuestionnaire: boolean, numberOfSets: number) => void;
  onCancel: () => void;
}

const GenerateTestDialog = ({ 
  open, 
  prompt, 
  uploadedFiles, 
  processedFileContent = '',
  onGenerate, 
  onCancel 
}: GenerateTestDialogProps) => {
  const [testName, setTestName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [timeframe, setTimeframe] = useState(15);
  const [includeCourse, setIncludeCourse] = useState(false);
  const [includeQuestionnaire, setIncludeQuestionnaire] = useState(true);
  const [numberOfSets, setNumberOfSets] = useState(1);
  const [contentType, setContentType] = useState<'questionnaire' | 'course' | 'both'>('questionnaire');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTestName('');
      setDifficulty('medium');
      setNumberOfQuestions(10);
      setTimeframe(15);
      setIncludeCourse(false);
      setIncludeQuestionnaire(true);
      setNumberOfSets(1);
      setContentType('questionnaire');
    }
  }, [open]);

  // Update content type based on switches
  useEffect(() => {
    if (includeCourse && includeQuestionnaire) {
      setContentType('both');
    } else if (includeCourse) {
      setContentType('course');
    } else {
      setContentType('questionnaire');
    }
  }, [includeCourse, includeQuestionnaire]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (file.type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (file.type === 'application/pdf' || file.type.startsWith('text/')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const canEnableCourse = uploadedFiles.length > 0 && processedFileContent.length > 0;

  console.log('Course enablement check:', {
    totalFiles: uploadedFiles.length,
    canEnableCourse,
    fileDetails: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
  });

  console.log('Content type changed to:', contentType, 'Can enable course:', canEnableCourse);

  const handleGenerate = () => {
    if (!testName.trim()) {
      return;
    }

    console.log('Generating with processed content:', {
      testName,
      difficulty,
      numberOfQuestions,
      timeframe,
      includeCourse,
      includeQuestionnaire,
      numberOfSets,
      hasProcessedContent: !!processedFileContent,
      processedContentLength: processedFileContent.length
    });

    onGenerate(testName, difficulty, numberOfQuestions, timeframe, includeCourse, includeQuestionnaire, numberOfSets);
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Test Content</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Attachment Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium text-slate-700">Attach Files</Label>
                <Upload className="h-5 w-5 text-slate-500" />
              </div>
              
              {uploadedFiles.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-2">Upload files to generate questions from your content</p>
                  <p className="text-xs text-slate-500">Supported formats: PDF, DOC, TXT, CSV, and more</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">
                      {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                    </span>
                    <div className="flex items-center space-x-1">
                      {processedFileContent.length > 0 ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600">Processed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-xs text-amber-600">Processing...</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border">
                        {getFileIcon(file)}
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-slate-500">{Math.round(file.size / 1024)}KB</span>
                      </div>
                    ))}
                  </div>
                  
                  {processedFileContent.length > 0 && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-green-700">
                        ✅ Content extracted successfully ({processedFileContent.length} characters)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Enter test name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="questions">Number of Questions</Label>
              <Select value={numberOfQuestions.toString()} onValueChange={(value) => setNumberOfQuestions(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                  <SelectItem value="25">25 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeframe">Time Limit (minutes)</Label>
              <Select value={timeframe.toString()} onValueChange={(value) => setTimeframe(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sets">Number of Sets</Label>
              <Select value={numberOfSets.toString()} onValueChange={(value) => setNumberOfSets(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Set</SelectItem>
                  <SelectItem value="2">2 Sets</SelectItem>
                  <SelectItem value="3">3 Sets</SelectItem>
                  <SelectItem value="4">4 Sets</SelectItem>
                  <SelectItem value="5">5 Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Type Selection */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <Label className="text-base font-medium">Content Type</Label>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="questionnaire-switch" className="text-sm font-medium">
                    Generate Questionnaire
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Create questions based on the content
                  </p>
                </div>
                <Switch
                  id="questionnaire-switch"
                  checked={includeQuestionnaire}
                  onCheckedChange={setIncludeQuestionnaire}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="course-switch" className="text-sm font-medium">
                    Generate Course
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    {canEnableCourse ? 'Create learning materials from uploaded files' : 'Upload files to enable course generation'}
                  </p>
                </div>
                <Switch
                  id="course-switch"
                  checked={includeCourse}
                  onCheckedChange={setIncludeCourse}
                  disabled={!canEnableCourse}
                />
              </div>

              {!canEnableCourse && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      Course generation requires uploaded files with processed content
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!testName.trim() || (!includeCourse && !includeQuestionnaire)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Generate {contentType === 'both' ? 'Course & Test' : contentType === 'course' ? 'Course' : 'Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateTestDialog;
