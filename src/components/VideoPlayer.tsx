
import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  isLocalFile?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, title, isLocalFile = false }) => {
  const getEmbedUrl = (url: string): string => {
    // Handle YouTube URLs
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Handle Google Drive URLs
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.split('/file/d/')[1]?.split('/')[0];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    // Return original URL for other cases
    return url;
  };

  // If it's a local file (blob URL), render HTML5 video element
  if (isLocalFile || videoUrl.startsWith('blob:')) {
    return (
      <div className="w-full">
        <div className="relative w-full h-0 pb-[56.25%]"> {/* 16:9 aspect ratio */}
          <video
            src={videoUrl}
            title={title}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            controls
            style={{ objectFit: 'contain' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    );
  }

  // For external URLs (YouTube, Google Drive), use iframe
  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="w-full">
      <div className="relative w-full h-0 pb-[56.25%]"> {/* 16:9 aspect ratio */}
        <iframe
          src={embedUrl}
          title={title}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
