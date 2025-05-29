import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Trash2, Eye, XCircle } from 'lucide-react';
import { SavedAnalysis, SavedAnalysisSource } from '@/components/drive-analyzer/SavedAnalysisDetailView';

interface SavedAnalysesSidebarProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  savedAnalyses: SavedAnalysis[];
  onViewAnalysis: (analysis: SavedAnalysis) => void;
  onRenameAnalysis: (id: string, newTitle: string) => void;
  onDeleteAnalysis: (id: string) => void;
  onDeleteAllAnalyses: () => void;
  selectedAnalysisIdsForPrompt: string[];
  toggleAnalysisSelectionForPrompt: (analysisId: string) => void;
}

export function SavedAnalysesSidebar({
  isOpen,
  onOpenChange,
  savedAnalyses,
  onViewAnalysis,
  onRenameAnalysis,
  onDeleteAnalysis,
  onDeleteAllAnalyses,
  selectedAnalysisIdsForPrompt,
  toggleAnalysisSelectionForPrompt,
}: SavedAnalysesSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitleInput, setNewTitleInput] = useState<string>('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const handleStartRename = (analysis: SavedAnalysis) => {
    setRenamingId(analysis.id);
    setNewTitleInput(analysis.title);
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setNewTitleInput('');
  };

  const handleSaveRename = () => {
    if (renamingId && newTitleInput.trim() !== '') {
      onRenameAnalysis(renamingId, newTitleInput.trim());
      setRenamingId(null);
      setNewTitleInput('');
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      onDeleteAnalysis(deleteTargetId);
      setDeleteTargetId(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const openDeleteAllConfirmation = () => {
    setIsDeleteAllDialogOpen(true);
  };

  const confirmDeleteAll = () => {
    onDeleteAllAnalyses();
    setIsDeleteAllDialogOpen(false);
  };

  const getSourceSummary = (sources: SavedAnalysisSource[]) => {
    if (!sources || sources.length === 0) return 'No sources';
    const summary = sources.map(s => (s.type === 'text' ? 'Pasted Text' : s.name)).join(', ');
    return summary.length > 50 ? summary.substring(0, 47) + '...' : summary;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader className="pr-6">
          <SheetTitle>Saved Analyses</SheetTitle>
          <SheetDescription>View, rename, or delete your past AI analyses.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow h-[calc(100vh-200px)] pr-1"> {/* Adjusted height and pr */}
          {savedAnalyses.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No analyses saved yet.</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {savedAnalyses.map(analysis => (
                <Card key={analysis.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    {renamingId === analysis.id ? (
                      <div className="space-y-2">
                        <Input
                          value={newTitleInput}
                          onChange={(e) => setNewTitleInput(e.target.value)}
                          placeholder="Enter new title"
                          className="h-8"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveRename} className="h-7">Save</Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelRename} className="h-7">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <CardTitle className="text-lg flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`select-analysis-${analysis.id}`}
                            checked={selectedAnalysisIdsForPrompt.includes(analysis.id)}
                            onCheckedChange={() => toggleAnalysisSelectionForPrompt(analysis.id)}
                          />
                          <label htmlFor={`select-analysis-${analysis.id}`} className="cursor-pointer">{analysis.title}</label>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleStartRename(analysis)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    )}
                     <p className="text-xs text-muted-foreground pt-1">
                      Saved: {new Date(analysis.timestamp).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h5 className="text-sm font-semibold mb-1">Sources:</h5>
                      <div className="flex flex-wrap gap-1">
                        {analysis.sources.slice(0, 3).map((src, idx) => (
                           <Badge key={idx} variant="secondary" className="truncate max-w-[150px]">
                             {src.type === 'text' ? 'Pasted Text' : src.name}
                           </Badge>
                        ))}
                        {analysis.sources.length > 3 && (
                           <Badge variant="outline">+{analysis.sources.length - 3} more</Badge>
                        )}
                         {analysis.sources.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onViewAnalysis(analysis)}>
                        <Eye className="mr-1 h-4 w-4" /> View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteConfirmation(analysis.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        <SheetFooter className="mt-auto border-t pt-4 pr-6">
          {savedAnalyses.length > 0 && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={openDeleteAllConfirmation}
            >
              <XCircle className="mr-2 h-4 w-4" /> Delete All Analyses
            </Button>
          )}
           <SheetClose asChild>
             <Button variant="outline" className="w-full">Close</Button>
           </SheetClose>
        </SheetFooter>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this analysis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all saved analyses?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your saved analyses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAllDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
