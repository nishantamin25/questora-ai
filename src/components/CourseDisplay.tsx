import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GraduationCap, CheckCircle, Clock, FileText, Download, Edit, Save, X } from 'lucide-react';
import { PDFGenerationService } from '@/services/PDFGenerationService';
import { CourseService } from '@/services/CourseService';
import { Course, CourseMaterial } from '@/services/course/CourseTypes';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface CourseDisplayProps {
  course: Course;
  onCourseComplete: (courseId: string) => void;
  onCourseUpdate?: (updatedCourse: Course) => void;
  userRole?: 'admin' | 'guest';
}

const CourseDisplay = ({ course, onCourseComplete, onCourseUpdate, userRole = 'guest' }: CourseDisplayProps) => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState(course);
  const [combinedContent, setCombinedContent] = useState('');

  // Get the unified content string from course materials
  const getUnifiedContent = (materials: CourseMaterial[]) => {
    if (!materials || materials.length === 0) return '';
    
    // Simply join all content without any separators or headers - treat as one block
    return materials.map(material => material.content.trim()).join('\n\n').trim();
  };

  // Create a single material from unified content
  const createUnifiedMaterial = (content: string): CourseMaterial[] => {
    return [{
      id: 'unified-content',
      title: 'Course Content',
      content: content.trim(),
      type: 'text' as const,
      order: 1
    }];
  };

  // Load course progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(`course_progress_${course.id}`);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setIsEnrolled(progress.isEnrolled || false);
      setShowMaterial(progress.showMaterial || false);
      setCourseCompleted(progress.courseCompleted || false);
    }
  }, [course.id]);

  // Update edited course and combined content when course prop changes
  useEffect(() => {
    setEditedCourse(course);
    setCombinedContent(getUnifiedContent(course.materials));
  }, [course]);

  // Save course progress to localStorage
  const saveProgress = () => {
    const progress = {
      isEnrolled,
      showMaterial,
      courseCompleted
    };
    localStorage.setItem(`course_progress_${course.id}`, JSON.stringify(progress));
  };

  useEffect(() => {
    saveProgress();
  }, [isEnrolled, showMaterial, courseCompleted]);

  const handleEnroll = () => {
    setIsEnrolled(true);
    setShowMaterial(true);
    toast({
      title: "Enrolled Successfully",
      description: `You have enrolled in "${course.name}". Complete the course to unlock the test.`,
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    try {
      // Create a unified material from the combined content
      const newMaterials = createUnifiedMaterial(combinedContent);
      
      const updatedCourse: Course = {
        ...editedCourse,
        materials: newMaterials,
        id: course.id,
        createdAt: course.createdAt || new Date().toISOString(),
        difficulty: course.difficulty || 'medium',
        isActive: course.isActive !== undefined ? course.isActive : true
      };
      
      CourseService.saveCourse(updatedCourse);
      setIsEditing(false);
      
      if (onCourseUpdate) {
        onCourseUpdate(updatedCourse);
      }
      
      toast({
        title: "Course Updated",
        description: "Course has been successfully saved.",
      });
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save course changes.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCourse(course);
    setCombinedContent(getUnifiedContent(course.materials));
  };

  const handleMarkComplete = () => {
    setCourseCompleted(true);
    toast({
      title: "Course Completed!",
      description: "Congratulations! You can now access the test.",
    });
    onCourseComplete(course.id);
  };

  const handleDownloadPDF = () => {
    if (course.pdfUrl) {
      PDFGenerationService.downloadPDF(course.pdfUrl, course.name);
      toast({
        title: "PDF Downloaded",
        description: "Course material has been downloaded as PDF",
      });
    } else {
      const pdfUrl = PDFGenerationService.generateCoursePDF(course);
      PDFGenerationService.downloadPDF(pdfUrl, course.name);
      toast({
        title: "PDF Generated",
        description: "Course material has been generated and downloaded as PDF",
      });
    }
  };

  // Edit mode - Show unified content editor
  if (isEditing) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200 rounded-t-xl">
          <CardTitle className="text-slate-900 font-poppins flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <Input
                value={editedCourse.name}
                onChange={(e) => setEditedCourse({ ...editedCourse, name: e.target.value })}
                className="text-lg font-semibold border-none bg-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <Textarea
                value={editedCourse.description}
                onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Course Content</label>
              <p className="text-sm text-slate-600 mb-3">
                Edit the entire course content as one unified block. Use markdown formatting for better presentation.
              </p>
              <Textarea
                value={combinedContent}
                onChange={(e) => setCombinedContent(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
                placeholder="Enter your course content here using markdown formatting..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isEnrolled && userRole === 'guest') {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200 rounded-t-xl">
          <CardTitle className="text-slate-900 font-poppins flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span>{course.name}</span>
            </div>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-slate-700 font-inter">{course.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{course.estimatedTime} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>Comprehensive course material</span>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 text-sm font-medium">
                ⚠️ Course completion is required before you can access the test
              </p>
            </div>

            <Button
              onClick={handleEnroll}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 rounded-lg font-poppins font-medium py-3"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Enroll in Course
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin view or course overview
  if (userRole === 'admin' && !showMaterial) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200 rounded-t-xl">
          <CardTitle className="text-slate-900 font-poppins flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span>{course.name}</span>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </Button>
              <Button
                onClick={handleEdit}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
              <Button
                onClick={() => setShowMaterial(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Preview</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-slate-700 font-inter">{course.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{course.estimatedTime} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>Comprehensive course material</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showMaterial) {
    return null;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl mb-6">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200 rounded-t-xl">
        <CardTitle className="text-slate-900 font-poppins flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span>{course.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </Button>
            {userRole === 'admin' && (
              <Button
                onClick={handleEdit}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}
            {courseCompleted && (
              <div className="text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 min-h-[400px] max-h-[800px] overflow-y-auto">
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mb-4 mt-6">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold text-slate-800 mb-3 mt-5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium text-slate-800 mb-2 mt-4">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-base font-medium text-slate-700 mb-2 mt-3">{children}</h4>,
                  p: ({ children }) => <p className="mb-3 text-slate-700 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-slate-700">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-slate-700">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-200 pl-4 italic text-slate-600 mb-3 bg-blue-50 py-2">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto mb-3">
                      {children}
                    </pre>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
                  a: ({ href, children }) => (
                    <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="border-slate-300 my-6" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-3">
                      <table className="min-w-full border border-slate-300">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
                  th: ({ children }) => <th className="border border-slate-300 px-3 py-2 text-left font-medium text-slate-900">{children}</th>,
                  td: ({ children }) => <td className="border border-slate-300 px-3 py-2 text-slate-700">{children}</td>,
                }}
              >
                {combinedContent}
              </ReactMarkdown>
            </div>
          </div>

          <div className="flex justify-center items-center pt-4">
            {!courseCompleted ? (
              <Button
                onClick={handleMarkComplete}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Course Complete
              </Button>
            ) : (
              <Button
                disabled
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Course Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseDisplay;
