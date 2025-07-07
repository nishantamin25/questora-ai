
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Save, X, Plus, Info } from 'lucide-react';
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
          placeholder="Enter video URL (YouTube or Google Drive)"
          className="w-full"
        />
        
        <div className="flex items-start space-x-2 text-xs text-slate-600 bg-blue-50 p-2 rounded">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium mb-1">Supported formats:</div>
            <div>• YouTube: https://www.youtube.com/watch?v=...</div>
            <div>• Google Drive: https://drive.google.com/file/d/.../view</div>
            <div className="mt-1 text-amber-600">
              <strong>Note:</strong> For Google Drive videos, make sure the file is set to "Anyone with the link can view"
            </div>
          </div>
        </div>
        
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
