
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
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900">
      <Navbar />
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0 animate-fade-in">
        <div className={`mx-auto py-4 transition-all duration-300 ${
          isMobile 
            ? 'px-0 max-w-full w-full' 
            : 'px-6 max-w-7xl container'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
