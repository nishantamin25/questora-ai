
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
  const getYouTubeEmbedUrl = (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      const videoId = match[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return null;
  };

  // Function to convert Google Drive URL to embed URL
  const getGoogleDriveEmbedUrl = (url: string) => {
    // Handle Google Drive share URLs
    const driveRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9-_]+)/;
    const match = url.match(driveRegex);
    
    if (match) {
      const fileId = match[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    return null;
  };

  // Function to get the appropriate embed URL
  const getEmbedUrl = (url: string) => {
    // Try YouTube first
    const youtubeEmbed = getYouTubeEmbedUrl(url);
    if (youtubeEmbed) {
      return youtubeEmbed;
    }

    // Try Google Drive
    const driveEmbed = getGoogleDriveEmbedUrl(url);
    if (driveEmbed) {
      return driveEmbed;
    }
    
    // For other video URLs, return as is
    return url;
  };

  // Check video type
  const isYouTubeUrl = /(?:youtube\.com|youtu\.be)/.test(videoUrl);
  const isGoogleDriveUrl = /drive\.google\.com/.test(videoUrl);
  const embedUrl = getEmbedUrl(videoUrl);

  console.log('🎬 VideoPlayer Debug:', {
    originalUrl: videoUrl,
    embedUrl,
    isYouTubeUrl,
    isGoogleDriveUrl
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
          
          {(isYouTubeUrl || isGoogleDriveUrl) ? (
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
