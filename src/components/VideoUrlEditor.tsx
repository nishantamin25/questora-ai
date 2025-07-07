
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoUrlEditorProps {
  videoUrl?: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}

const VideoUrlEditor: React.FC<VideoUrlEditorProps> = ({ videoUrl = '', onSave, onCancel }) => {
  const [url, setUrl] = useState(videoUrl);

  const handleSave = () => {
    if (url && !isValidVideoUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube or Google Drive URL.",
        variant: "destructive"
      });
      return;
    }
    
    onSave(url);
  };

  const isValidVideoUrl = (url: string): boolean => {
    return url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('drive.google.com');
  };

  return (
    <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <div className="flex items-center gap-2">
        <Link className="h-4 w-4" />
        <Label htmlFor="video-url" className="text-sm font-medium">
          Video URL (YouTube or Google Drive)
        </Label>
      </div>
      
      <Input
        id="video-url"
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/d/..."
        className="w-full"
      />
      
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="outline" size="sm">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          Save Video URL
        </Button>
      </div>
    </div>
  );
};

export default VideoUrlEditor;
