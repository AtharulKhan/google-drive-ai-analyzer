
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { FileText, Search, Plus } from "lucide-react";
import { templates, getTemplatesByCategory, searchTemplates, Template } from "@/data/templates";

interface TemplatesProps {
  onTemplateSelect: (template: Template) => void;
}

export function Templates({ onTemplateSelect }: TemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const filteredTemplates = searchTemplates(searchQuery);
  const templatesByCategory = getTemplatesByCategory();

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <FileText className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Templates</SheetTitle>
          <SheetDescription>
            Choose from pre-built templates to enhance your AI prompts.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="template-search">Search Templates</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="template-search"
                placeholder="Search by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Separator />

          {/* Templates List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {searchQuery ? (
                // Show search results
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Search Results ({filteredTemplates.length})
                  </h3>
                  {filteredTemplates.length > 0 ? (
                    <div className="space-y-2">
                      {filteredTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleTemplateClick(template)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{template.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.content.substring(0, 100)}...
                              </p>
                              <div className="flex gap-1 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                                {template.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="shrink-0">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No templates found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              ) : (
                // Show by categories
                Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">
                      {category} ({categoryTemplates.length})
                    </h3>
                    <div className="space-y-2">
                      {categoryTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleTemplateClick(template)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{template.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.content.substring(0, 100)}...
                              </p>
                              <div className="flex gap-1 mt-2">
                                {template.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="shrink-0">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
