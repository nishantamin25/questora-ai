
import { useState } from 'react';
import SaveTestForm from './SaveTestForm';
import TestSummaryCard from './TestSummaryCard';
import { SaveTestDialogProps, Questionnaire } from '@/types/SaveTestDialog';

const SaveTestDialog = ({ questionnaire, onSave, onCancel }: SaveTestDialogProps) => {
  const [showSummary, setShowSummary] = useState(false);
  const [savedTest, setSavedTest] = useState<Questionnaire | null>(null);

  console.log('SaveTestDialog render:', { 
    showSummary, 
    savedTest: savedTest ? { testName: savedTest.testName, isActive: savedTest.isActive } : null 
  });

  const handleSave = (savedQuestionnaire: Questionnaire) => {
    console.log('SaveTestDialog handleSave called with:', {
      testName: savedQuestionnaire.testName,
      isActive: savedQuestionnaire.isActive,
      isSaved: savedQuestionnaire.isSaved
    });
    
    setSavedTest(savedQuestionnaire);
    setShowSummary(true);
    
    console.log('State should be updated - showSummary: true, savedTest set');
    
    // Call onSave callback
    onSave(savedQuestionnaire);
  };

  const handleDone = () => {
    console.log('handleDone called - closing dialog');
    onCancel();
  };

  console.log('About to render decision - showSummary:', showSummary, 'savedTest exists:', !!savedTest);

  // Show summary view after saving
  if (showSummary && savedTest) {
    console.log('RENDERING SUMMARY VIEW for test:', savedTest.testName, 'isActive:', savedTest.isActive);
    return (
      <TestSummaryCard
        savedTest={savedTest}
        onActiveToggle={() => {}} // Empty function since we're not using it here anymore
        onDone={handleDone}
      />
    );
  }

  // Show initial save form
  console.log('RENDERING SAVE FORM');
  return (
    <SaveTestForm
      questionnaire={questionnaire}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
};

export default SaveTestDialog;
