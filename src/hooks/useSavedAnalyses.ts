
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { SavedAnalysis } from '@/components/drive-analyzer/SavedAnalysisDetailView';

const SAVED_ANALYSES_KEY = "drive-analyzer-saved-analyses";

export default function useSavedAnalyses() {
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysisIdsForPrompt, setSelectedAnalysisIdsForPrompt] = useState<string[]>([]);
  
  // Load saved data from localStorage
  useEffect(() => {
    const loadedAnalyses = localStorage.getItem(SAVED_ANALYSES_KEY);
    if (loadedAnalyses) {
      setSavedAnalyses(JSON.parse(loadedAnalyses));
    }
  }, []);

  // Handle saved analyses operations
  const handleSaveAnalysis = useCallback((analysis: SavedAnalysis) => {
    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = [analysis, ...prevAnalyses];
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      return updatedAnalyses;
    });
    toast.success("Analysis saved successfully!");
  }, []);

  const handleRenameAnalysis = useCallback((id: string, newTitle: string) => {
    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = prevAnalyses.map(analysis =>
        analysis.id === id ? { ...analysis, title: newTitle } : analysis
      );
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      toast.success("Analysis renamed successfully!");
      return updatedAnalyses;
    });
  }, []);
  
  const handleDeleteAnalysis = useCallback((id: string) => {
    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = prevAnalyses.filter(analysis => analysis.id !== id);
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      toast.success("Analysis deleted successfully!");
      return updatedAnalyses;
    });
  }, []);
  
  const handleDeleteAllAnalyses = useCallback(() => {
    setSavedAnalyses([]);
    localStorage.removeItem(SAVED_ANALYSES_KEY);
    toast.success("All saved analyses have been deleted!");
  }, []);

  // Handle selection of saved analyses for prompt
  const toggleAnalysisSelectionForPrompt = useCallback((analysisId: string) => {
    setSelectedAnalysisIdsForPrompt(prevSelectedIds =>
      prevSelectedIds.includes(analysisId)
        ? prevSelectedIds.filter(id => id !== analysisId)
        : [...prevSelectedIds, analysisId]
    );
  }, []);

  const handleImportAnalysis = useCallback((analysisToImport: SavedAnalysis): { success: boolean; message: string } => {
    if (savedAnalyses.some(analysis => analysis.id === analysisToImport.id)) {
      const message = `Analysis with ID "${analysisToImport.id}" already exists.`;
      toast.warning(message);
      return { success: false, message };
    }

    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = [analysisToImport, ...prevAnalyses];
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      return updatedAnalyses;
    });

    const message = `Analysis "${analysisToImport.title}" imported successfully.`;
    toast.success(message);
    return { success: true, message };
  }, [savedAnalyses]);

  return {
    savedAnalyses,
    setSavedAnalyses,
    handleSaveAnalysis,
    handleRenameAnalysis,
    handleDeleteAnalysis,
    handleDeleteAllAnalyses,
    selectedAnalysisIdsForPrompt,
    setSelectedAnalysisIdsForPrompt,
    toggleAnalysisSelectionForPrompt,
    handleImportAnalysis,
  };
}
