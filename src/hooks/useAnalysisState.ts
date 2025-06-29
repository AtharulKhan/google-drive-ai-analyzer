
import useFilesState from './useFilesState';
import useTextInputState from './useTextInputState';
import useCrawlingOptions from './useCrawlingOptions';
import usePromptState from './usePromptState';
import useSavedAnalyses from './useSavedAnalyses';

// Re-export types for convenience
export type { SavedPrompt, ProcessingStatus } from './usePromptState';
export type { SavedAnalysis } from '@/components/drive-analyzer/SavedAnalysisDetailView';

export default function useAnalysisState() {
  const filesState = useFilesState();
  const textInputState = useTextInputState();
  const crawlingOptionsState = useCrawlingOptions();
  const promptState = usePromptState();
  const savedAnalysesState = useSavedAnalyses();

  return {
    // Files
    ...filesState,
    
    // Text/URL inputs
    ...textInputState,
    
    // Crawling options
    ...crawlingOptionsState,
    
    // Analysis state
    ...promptState,
    
    // Saved items
    ...savedAnalysesState,
  };
}
