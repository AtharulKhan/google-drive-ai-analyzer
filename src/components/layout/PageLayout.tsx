
import React, { ReactNode } from 'react';
import Navbar from '../Navbar';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const PageLayout = ({ children, title, description }: PageLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className={`container mx-auto px-3 py-4 md:px-6 ${isMobile ? 'max-w-full' : 'max-w-7xl'}`}>
          {(title || description) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold mb-2">{title}</h1>}
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
