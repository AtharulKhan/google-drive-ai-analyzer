
import React, { useRef, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
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
      <Label htmlFor="prompt">Prompt (Instructions for AI)</Label>
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
    </div>
  );
}
