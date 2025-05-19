
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import Index from './pages/Index';
import ParcelsPage from './pages/ParcelsPage';
import ParcelsDetailsPage from './pages/ParcelsDetailsPage';
import CropsPage from './pages/CropsPage';
import InventoryPage from './pages/InventoryPage';
import FinancePage from './pages/FinancePage';
import StatsPage from './pages/StatsPage';
import NotFound from './pages/NotFound';
import DriveAnalyzerPage from './pages/DriveAnalyzerPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/drive-analyzer" replace />} />
        <Route path="/parcelles" element={<ParcelsPage />} />
        <Route path="/parcelles/:id" element={<ParcelsDetailsPage />} />
        <Route path="/cultures" element={<CropsPage />} />
        <Route path="/inventaire" element={<InventoryPage />} />
        <Route path="/finances" element={<FinancePage />} />
        <Route path="/statistiques" element={<StatsPage />} />
        <Route path="/drive-analyzer" element={<DriveAnalyzerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SonnerToaster position="top-right" />
      <Toaster />
    </Router>
  );
}

export default App;
