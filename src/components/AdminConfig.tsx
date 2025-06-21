
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfigService } from '@/services/ConfigService';
import { toast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';

const AdminConfig = () => {
  const [config, setConfig] = useState({
    defaultQuestionType: 'multiple-choice',
    numberOfQuestions: 5,
    multipleChoiceOptions: 'Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree'
  });

  useEffect(() => {
    const savedConfig = ConfigService.getConfig();
    setConfig(savedConfig);
  }, []);

  const handleSave = () => {
    if (config.numberOfQuestions < 1 || config.numberOfQuestions > 20) {
      toast({
        title: "Error",
        description: "Number of questions must be between 1 and 20",
        variant: "destructive"
      });
      return;
    }

    ConfigService.saveConfig(config);
    toast({
      title: "Success",
      description: "Configuration saved successfully",
    });
  };

  const handleReset = () => {
    const defaultConfig = ConfigService.getDefaultConfig();
    setConfig(defaultConfig);
    ConfigService.saveConfig(defaultConfig);
    toast({
      title: "Success",
      description: "Configuration reset to defaults",
    });
  };

  return (
    <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200">
        <CardTitle className="flex items-center space-x-2 text-blue-800">
          <Settings className="h-5 w-5" />
          <span>Admin Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div>
          <Label htmlFor="numQuestions" className="text-gray-700 font-medium">Number of Questions</Label>
          <Input
            id="numQuestions"
            type="number"
            min="1"
            max="20"
            value={config.numberOfQuestions}
            onChange={(e) => setConfig(prev => ({ ...prev, numberOfQuestions: parseInt(e.target.value) || 5 }))}
            className="mt-1 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <Label htmlFor="options" className="text-gray-700 font-medium">Multiple Choice Options</Label>
          <Textarea
            id="options"
            value={config.multipleChoiceOptions}
            onChange={(e) => setConfig(prev => ({ ...prev, multipleChoiceOptions: e.target.value }))}
            placeholder="Enter options separated by commas"
            className="mt-1 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate options with commas. These will be used for multiple-choice questions.
          </p>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            Save Configuration
          </Button>
          <Button variant="outline" onClick={handleReset} className="border-blue-300 text-blue-700 hover:bg-blue-50">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminConfig;
