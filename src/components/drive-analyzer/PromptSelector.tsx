import React, { useRef, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Maximize2, ChevronDown } from "lucide-react";
import { SavedPrompt } from "./SavedPrompts";
import { searchTemplates, Template } from "@/data/templates";

interface PromptSelectorProps {
  userPrompt: string;
  onUserPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPromptCommandOpen: boolean;
  savedPrompts: SavedPrompt[];
  onInsertPrompt: (prompt: SavedPrompt) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function PromptSelector({
  userPrompt,
  onUserPromptChange,
  isPromptCommandOpen,
  savedPrompts,
  onInsertPrompt,
  textareaRef
}: PromptSelectorProps) {
  const [isTemplateCommandOpen, setIsTemplateCommandOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState("");
  const [isPromptSectionOpen, setIsPromptSectionOpen] = useState(false);

  // Initialize expanded prompt when dialog opens
  useEffect(() => {
    if (isPromptDialogOpen) {
      setExpandedPrompt(userPrompt);
    }
  }, [isPromptDialogOpen, userPrompt]);

  // Handle template command detection
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    
    // Check for "!" command
    const beforeCursor = value.substring(0, cursor);
    const templateMatch = beforeCursor.match(/!\s?(\w*)$/);
    
    if (templateMatch) {
      setIsTemplateCommandOpen(true);
      setTemplateSearchQuery(templateMatch[1] || "");
      setCursorPosition(cursor);
    } else {
      setIsTemplateCommandOpen(false);
      setTemplateSearchQuery("");
    }
    
    onUserPromptChange(e);
  };

  const handleExpandedPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setExpandedPrompt(newValue);
    
    // Create synthetic event to update main prompt
    const syntheticEvent = {
      target: { value: newValue }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onUserPromptChange(syntheticEvent);
  };

  const handleTemplateSelect = (template: Template) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const value = textarea.value;
    const cursor = cursorPosition;
    
    // Find the "!" command start position
    const beforeCursor = value.substring(0, cursor);
    const templateMatch = beforeCursor.match(/!\s?(\w*)$/);
    
    if (templateMatch) {
      const commandStart = cursor - templateMatch[0].length;
      const beforeCommand = value.substring(0, commandStart);
      const afterCursor = value.substring(cursor);
      
      // Insert template content
      const newValue = beforeCommand + template.content + afterCursor;
      
      // Create a synthetic event to update the value
      const syntheticEvent = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      onUserPromptChange(syntheticEvent);
      
      // Set cursor position after insertion
      setTimeout(() => {
        const newCursorPos = commandStart + template.content.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
    
    setIsTemplateCommandOpen(false);
    setTemplateSearchQuery("");
  };

  const filteredTemplates = searchTemplates(templateSearchQuery);

  return (
    <div className="relative">
      <Collapsible open={isPromptSectionOpen} onOpenChange={setIsPromptSectionOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-2 h-auto text-muted-foreground hover:text-foreground"
          >
            <Label className="cursor-pointer">Prompt (Instructions for AI)</Label>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isPromptSectionOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="flex items-center justify-end">
            <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Expand
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Prompt (Instructions for AI) - Full Screen Editor</DialogTitle>
                </DialogHeader>
                <div className="flex-1 space-y-4">
                  <Textarea
                    value={expandedPrompt}
                    onChange={handleExpandedPromptChange}
                    placeholder="What would you like the AI to do with the selected documents? Type '!' to insert templates or '@' for saved prompts."
                    className="resize-none h-[60vh]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Type '!' to insert templates or '@' for saved prompts. Changes are synced with the main prompt field.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Textarea
            id="prompt"
            value={userPrompt}
            onChange={handleTextareaChange}
            placeholder="What would you like the AI to do with the selected documents? Type '!' to insert templates or '@' for saved prompts."
            rows={3}
            ref={textareaRef}
          />
          
          {/* Saved Prompts Command */}
          {isPromptCommandOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-2 z-10">
              <Command className="border shadow-md rounded-lg">
                <CommandInput placeholder="Search saved prompts..." />
                <CommandList>
                  <CommandEmpty>No saved prompts found</CommandEmpty>
                  <CommandGroup heading="Saved Prompts">
                    {savedPrompts.map(prompt => (
                      <CommandItem 
                        key={prompt.id} 
                        onSelect={() => onInsertPrompt(prompt)}
                        className="flex items-center justify-between"
                      >
                        <span>{prompt.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}

          {/* Templates Command */}
          {isTemplateCommandOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-2 z-10">
              <Command className="border shadow-md rounded-lg">
                <CommandInput 
                  placeholder="Search templates..." 
                  value={templateSearchQuery}
                  onValueChange={setTemplateSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No templates found</CommandEmpty>
                  <CommandGroup heading="Templates">
                    {filteredTemplates.slice(0, 5).map(template => (
                      <CommandItem 
                        key={template.id} 
                        onSelect={() => handleTemplateSelect(template)}
                        className="flex flex-col items-start p-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{template.title}</span>
                          <span className="text-xs text-muted-foreground">{template.category}</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {template.content.substring(0, 80)}...
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
