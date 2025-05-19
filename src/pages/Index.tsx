
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { FileText, BarChart2 } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulating data loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <PageLayout 
      title="Tableau de bord" 
      description="Vue d'ensemble de votre exploitation agricole"
    >
      {/* Add button to access Drive Analyzer */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/drive-analyzer')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          <span>Google Drive AI Analyzer</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/statistiques')}
          className="flex items-center gap-2"
        >
          <BarChart2 className="h-4 w-4" />
          <span>Statistiques</span>
        </Button>
      </div>
      
      <Dashboard />
    </PageLayout>
  );
}
