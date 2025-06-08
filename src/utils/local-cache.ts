
/**
 * Utility functions for managing local document cache
 */

export interface CachedDocument {
  id: string;
  name: string;
  type: 'google' | 'local' | 'url' | 'text';
  content: string;
  mimeType?: string;
  size?: number;
  cachedAt: number;
  originalId?: string; // For Google Drive files
}

const CACHE_KEY = 'drive-analyzer-document-cache';

/**
 * Get all cached documents from localStorage
 */
export function getCachedDocuments(): CachedDocument[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error loading cached documents:', error);
    return [];
  }
}

/**
 * Save a document to local cache
 */
export function saveDocumentToCache(document: Omit<CachedDocument, 'id' | 'cachedAt'>): string {
  const cachedDocuments = getCachedDocuments();
  const newDocument: CachedDocument = {
    ...document,
    id: `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cachedAt: Date.now(),
  };
  
  const updatedDocuments = [newDocument, ...cachedDocuments];
  localStorage.setItem(CACHE_KEY, JSON.stringify(updatedDocuments));
  
  return newDocument.id;
}

/**
 * Remove a document from cache by ID
 */
export function removeDocumentFromCache(documentId: string): void {
  const cachedDocuments = getCachedDocuments();
  const filteredDocuments = cachedDocuments.filter(doc => doc.id !== documentId);
  localStorage.setItem(CACHE_KEY, JSON.stringify(filteredDocuments));
}

/**
 * Clear all cached documents
 */
export function clearAllCachedDocuments(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get cached document by ID
 */
export function getCachedDocumentById(documentId: string): CachedDocument | null {
  const cachedDocuments = getCachedDocuments();
  return cachedDocuments.find(doc => doc.id === documentId) || null;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const documents = getCachedDocuments();
  const totalSize = documents.reduce((sum, doc) => sum + (doc.size || doc.content.length), 0);
  
  return {
    totalDocuments: documents.length,
    totalSize,
    formattedSize: formatBytes(totalSize),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
