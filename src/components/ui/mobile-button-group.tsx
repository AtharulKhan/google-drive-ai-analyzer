
import React, { useState } from 'react';
import { Button } from './button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileButtonGroupProps {
  children: React.ReactNode[];
  visibleCount?: number;
  className?: string;
}

export function MobileButtonGroup({ 
  children, 
  visibleCount = 3, 
  className 
}: MobileButtonGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const visibleButtons = isExpanded ? children : children.slice(0, visibleCount);
  const hasMore = children.length > visibleCount;

  return (
    <div className={cn("mobile-button-group", className)}>
      <div className="flex flex-wrap gap-2 justify-center items-center">
        {visibleButtons.map((button, index) => (
          <div 
            key={index} 
            className={cn(
              "stagger-animation mobile-button-expandable",
              `animate-stagger-${Math.min(index + 1, 4)}`
            )}
          >
            {button}
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full h-8 w-8 p-0 bg-white/80 backdrop-blur-sm border border-white/40 hover:bg-white/90 transition-all duration-300"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
