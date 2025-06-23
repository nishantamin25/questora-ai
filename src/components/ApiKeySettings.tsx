
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Key } from 'lucide-react';
import ChatGPTKeyDialog from './ChatGPTKeyDialog';
import { ChatGPTService } from '@/services/ChatGPTService';
import { toast } from '@/hooks/use-toast';

const ApiKeySettings = () => {
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const hasApiKey = !!ChatGPTService.getApiKey();

  const handleKeySet = (apiKey: string) => {
    ChatGPTService.setApiKey(apiKey);
    setShowKeyDialog(false);
    toast({
      title: "Success",
      description: "OpenAI API key has been saved successfully",
    });
  };

  const handleClearKey = () => {
    ChatGPTService.clearApiKey();
    toast({
      title: "API Key Cleared",
      description: "OpenAI API key has been removed",
    });
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => setShowKeyDialog(true)}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>{hasApiKey ? 'Update API Key' : 'Setup API Key'}</span>
        </Button>
        
        {hasApiKey && (
          <Button
            onClick={handleClearKey}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            Clear Key
          </Button>
        )}
      </div>

      <ChatGPTKeyDialog
        open={showKeyDialog}
        onKeySet={handleKeySet}
        onCancel={() => setShowKeyDialog(false)}
      />
    </>
  );
};

export default ApiKeySettings;
