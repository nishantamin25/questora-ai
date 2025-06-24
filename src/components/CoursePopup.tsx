
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(0);
  const [completedPages, setCompletedPages] = useState<Set<number>>(new Set());

  const totalPages = course.materials.length;
  const progress = (completedPages.size / totalPages) * 100;

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleMarkPageComplete = () => {
    const newCompleted = new Set(completedPages);
    newCompleted.add(currentPage);
    setCompletedPages(newCompleted);
  };

  const handleMarkCourseComplete = () => {
    onComplete(course.id);
    toast({
      title: "Course Completed!",
      description: "You have successfully completed the course.",
    });
    onClose();
  };

  const currentMaterial = course.materials[currentPage];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{course.name}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>Page {currentPage + 1} of {totalPages}</span>
              <span>{Math.round(progress)}% completed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          {currentMaterial && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">{currentMaterial.title}</h3>
                {!completedPages.has(currentPage) && (
                  <Button
                    onClick={handleMarkPageComplete}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Page Complete
                  </Button>
                )}
              </div>

              <div className="prose prose-slate max-w-none">
                {currentMaterial.content.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="text-slate-700 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 flex items-center justify-between">
          <Button
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            variant="outline"
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-2">
            {completedPages.size === totalPages ? (
              <Button
                onClick={handleMarkCourseComplete}
                disabled={isCompleted}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isCompleted ? 'Completed' : 'Mark as Complete'}
              </Button>
            ) : (
              <span className="text-sm text-slate-600">
                Complete all pages to finish the course
              </span>
            )}
          </div>

          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            variant="outline"
            className="flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoursePopup;
