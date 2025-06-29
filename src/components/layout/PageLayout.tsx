
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
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-sm border-b border-border/50 flex items-center px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-lg font-bold text-foreground">Drive AI Analyzer</span>
          </div>
        </div>
      )}
      
      <Navbar />
      
      <div className="flex-1 overflow-y-auto animate-fade-in">
        <div className={`mx-auto py-4 transition-all duration-300 ${
          isMobile 
            ? 'px-4 max-w-full w-full mt-16' // Add top margin for mobile header
            : 'px-6 max-w-7xl container'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
