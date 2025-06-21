
import { useState } from 'react';
import SaveTestForm from './SaveTestForm';
import TestSummaryCard from './TestSummaryCard';
import { SaveTestDialogProps, Questionnaire } from '@/types/SaveTestDialog';

const SaveTestDialog = ({ questionnaire, onSave, onCancel }: SaveTestDialogProps) => {
  const [showSummary, setShowSummary] = useState(false);
  const [savedTest, setSavedTest] = useState<Questionnaire | null>(null);

  console.log('SaveTestDialog render:', { showSummary, savedTest: !!savedTest });

  const handleSave = (savedQuestionnaire: Questionnaire) => {
    console.log('Setting savedTest and showSummary to true');
    setSavedTest(savedQuestionnaire);
    setShowSummary(true);
    
    // Call onSave callback
    onSave(savedQuestionnaire);
  };

  const handleActiveToggle = (checked: boolean) => {
    console.log('handleActiveToggle called with:', checked);
    if (savedTest) {
      const updatedTest = { ...savedTest, isActive: checked };
      setSavedTest(updatedTest);
      onSave(updatedTest);
    }
  };

  const handleDone = () => {
    console.log('handleDone called');
    onCancel();
  };

  console.log('About to render, showSummary:', showSummary, 'savedTest exists:', !!savedTest);

  // Show summary view after saving
  if (showSummary && savedTest) {
    console.log('Rendering summary view for test:', savedTest.testName);
    return (
      <TestSummaryCard
        savedTest={savedTest}
        onActiveToggle={handleActiveToggle}
        onDone={handleDone}
      />
    );
  }

  // Show initial save form
  console.log('Rendering initial save form');
  return (
    <SaveTestForm
      questionnaire={questionnaire}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
};

export default SaveTestDialog;
