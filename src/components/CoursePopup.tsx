
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CoursePopupProps {
  course: {
    id: string;
    name: string;
    materials: Array<{
      type: 'text' | 'image' | 'video';
      content: string;
      title: string;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: (courseId: string) => void;
  isCompleted?: boolean;
}

const CoursePopup = ({ course, isOpen, onClose, onComplete, isCompleted = false }: CoursePopupProps) => {
  const handleMarkCourseComplete = () => {
    onComplete(course.id);
    toast({
      title: "Course Completed!",
      description: "You have successfully completed the course.",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">{course.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {course.materials.map((material, index) => (
            <div key={index} className="border-b border-slate-200 pb-8 last:border-b-0">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                {material.title}
              </h3>
              <div className="prose prose-slate max-w-none">
                {material.content.split('\n').map((paragraph, pIndex) => (
                  paragraph.trim() && (
                    <p key={pIndex} className="text-slate-700 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            </div>
          ))}

          <div className="pt-6 border-t border-slate-200">
            <Button
              onClick={handleMarkCourseComplete}
              disabled={isCompleted}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isCompleted ? 'Completed' : 'Mark as completed'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoursePopup;
