import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, Edit, Save, X, Play, Link, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import VideoPlayer from './VideoPlayer';
import VideoUrlEditor from './VideoUrlEditor';
import VideoUploadEditor from './VideoUploadEditor';

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
    videoFile?: File;
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
  // Debug logging
  console.log('🔍 CoursePopup Debug Info:');
  console.log('- isAdmin prop:', isAdmin);
  console.log('- course.id:', course.id);
  console.log('- course.videoUrl:', course.videoUrl);
  console.log('- course.videoFile:', course.videoFile);

  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState(course);
  const [showVideoUrlEditor, setShowVideoUrlEditor] = useState(false);
  const [showVideoUploadEditor, setShowVideoUploadEditor] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

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
    setShowVideoUrlEditor(false);
    setShowVideoUploadEditor(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedCourse({ ...course });
    setShowVideoUrlEditor(false);
    setShowVideoUploadEditor(false);
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
    const updatedCourse = { ...editedCourse, videoUrl: url, videoFile: undefined };
    setEditedCourse(updatedCourse);
    setShowVideoUrlEditor(false);
    
    if (onUpdate) {
      onUpdate(updatedCourse);
      toast({
        title: "Video URL Updated",
        description: url ? "Video URL has been added to the course." : "Video URL has been removed from the course.",
      });
    }
  };

  const handleVideoFileSave = (file: File) => {
    const videoObjectUrl = URL.createObjectURL(file);
    const updatedCourse = { ...editedCourse, videoFile: file, videoUrl: videoObjectUrl };
    setEditedCourse(updatedCourse);
    setShowVideoUploadEditor(false);
    
    if (onUpdate) {
      onUpdate(updatedCourse);
      toast({
        title: "Video File Uploaded",
        description: "Video file has been added to the course.",
      });
    }
  };

  const currentCourse = isEditing ? editedCourse : course;
  const hasVideo = currentCourse.videoUrl || currentCourse.videoFile;
  
  return (
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
                currentCourse.name
              )}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {/* Debug info - temporarily visible */}
              <div className="text-xs bg-yellow-100 p-2 rounded border mr-2">
                <div>Admin: {isAdmin ? 'YES' : 'NO'}</div>
                <div>Video: {hasVideo ? 'YES' : 'NO'}</div>
              </div>

              {/* Video buttons - now visible to admins regardless of editing state */}
              {hasVideo && (
                <Button 
                  onClick={() => setShowVideo(!showVideo)} 
                  variant="outline" 
                  size="sm"
                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {showVideo ? 'Hide Video' : 'Watch Video'}
                </Button>
              )}
              
              {isAdmin && (
                <>
                  <Button 
                    onClick={() => setShowVideoUrlEditor(true)} 
                    variant="outline" 
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    {currentCourse.videoUrl ? 'Edit Video URL' : 'Add Video URL'}
                  </Button>
                  <Button 
                    onClick={() => setShowVideoUploadEditor(true)} 
                    variant="outline" 
                    size="sm"
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {currentCourse.videoFile ? 'Change Video File' : 'Upload Video'}
                  </Button>
                  {!isEditing && (
                    <Button onClick={handleEdit} variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
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
          {showVideoUrlEditor && isAdmin && (
            <VideoUrlEditor
              videoUrl={editedCourse.videoUrl}
              onSave={handleVideoUrlSave}
              onCancel={() => setShowVideoUrlEditor(false)}
            />
          )}
          
          {/* Video Upload Editor */}
          {showVideoUploadEditor && isAdmin && (
            <VideoUploadEditor
              onSave={handleVideoFileSave}
              onCancel={() => setShowVideoUploadEditor(false)}
            />
          )}
          
          {/* Video Player */}
          {showVideo && hasVideo && (
            <div className="mb-6">
              <VideoPlayer 
                videoUrl={currentCourse.videoUrl || ''} 
                title={currentCourse.name}
              />
            </div>
          )}

          {/* Course Materials */}
          {currentCourse.materials.map((material, index) => (
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
  );
};

export default CoursePopup;
