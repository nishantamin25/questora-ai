
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Globe, Key } from 'lucide-react';
import { LanguageService } from '@/services/LanguageService';
import ApiKeySettings from './ApiKeySettings';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  userRole: 'admin' | 'guest';
}

const SettingsDialog = ({ open, onClose, userRole }: SettingsDialogProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState(LanguageService.getCurrentLanguage());
  const availableLanguages = LanguageService.getAvailableLanguages();

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    LanguageService.setLanguage(languageCode);
    // Trigger a page refresh to apply language changes
    window.location.reload();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center space-x-2 font-poppins text-lg">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-2 rounded-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span>{LanguageService.translate('settings.title')}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Language Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-violet-600" />
              <Label className="text-slate-700 font-medium font-poppins">
                {LanguageService.translate('settings.language')}
              </Label>
            </div>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full border-slate-300 focus:border-violet-500 focus:ring-violet-500 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{language.nativeName}</span>
                      <span className="text-sm text-slate-500">({language.name})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key Setup - Only for Admin */}
          {userRole === 'admin' && (
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center space-x-2 mb-3">
                <Key className="h-4 w-4 text-violet-600" />
                <Label className="text-slate-700 font-medium font-poppins">
                  {LanguageService.translate('settings.apiKey')}
                </Label>
              </div>
              <ApiKeySettings />
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button 
              onClick={handleClose}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 rounded-lg font-poppins font-medium"
            >
              {LanguageService.translate('settings.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
