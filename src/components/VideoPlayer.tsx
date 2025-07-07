
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VideoPlayerProps {
  videoUrl: string;
  courseName: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayer = ({ videoUrl, courseName, isOpen, onClose }: VideoPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{courseName} - Video</span>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="w-full aspect-video bg-slate-100 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-slate-600">Loading video...</div>
            </div>
          )}
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            style={{ display: isLoading ? 'none' : 'block' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
