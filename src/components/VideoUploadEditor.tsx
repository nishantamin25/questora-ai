
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Save, X, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoUploadEditorProps {
  onSave: (videoFile: File) => void;
  onCancel: () => void;
}

const VideoUploadEditor: React.FC<VideoUploadEditorProps> = ({ onSave, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a video file.",
          variant: "destructive"
        });
        return;
      }
      
      // Check file size (limit to 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Please select a video file smaller than 100MB.",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSave = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a video file to upload.",
        variant: "destructive"
      });
      return;
    }
    
    onSave(selectedFile);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        <Label className="text-sm font-medium">
          Upload Video File
        </Label>
      </div>
      
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {selectedFile ? 'Change Video File' : 'Select Video File'}
        </Button>
        
        {selectedFile && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Selected: {selectedFile.name}
                </p>
                <p className="text-xs text-blue-700">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Note: This will create a local video file for the course. For YouTube or Google Drive videos, use the "Add Video URL" option instead.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="outline" size="sm">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!selectedFile}
        >
          <Save className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      </div>
    </div>
  );
};

export default VideoUploadEditor;
