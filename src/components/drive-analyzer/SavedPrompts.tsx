
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Save, Trash2, Menu } from "lucide-react";
import { toast } from "sonner";

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

interface SavedPromptsProps {
  savedPrompts: SavedPrompt[];
  newPromptTitle: string;
  setNewPromptTitle: (title: string) => void;
  newPromptContent: string;
  setNewPromptContent: (content: string) => void;
  onSavePrompt: () => void;
  onDeletePrompt: (id: string) => void;
}

export function SavedPrompts({
  savedPrompts,
  newPromptTitle,
  setNewPromptTitle,
  newPromptContent,
  setNewPromptContent,
  onSavePrompt,
  onDeletePrompt
}: SavedPromptsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Saved Prompts</SheetTitle>
          <SheetDescription>
            Create and manage your saved prompts for quick access.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Add new prompt form */}
          <div className="space-y-4">
            <h3 className="font-medium">Add New Prompt</h3>
            <div className="grid gap-2">
              <Label htmlFor="promptTitle">Title</Label>
              <Input 
                id="promptTitle" 
                value={newPromptTitle}
                onChange={(e) => setNewPromptTitle(e.target.value)} 
                placeholder="Enter a title for your prompt"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promptContent">Content</Label>
              <Textarea 
                id="promptContent" 
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)} 
                placeholder="Enter the prompt content"
                rows={4}
              />
            </div>
            <Button 
              onClick={onSavePrompt} 
              className="w-full"
              disabled={!newPromptTitle.trim() || !newPromptContent.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Prompt
            </Button>
          </div>
          
          <Separator />
          
          {/* Saved prompts list */}
          <div className="space-y-4">
            <h3 className="font-medium">Your Saved Prompts</h3>
            {savedPrompts.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {savedPrompts.map((prompt) => (
                    <div 
                      key={prompt.id} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{prompt.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {prompt.content.length > 50
                            ? prompt.content.substring(0, 50) + "..."
                            : prompt.content}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onDeletePrompt(prompt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No saved prompts yet. Add one above!
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
