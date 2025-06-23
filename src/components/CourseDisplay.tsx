
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Play, CheckCircle, Clock, FileText, Image, Video } from 'lucide-react';
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
  };
  onCourseComplete: (courseId: string) => void;
}

const CourseDisplay = ({ course, onCourseComplete }: CourseDisplayProps) => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
  const [completedMaterials, setCompletedMaterials] = useState<Set<number>>(new Set());
  const [showMaterial, setShowMaterial] = useState(false);

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

    if (currentMaterialIndex < course.materials.length - 1) {
      setCurrentMaterialIndex(currentMaterialIndex + 1);
    } else {
      // Course completed
      toast({
        title: "Course Completed!",
        description: "Congratulations! You can now access the test.",
      });
      onCourseComplete(course.id);
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

  if (!isEnrolled) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200 rounded-t-xl">
          <CardTitle className="text-slate-900 font-poppins flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span>{course.name}</span>
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
          <div className="text-sm text-slate-600">
            {currentMaterialIndex + 1} of {course.materials.length}
          </div>
        </CardTitle>
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-600 mt-1">{Math.round(progress)}% completed</p>
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

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[200px]">
            {currentMaterial.type === 'image' && (
              <div className="text-center">
                <Image className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Image: {currentMaterial.title}</p>
                <p className="text-sm text-slate-500 mt-2">{currentMaterial.content}</p>
              </div>
            )}
            
            {currentMaterial.type === 'video' && (
              <div className="text-center">
                <Video className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Video: {currentMaterial.title}</p>
                <p className="text-sm text-slate-500 mt-2">{currentMaterial.content}</p>
              </div>
            )}
            
            {currentMaterial.type === 'text' && (
              <div className="prose prose-sm max-w-none">
                <p className="text-slate-700 leading-relaxed">{currentMaterial.content}</p>
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
              {currentMaterialIndex < course.materials.length - 1 ? (
                <Button
                  onClick={handleNextMaterial}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
                >
                  Next Material
                </Button>
              ) : (
                <Button
                  onClick={handleMaterialComplete}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Course
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseDisplay;
