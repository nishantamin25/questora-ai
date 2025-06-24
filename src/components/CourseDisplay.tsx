
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Play, CheckCircle, Clock, FileText, Image, Video, Download } from 'lucide-react';
import { PDFGenerationService } from '@/services/PDFGenerationService';
import { toast } from '@/hooks/use-toast';

interface CourseDisplayProps {
  course: {
    id: string;
    name: string;
    description: string;
    materials: Array<{
      type: 'text' | 'image' | 'video';
      content: string;
      title: string;
    }>;
    estimatedTime: number;
    pdfUrl?: string;
  };
  onCourseComplete: (courseId: string) => void;
  userRole?: 'admin' | 'guest';
}

const CourseDisplay = ({ course, onCourseComplete, userRole = 'guest' }: CourseDisplayProps) => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
  const [completedMaterials, setCompletedMaterials] = useState<Set<number>>(new Set());
  const [showMaterial, setShowMaterial] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);

  // Load course progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(`course_progress_${course.id}`);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setIsEnrolled(progress.isEnrolled || false);
      setCurrentMaterialIndex(progress.currentMaterialIndex || 0);
      setCompletedMaterials(new Set(progress.completedMaterials || []));
      setShowMaterial(progress.showMaterial || false);
      setCourseCompleted(progress.courseCompleted || false);
    }
  }, [course.id]);

  // Save course progress to localStorage
  const saveProgress = () => {
    const progress = {
      isEnrolled,
      currentMaterialIndex,
      completedMaterials: Array.from(completedMaterials),
      showMaterial,
      courseCompleted
    };
    localStorage.setItem(`course_progress_${course.id}`, JSON.stringify(progress));
  };

  useEffect(() => {
    saveProgress();
  }, [isEnrolled, currentMaterialIndex, completedMaterials, showMaterial, courseCompleted]);

  const handleEnroll = () => {
    setIsEnrolled(true);
    setShowMaterial(true);
    toast({
      title: "Enrolled Successfully",
      description: `You have enrolled in "${course.name}". Complete all materials to unlock the test.`,
    });
  };

  const handleMaterialComplete = () => {
    const newCompleted = new Set(completedMaterials);
    newCompleted.add(currentMaterialIndex);
    setCompletedMaterials(newCompleted);

    if (newCompleted.size === course.materials.length) {
      // Course completed
      setCourseCompleted(true);
      toast({
        title: "Course Completed!",
        description: "Congratulations! You can now access the test.",
      });
      onCourseComplete(course.id);
    } else if (currentMaterialIndex < course.materials.length - 1) {
      setCurrentMaterialIndex(currentMaterialIndex + 1);
    }
  };

  const handleNextMaterial = () => {
    if (currentMaterialIndex < course.materials.length - 1) {
      setCurrentMaterialIndex(currentMaterialIndex + 1);
    }
  };

  const handlePreviousMaterial = () => {
    if (currentMaterialIndex > 0) {
      setCurrentMaterialIndex(currentMaterialIndex - 1);
    }
  };

  const handleDownloadPDF = () => {
    if (course.pdfUrl) {
      PDFGenerationService.downloadPDF(course.pdfUrl, course.name);
      toast({
        title: "PDF Downloaded",
        description: "Course material has been downloaded as PDF",
      });
    } else {
      // Generate PDF on demand if not available
      const pdfUrl = PDFGenerationService.generateCoursePDF(course);
      PDFGenerationService.downloadPDF(pdfUrl, course.name);
      toast({
        title: "PDF Generated",
        description: "Course material has been generated and downloaded as PDF",
      });
    }
  };

  const progress = (completedMaterials.size / course.materials.length) * 100;
  const currentMaterial = course.materials[currentMaterialIndex];

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

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
                <span>{course.materials.length} materials</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Course Materials</h4>
              <div className="space-y-2">
                {course.materials.map((material, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-blue-700">
                    {getMaterialIcon(material.type)}
                    <span>{material.title}</span>
                  </div>
                ))}
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
                onClick={() => setShowMaterial(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Play className="h-4 w-4" />
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
                <span>{course.materials.length} materials</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Course Materials</h4>
              <div className="space-y-2">
                {course.materials.map((material, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-blue-700">
                    {getMaterialIcon(material.type)}
                    <span>{material.title}</span>
                  </div>
                ))}
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
            <div className="text-sm text-slate-600">
              {currentMaterialIndex + 1} of {course.materials.length}
            </div>
          </div>
        </CardTitle>
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-600 mt-1">
            {Math.round(progress)}% completed
            {courseCompleted && <span className="text-green-600 ml-2">✓ Course Complete</span>}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            {getMaterialIcon(currentMaterial.type)}
            <h3 className="font-medium text-slate-900">{currentMaterial.title}</h3>
            {completedMaterials.has(currentMaterialIndex) && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
            {currentMaterial.type === 'image' && (
              <div className="text-center">
                <Image className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Image: {currentMaterial.title}</p>
                <div className="text-sm text-slate-700 mt-4 text-left">
                  <div className="prose prose-sm max-w-none">
                    {currentMaterial.content.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-2">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {currentMaterial.type === 'video' && (
              <div className="text-center">
                <Video className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Video: {currentMaterial.title}</p>
                <div className="text-sm text-slate-700 mt-4 text-left">
                  <div className="prose prose-sm max-w-none">
                    {currentMaterial.content.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-2">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {currentMaterial.type === 'text' && (
              <div className="prose prose-sm max-w-none">
                {currentMaterial.content.split('\n').map((paragraph, index) => (
                  paragraph.trim() && <p key={index} className="text-slate-700 leading-relaxed mb-3">{paragraph}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              onClick={handlePreviousMaterial}
              disabled={currentMaterialIndex === 0}
              variant="outline"
              className="border-slate-300 text-slate-700"
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              {!completedMaterials.has(currentMaterialIndex) && (
                <Button
                  onClick={handleMaterialComplete}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              
              {currentMaterialIndex < course.materials.length - 1 ? (
                <Button
                  onClick={handleNextMaterial}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
                >
                  Next Material
                </Button>
              ) : completedMaterials.size === course.materials.length ? (
                <Button
                  disabled
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Course Complete
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseDisplay;
