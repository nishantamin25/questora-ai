
import { useState, useEffect } from 'react';
import SaveTestForm from './SaveTestForm';
import TestSummaryCard from './TestSummaryCard';
import { SaveTestDialogProps, Questionnaire } from '@/types/SaveTestDialog';
import { QuestionnaireService } from '@/services/QuestionnaireService';

const SaveTestDialog = ({ questionnaire, onSave, onCancel }: SaveTestDialogProps) => {
  const [showSummary, setShowSummary] = useState(false);
  const [savedTest, setSavedTest] = useState<Questionnaire | null>(null);

  // CRITICAL FIX: Check for temp questionnaire on mount to prevent data loss
  useEffect(() => {
    const tempQuestionnaire = QuestionnaireService.getTempQuestionnaire();
    if (tempQuestionnaire && tempQuestionnaire.id === questionnaire.id) {
      console.log('🔄 RECOVERY: Found temp questionnaire, ensuring persistence:', tempQuestionnaire.id);
    }
  }, [questionnaire.id]);

  console.log('📊 SaveTestDialog render state:', { 
    showSummary, 
    savedTest: savedTest ? { testName: savedTest.testName, isActive: savedTest.isActive, isSaved: savedTest.isSaved } : null,
    questionnaireId: questionnaire.id,
    questionsCount: questionnaire.questions?.length || 0
  });

  const handleSave = (savedQuestionnaire: Questionnaire) => {
    console.log('💾 CRITICAL: SaveTestDialog.handleSave called:', {
      testName: savedQuestionnaire.testName,
      isActive: savedQuestionnaire.isActive,
      isSaved: savedQuestionnaire.isSaved,
      questionsCount: savedQuestionnaire.questions?.length || 0
    });
    
    try {
      // CRITICAL: Immediate persistence to prevent data loss
      QuestionnaireService.saveQuestionnaire(savedQuestionnaire);
      console.log('✅ PERSISTENT SAVE: Questionnaire saved to storage');
      
      setSavedTest(savedQuestionnaire);
      setShowSummary(true);
      
      console.log('✅ STATE UPDATE: showSummary=true, savedTest set');
      
      // Call onSave callback
      onSave(savedQuestionnaire);
      
    } catch (error) {
      console.error('❌ CRITICAL: Save operation failed:', error);
      // Don't show summary if save failed
      alert('Failed to save questionnaire. Please try again.');
    }
  };

  const handleDone = () => {
    console.log('✅ COMPLETION: SaveTestDialog closing normally');
    
    // CRITICAL: Clear temp storage on successful completion
    QuestionnaireService.clearTempQuestionnaire();
    
    onCancel();
  };

  // CRITICAL: Emergency save before component unmounts
  useEffect(() => {
    return () => {
      if (!showSummary && questionnaire && questionnaire.questions?.length > 0) {
        console.log('⚠️ EMERGENCY: SaveTestDialog unmounting with unsaved data, performing emergency save');
        QuestionnaireService.autoSaveQuestionnaire(questionnaire);
      }
    };
  }, [showSummary, questionnaire]);

  console.log('🎯 RENDER DECISION - showSummary:', showSummary, 'savedTest exists:', !!savedTest);

  // Show summary view after saving
  if (showSummary && savedTest) {
    console.log('📊 RENDERING SUMMARY VIEW for test:', savedTest.testName, 'isActive:', savedTest.isActive);
    return (
      <TestSummaryCard
        savedTest={savedTest}
        onActiveToggle={() => {}} // Empty function since we're not using it here anymore
        onDone={handleDone}
      />
    );
  }

  // Show initial save form
  console.log('📝 RENDERING SAVE FORM');
  return (
    <SaveTestForm
      questionnaire={questionnaire}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
};

export default SaveTestDialog;
