
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Trash2, Clock, BookOpen } from 'lucide-react';
import { LanguageService } from '@/services/LanguageService';

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

interface CourseHeaderProps {
  course: Course;
  editedCourse: Course;
  isEditing: boolean;
  isAdmin: boolean;
  onCourseChange: (course: Course) => void;
  onEditToggle: () => void;
  onCancelEdit: () => void;
  onActiveToggle: (checked: boolean) => void;
  onDelete: (courseId: string) => void;
  onSaveCourse: () => void;
}

const CourseHeader = ({
  course,
  editedCourse,
  isEditing,
  isAdmin,
  onCourseChange,
  onEditToggle,
  onCancelEdit,
  onActiveToggle,
  onDelete,
  onSaveCourse
}: CourseHeaderProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  return (
    <div className="space-y-4">
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="course-name" className="text-slate-700 font-medium">Course Name</Label>
            <Input
              id="course-name"
              value={editedCourse.name}
              onChange={(e) => onCourseChange({ ...editedCourse, name: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="course-description" className="text-slate-700 font-medium">Description</Label>
            <Textarea
              id="course-description"
              value={editedCourse.description}
              onChange={(e) => onCourseChange({ ...editedCourse, description: e.target.value })}
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editedCourse.isActive}
                  onCheckedChange={onActiveToggle}
                />
                <Label className="text-sm text-slate-600">Active</Label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={onEditToggle}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={onCancelEdit}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-bold text-slate-900 font-poppins">{course.name}</h3>
                <Badge className={getDifficultyColor(course.difficulty)}>
                  {course.difficulty}
                </Badge>
                {course.isActive && (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                )}
              </div>
              
              <p className="text-slate-600 font-inter mb-3">{course.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.materials.length} materials</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.estimatedTime} min</span>
                </div>
                <span>Created {new Date(course.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  onClick={onEditToggle}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 hover:border-violet-300"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={onSaveCourse}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 hover:border-green-300"
                >
                  <Save className="h-4 w-4" />
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
              </div>
            )}
          </div>
          
          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm font-medium">
                Click delete again to confirm removal of this course
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseHeader;
