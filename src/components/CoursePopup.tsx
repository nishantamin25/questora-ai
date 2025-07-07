
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, Edit, Save, X, Video, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import VideoPlayer from './VideoPlayer';
import VideoUrlEditor from './VideoUrlEditor';

interface CoursePopupProps {
  course: {
    id: string;
    name: string;
    materials: Array<{
      type: 'text' | 'image' | 'video';
      content: string;
      title: string;
    }>;
    videoUrl?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: (courseId: string) => void;
  onUpdate?: (updatedCourse: any) => void;
  isCompleted?: boolean;
  isAdmin?: boolean;
}

const CoursePopup = ({ 
  course, 
  isOpen, 
  onClose, 
  onComplete, 
  onUpdate,
  isCompleted = false,
  isAdmin = false 
}: CoursePopupProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState(course);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedCourse({ ...course });
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedCourse);
      toast({
        title: "Course Updated",
        description: "Course has been successfully updated.",
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedCourse({ ...course });
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const updatedMaterials = [...editedCourse.materials];
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
    setEditedCourse({ ...editedCourse, materials: updatedMaterials });
  };

  const handleMarkCourseComplete = () => {
    onComplete(course.id);
    toast({
      title: "Course Completed!",
      description: "You have successfully completed the course.",
    });
    onClose();
  };

  const handleVideoUrlSave = (url: string) => {
    const updatedCourse = { ...editedCourse, videoUrl: url };
    setEditedCourse(updatedCourse);
    
    if (onUpdate) {
      onUpdate(updatedCourse);
    }
    
    setShowVideoEditor(false);
  };

  const handleVideoUrlCancel = () => {
    setShowVideoEditor(false);
  };

  const hasVideo = course.videoUrl && course.videoUrl.trim() !== '';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                {isEditing ? (
                  <Input
                    value={editedCourse.name}
                    onChange={(e) => setEditedCourse({ ...editedCourse, name: e.target.value })}
                    className="text-xl font-semibold"
                  />
                ) : (
                  course.name
                )}
              </DialogTitle>
              
              <div className="flex items-center space-x-2">
                {/* Watch Video Button for Guests */}
                {!isAdmin && hasVideo && (
                  <Button
                    onClick={() => setShowVideoPlayer(true)}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Watch Video
                  </Button>
                )}

                {/* Admin Controls */}
                {isAdmin && !isEditing && (
                  <>
                    {hasVideo && (
                      <Button
                        onClick={() => setShowVideoPlayer(true)}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch Video
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowVideoEditor(true)}
                      variant="outline"
                      size="sm"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Add Video
                    </Button>
                    <Button onClick={handleEdit} variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
                
                {isEditing && (
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Video URL Editor */}
            {showVideoEditor && (
              <VideoUrlEditor
                videoUrl={editedCourse.videoUrl}
                onSave={handleVideoUrlSave}
                onCancel={handleVideoUrlCancel}
              />
            )}

            {/* Course Materials */}
            {(isEditing ? editedCourse : course).materials.map((material, index) => (
              <div key={index} className="border-b border-slate-200 pb-8 last:border-b-0">
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      value={material.title}
                      onChange={(e) => handleMaterialChange(index, 'title', e.target.value)}
                      className="text-lg font-medium"
                      placeholder="Section title"
                    />
                    <Textarea
                      value={material.content}
                      onChange={(e) => handleMaterialChange(index, 'content', e.target.value)}
                      className="min-h-[200px] prose prose-slate max-w-none"
                      placeholder="Section content"
                    />
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            ))}

            {!isEditing && (
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      {hasVideo && (
        <VideoPlayer
          videoUrl={course.videoUrl!}
          courseName={course.name}
          isOpen={showVideoPlayer}
          onClose={() => setShowVideoPlayer(false)}
        />
      )}
    </>
  );
};

export default CoursePopup;
