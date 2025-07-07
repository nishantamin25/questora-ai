
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Save, X, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoUrlEditorProps {
  videoUrl?: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}

const VideoUrlEditor = ({ videoUrl = '', onSave, onCancel }: VideoUrlEditorProps) => {
  const [url, setUrl] = useState(videoUrl);

  const handleSave = () => {
    if (url.trim()) {
      // Basic URL validation
      try {
        new URL(url);
        onSave(url.trim());
        toast({
          title: "Video URL Saved",
          description: "Video URL has been successfully added to the course.",
        });
      } catch (error) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid video URL.",
          variant: "destructive"
        });
      }
    } else {
      onSave('');
      toast({
        title: "Video URL Removed",
        description: "Video URL has been removed from the course.",
      });
    }
  };

  return (
    <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <div className="flex items-center space-x-2">
        <Video className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-slate-700">Add Video URL</span>
      </div>
      
      <div className="space-y-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter video URL (e.g., https://example.com/video.mp4)"
          className="w-full"
        />
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoUrlEditor;
