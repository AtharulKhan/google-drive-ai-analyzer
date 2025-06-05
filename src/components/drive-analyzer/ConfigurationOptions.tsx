
import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AI_MODELS, getDefaultAIModel, savePreferredAIModel } from "@/utils/ai-models";

interface ConfigurationOptionsProps {
  aiModel: string;
  setAiModel: (value: string) => void;
  maxFiles: number;
  setMaxFiles: (value: number) => void;
  includeSubfolders: boolean;
  setIncludeSubfolders: (value: boolean) => void;
  maxDocChars: number;
  webhookUrl: string;
  handleWebhookUrlChange: (value: string) => void;
}

export function ConfigurationOptions({
  aiModel,
  setAiModel,
  maxFiles,
  setMaxFiles,
  includeSubfolders,
  setIncludeSubfolders,
  maxDocChars,
  webhookUrl,
  handleWebhookUrlChange,
}: ConfigurationOptionsProps) {
  // Load the preferred model from localStorage on component mount
  useEffect(() => {
    const savedModel = getDefaultAIModel();
    if (savedModel) {
      setAiModel(savedModel);
    }
  }, [setAiModel]);

  const handleModelChange = (value: string) => {
    setAiModel(value);
    savePreferredAIModel(value);
  };
  
  return (
    <div className="grid gap-4">
      <div>
        <Label htmlFor="webhookUrl">Webhook URL (Optional, Saved Automatically)</Label>
        <Input
          id="webhookUrl"
          type="url"
          value={webhookUrl}
          onChange={(e) => handleWebhookUrlChange(e.target.value)}
          placeholder="Enter a URL to send analysis results (e.g., https://api.example.com/webhook)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="model">AI Model</Label>
          <Select value={aiModel} onValueChange={handleModelChange}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
