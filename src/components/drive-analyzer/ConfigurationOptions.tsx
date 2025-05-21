
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ConfigurationOptionsProps {
  aiModel: string;
  setAiModel: (value: string) => void;
  maxFiles: number;
  setMaxFiles: (value: number) => void;
  includeSubfolders: boolean;
  setIncludeSubfolders: (value: boolean) => void;
  maxDocChars: number;
}

export function ConfigurationOptions({
  aiModel,
  setAiModel,
  maxFiles,
  setMaxFiles,
  includeSubfolders,
  setIncludeSubfolders,
  maxDocChars
}: ConfigurationOptionsProps) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="model">AI Model</Label>
          <Input
            id="model"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder="OpenRouter model"
          />
        </div>
        <div>
          <Label htmlFor="maxFiles">
            Max Files (for folder selection)
          </Label>
          <Input
            id="maxFiles"
            type="number"
            min="1"
            max="100"
            value={maxFiles}
            onChange={(e) => setMaxFiles(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeSubfolders"
          checked={includeSubfolders}
          onCheckedChange={(checked) =>
            setIncludeSubfolders(!!checked)
          }
        />
        <Label htmlFor="includeSubfolders">
          Include Subfolders (when selecting folder)
        </Label>
      </div>

      <Alert variant="default" className="bg-muted/50">
        <AlertTitle>Processing Information</AlertTitle>
        <AlertDescription>
          Files will be processed up to{" "}
          {maxDocChars.toLocaleString()} characters each. When
          selecting a folder, up to {maxFiles} most recent files will
          be processed.
        </AlertDescription>
      </Alert>
    </div>
  );
}
