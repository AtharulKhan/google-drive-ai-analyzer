
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
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100 dark:bg-slate-900">
      <Navbar />
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="min-h-full bg-gradient-to-br from-white via-slate-50 to-blue-50/50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900">
          <div className={`min-h-full ${
            isMobile 
              ? 'px-4 py-6' 
              : 'px-8 py-8'
          }`}>
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20 p-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
