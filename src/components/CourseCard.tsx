
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Trash2, BookOpen, Download, Eye } from 'lucide-react';
import { PDFGenerationService } from '@/services/PDFGenerationService';
import { toast } from '@/hooks/use-toast';
import CoursePopup from '@/components/CoursePopup';

interface Course {
  id: string;
  name: string;
  description: string;
  materials: any[];
  estimatedTime: number;
  createdAt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  pdfUrl?: string;
}

interface CourseCardProps {
  course: Course;
  isAdmin: boolean;
  onUpdate: (course: Course) => void;
  onDelete: (courseId: string) => void;
  onComplete: (courseId: string) => void;
  isCompleted?: boolean;
}

const CourseCard = ({ course, isAdmin, onUpdate, onDelete, onComplete, isCompleted = false }: CourseCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState<Course>(course);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCoursePopup, setShowCoursePopup] = useState(false);

  const handleEdit = () => {
    if (isEditing) {
      // Save the basic course info changes
      onUpdate(editedCourse);
      setIsEditing(false);
      toast({
        title: "Course Updated",
        description: "Course information has been updated successfully.",
      });
    } else {
      setIsEditing(true);
      setEditedCourse({ ...course });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCourse(course);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(course.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleCourseUpdate = (updatedCourse: any) => {
    // Update the entire course including materials
    onUpdate(updatedCourse);
  };

  const handleDownloadPDF = () => {
    if (course.pdfUrl) {
      PDFGenerationService.downloadPDF(course.pdfUrl, course.name);
    } else {
      const pdfUrl = PDFGenerationService.generateCoursePDF(course);
      PDFGenerationService.downloadPDF(pdfUrl, course.name);
    }
    toast({
      title: "PDF Downloaded",
      description: "Course material has been downloaded as PDF",
    });
  };

  return (
    <>
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl">
        <CardHeader className="pb-4">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editedCourse.name}
                onChange={(e) => setEditedCourse({ ...editedCourse, name: e.target.value })}
                className="font-semibold"
                placeholder="Course name"
              />
              <Textarea
                value={editedCourse.description}
                onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                className="min-h-[60px]"
                placeholder="Course description"
              />
              <div className="flex items-center justify-end space-x-2">
                <Button onClick={handleEdit} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button onClick={handleCancelEdit} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-slate-900 mb-2 flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>{course.name}</span>
                  {isCompleted && (
                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  )}
                </CardTitle>
                <p className="text-slate-600 text-sm">{course.description}</p>
              </div>
              
              <div className="flex items-center space-x-1 ml-4">
                <Button
                  onClick={() => setShowCoursePopup(true)}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      onClick={handleEdit}
                      variant="outline"
                      size="sm"
                      className="border-slate-300 hover:border-violet-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleDelete}
                      variant="outline"
                      size="sm"
                      className={`border-slate-300 hover:border-red-300 ${
                        showDeleteConfirm ? 'bg-red-50 border-red-300' : ''
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          
          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <p className="text-red-800 text-sm font-medium">
                Click delete again to confirm removal of this course
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      <CoursePopup
        course={course}
        isOpen={showCoursePopup}
        onClose={() => setShowCoursePopup(false)}
        onComplete={onComplete}
        onUpdate={handleCourseUpdate}
        isCompleted={isCompleted}
        isAdmin={isAdmin}
      />
    </>
  );
};

export default CourseCard;
