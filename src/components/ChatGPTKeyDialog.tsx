
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChatGPTKeyDialogProps {
  open: boolean;
  onKeySet: (apiKey: string) => void;
  onCancel: () => void;
}

const ChatGPTKeyDialog = ({ open, onKeySet, onCancel }: ChatGPTKeyDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your ChatGPT API key",
        variant: "destructive"
      });
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast({
        title: "Error",
        description: "Invalid API key format. ChatGPT API keys start with 'sk-'",
        variant: "destructive"
      });
      return;
    }

    onKeySet(apiKey.trim());
    setApiKey('');
    toast({
      title: "Success",
      description: "ChatGPT API key saved successfully",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center space-x-2 font-poppins text-lg">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
              <Key className="h-5 w-5 text-white" />
            </div>
            <span>Setup ChatGPT Integration</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 mb-3 font-inter">
              To generate high-quality, relevant questions, we'll use ChatGPT. You need to provide your OpenAI API key.
            </p>
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Get your API key from OpenAI
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="apiKey" className="text-slate-700 font-medium font-poppins">ChatGPT API Key</Label>
              <div className="relative mt-1">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="border-slate-300 focus:border-green-500 focus:ring-green-500 rounded-lg font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-inter">
                Your API key is stored locally and never shared
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-200">
            <Button onClick={handleSave} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 flex-1 rounded-lg font-poppins font-medium">
              <Key className="h-4 w-4 mr-2" />
              Save API Key
            </Button>
            <Button onClick={onCancel} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatGPTKeyDialog;
