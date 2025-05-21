
import React, { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { SavedPrompt } from "./SavedPrompts";

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
  return (
    <div className="relative">
      <Label htmlFor="prompt">Prompt (Instructions for AI)</Label>
      <Textarea
        id="prompt"
        value={userPrompt}
        onChange={onUserPromptChange}
        placeholder="What would you like the AI to do with the selected documents?"
        rows={3}
        ref={textareaRef}
      />
      
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
    </div>
  );
}
