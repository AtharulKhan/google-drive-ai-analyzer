
/**
 * Utility functions for processing local files and extracting text content
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const MAX_DOC_CHARS = 200000; // Same limit as Google Drive files

/**
 * Extract text content from a local file
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File ${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 10MB.`);
  }

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  try {
    // Handle text files
    if (fileType.startsWith('text/') || 
        fileType === 'application/json' ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md') ||
        fileName.endsWith('.json') ||
        fileName.endsWith('.csv') ||
        fileName.endsWith('.log')) {
      const text = await file.text();
      return text.slice(0, MAX_DOC_CHARS);
    }

    // Handle other file types that might contain text
    if (fileType === 'application/javascript' ||
        fileType === 'application/typescript' ||
        fileName.endsWith('.js') ||
        fileName.endsWith('.ts') ||
        fileName.endsWith('.jsx') ||
        fileName.endsWith('.tsx') ||
        fileName.endsWith('.css') ||
        fileName.endsWith('.html') ||
        fileName.endsWith('.xml') ||
        fileName.endsWith('.yaml') ||
        fileName.endsWith('.yml')) {
      const text = await file.text();
      return text.slice(0, MAX_DOC_CHARS);
    }

    // For unsupported file types, return a descriptive message
    return `(File ${file.name} of type ${file.type || 'unknown'} is not supported for text extraction. Only text-based files are currently supported.)`;

  } catch (error) {
    console.error(`Error extracting text from file ${file.name}:`, error);
    return `(Error extracting content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'})`;
  }
}

/**
 * Process multiple local files and extract their text content
 */
export async function processLocalFiles(files: File[]): Promise<string[]> {
  const results: string[] = [];

  for (const file of files) {
    try {
      const content = await extractTextFromFile(file);
      results.push(`### Local File: ${file.name}\n${content}`);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      results.push(`### Local File: ${file.name}\n(Error: ${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }

  return results;
}
