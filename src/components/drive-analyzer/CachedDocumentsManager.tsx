
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Trash2, Download, Eye, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCachedDocuments,
  removeDocumentFromCache,
  clearAllCachedDocuments,
  getCacheStats,
  updateDocumentPromptInclusion,
  CachedDocument,
} from '@/utils/local-cache';

export function CachedDocumentsManager() {
  const [cachedDocuments, setCachedDocuments] = useState<CachedDocument[]>([]);
  const [cacheStats, setCacheStats] = useState({ totalDocuments: 0, totalSize: 0, formattedSize: '0 Bytes' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<CachedDocument | null>(null);

  const loadCachedDocuments = () => {
    const documents = getCachedDocuments();
    setCachedDocuments(documents);
    setCacheStats(getCacheStats());
  };

  useEffect(() => {
    loadCachedDocuments();
  }, []);

  const handleDeleteDocument = (documentId: string) => {
    setDeleteTargetId(documentId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      removeDocumentFromCache(deleteTargetId);
      loadCachedDocuments();
      toast.success('Document removed from cache');
    }
    setIsDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const handleClearAll = () => {
    setIsClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    clearAllCachedDocuments();
    loadCachedDocuments();
    toast.success('All cached documents cleared');
    setIsClearAllDialogOpen(false);
  };

  const handleDownloadDocument = (doc: CachedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePromptInclusionChange = (documentId: string, checked: boolean) => {
    updateDocumentPromptInclusion(documentId, checked);
    loadCachedDocuments();
    toast.success(checked ? 'Document will be included in prompts' : 'Document removed from auto-prompts');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'google': return 'text-blue-500';
      case 'local': return 'text-green-500';
      case 'url': return 'text-purple-500';
      case 'text': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const documentsInPrompts = cachedDocuments.filter(doc => doc.includeInPrompts).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cached Documents</CardTitle>
          <CardDescription>
            Documents saved locally for quick access. Check the boxes to automatically include documents in all AI prompts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
              <Badge variant="outline">
                {cacheStats.totalDocuments} documents
              </Badge>
              <Badge variant="outline">
                {cacheStats.formattedSize} total
              </Badge>
              <Badge variant={documentsInPrompts > 0 ? "default" : "secondary"}>
                {documentsInPrompts} in auto-prompts
              </Badge>
            </div>
            {cachedDocuments.length > 0 && (
              <Button variant="destructive" onClick={handleClearAll}>
                <XCircle className="mr-2 h-4 w-4" />
                Clear All Cache
              </Button>
            )}
          </div>

          <ScrollArea className="h-96 border rounded-md p-4">
            {cachedDocuments.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No documents cached yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cachedDocuments.map((document) => (
                  <Card key={document.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <Checkbox
                          checked={document.includeInPrompts || false}
                          onCheckedChange={(checked) => 
                            handlePromptInclusionChange(document.id, checked === true)
                          }
                          title="Include in all AI prompts"
                        />
                        <FileText className={`h-4 w-4 ${getTypeColor(document.type)}`} />
                        <span className="font-medium truncate">{document.name}</span>
                        <Badge variant="secondary" className="capitalize">
                          {document.type}
                        </Badge>
                        {document.mimeType && (
                          <Badge variant="outline" className="text-xs">
                            {document.mimeType.split('/').pop()}
                          </Badge>
                        )}
                        {document.includeInPrompts && (
                          <Badge variant="default" className="text-xs">
                            Auto-prompt
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadDocument(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Cached: {new Date(document.cachedAt).toLocaleString()}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cached Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the document from your local cache.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Cached Documents?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove all documents from your local cache.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Dialog */}
      {viewingDocument && (
        <AlertDialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
          <AlertDialogContent className="max-w-4xl h-[80vh]">
            <AlertDialogHeader>
              <AlertDialogTitle>{viewingDocument.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Type: {viewingDocument.type} • 
                Cached: {new Date(viewingDocument.cachedAt).toLocaleString()}
                {viewingDocument.includeInPrompts && " • Auto-included in prompts"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="flex-1 border rounded-md p-4">
              <pre className="whitespace-pre-wrap text-sm">{viewingDocument.content}</pre>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
