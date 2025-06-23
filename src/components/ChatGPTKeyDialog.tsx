
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChatGPTKeyDialogProps {
  open: boolean;
  onKeySet: (apiKey: string) => void;
  onCancel: () => void;
}

const ChatGPTKeyDialog = ({ open, onKeySet, onCancel }: ChatGPTKeyDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validateApiKeyFormat = (key: string): boolean => {
    // OpenAI API keys can start with sk- or sk-proj-
    return key.startsWith('sk-') && key.length > 20;
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your OpenAI API key",
        variant: "destructive"
      });
      return;
    }

    const trimmedKey = apiKey.trim();

    if (!validateApiKeyFormat(trimmedKey)) {
      toast({
        title: "Error",
        description: "Invalid API key format. OpenAI API keys should start with 'sk-' and be longer than 20 characters",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    try {
      // Test the API key with a simple request
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${trimmedKey}`,
        },
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        let errorMessage = 'Invalid API key';
        
        if (errorData.error?.code === 'invalid_api_key') {
          errorMessage = 'The API key is invalid. Please check your key and try again.';
        } else if (errorData.error?.code === 'insufficient_quota') {
          errorMessage = 'Your API key has exceeded its quota. Please check your OpenAI account billing.';
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }

        toast({
          title: "API Key Validation Failed",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      // If we get here, the key is valid
      onKeySet(trimmedKey);
      setApiKey('');
      toast({
        title: "Success",
        description: "OpenAI API key validated and saved successfully",
      });
    } catch (error) {
      console.error('Error validating API key:', error);
      toast({
        title: "Validation Error",
        description: "Unable to validate API key. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center space-x-2 font-poppins text-lg">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
              <Key className="h-5 w-5 text-white" />
            </div>
            <span>Setup OpenAI Integration</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 mb-3 font-inter">
              To generate high-quality, relevant questions, we'll use OpenAI's GPT models. You need to provide your OpenAI API key.
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

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="text-xs space-y-1">
                  <li>• Make sure your API key has sufficient quota/credits</li>
                  <li>• API keys should start with "sk-" or "sk-proj-"</li>
                  <li>• We'll validate your key before saving</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="apiKey" className="text-slate-700 font-medium font-poppins">OpenAI API Key</Label>
              <div className="relative mt-1">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-... or sk-proj-..."
                  className="border-slate-300 focus:border-green-500 focus:ring-green-500 rounded-lg font-mono text-sm pr-10"
                  disabled={isValidating}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isValidating}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-inter">
                Your API key is validated and stored locally
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-200">
            <Button 
              onClick={handleSave} 
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 flex-1 rounded-lg font-poppins font-medium"
              disabled={isValidating}
            >
              <Key className="h-4 w-4 mr-2" />
              {isValidating ? 'Validating...' : 'Validate & Save API Key'}
            </Button>
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-poppins"
              disabled={isValidating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatGPTKeyDialog;
