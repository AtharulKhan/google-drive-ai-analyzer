
import React, { useState } from 'react';
import { Button } from './button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileButtonGroupProps {
  children: React.ReactNode;
  maxVisible?: number;
  className?: string;
}

export function MobileButtonGroup({ 
  children, 
  maxVisible = 3, 
  className 
}: MobileButtonGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const childrenArray = React.Children.toArray(children);
  const shouldShowToggle = childrenArray.length > maxVisible;
  
  const visibleChildren = isExpanded 
    ? childrenArray 
    : childrenArray.slice(0, maxVisible);

  return (
    <div className={cn("mobile-btn-group", className)}>
      <div className="flex flex-wrap gap-2 justify-center">
        {visibleChildren.map((child, index) => (
          <div 
            key={index}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {child}
          </div>
        ))}
      </div>
      
      {shouldShowToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="expand-trigger mt-2 h-8 w-8 p-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
