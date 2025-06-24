
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Key } from 'lucide-react';
import ChatGPTKeyDialog from './ChatGPTKeyDialog';
import { ChatGPTService } from '@/services/ChatGPTService';
import { LanguageService } from '@/services/LanguageService';
import { toast } from '@/hooks/use-toast';

const ApiKeySettings = () => {
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const hasApiKey = ChatGPTService.hasApiKey();

  const handleKeySet = (apiKey: string) => {
    ChatGPTService.setApiKey(apiKey);
    setShowKeyDialog(false);
    toast({
      title: "Success",
      description: LanguageService.translate('apiKey.success'),
    });
  };

  const handleClearKey = () => {
    ChatGPTService.clearApiKey();
    toast({
      title: "API Key Cleared",
      description: LanguageService.translate('apiKey.cleared'),
    });
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => setShowKeyDialog(true)}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />
          <span>{hasApiKey ? LanguageService.translate('apiKey.update') : LanguageService.translate('apiKey.setup')}</span>
        </Button>
        
        {hasApiKey && (
          <Button
            onClick={handleClearKey}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 border-slate-300 hover:bg-red-50"
          >
            {LanguageService.translate('apiKey.clear')}
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
