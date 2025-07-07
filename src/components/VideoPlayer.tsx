
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

  // Function to convert YouTube URL to embed URL
  const getEmbedUrl = (url: string) => {
    // Check if it's a YouTube URL
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      const videoId = match[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // For other video URLs, return as is
    return url;
  };

  // Check if it's a YouTube URL
  const isYouTubeUrl = /(?:youtube\.com|youtu\.be)/.test(videoUrl);
  const embedUrl = getEmbedUrl(videoUrl);

  console.log('🎬 VideoPlayer Debug:', {
    originalUrl: videoUrl,
    embedUrl,
    isYouTubeUrl
  });

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
          
          {isYouTubeUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={handleVideoLoad}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          ) : (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
