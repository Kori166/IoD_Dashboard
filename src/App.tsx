import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LadProvider } from "@/context/lad-context";
import Overview from "./pages/Overview";
import TimeSeries from "./pages/TimeSeries";
import MapExplorer from "./pages/MapExplorer";
import FeatureAnalysis from "./pages/FeatureAnalysis";
import PipelineMethod from "./pages/PipelineMethod";
import DataSources from "./pages/DataSources";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/time-series" element={<TimeSeries />} />
            <Route path="/map" element={<MapExplorer />} />
            <Route path="/indicators" element={<FeatureAnalysis />} />            
            <Route path="/pipeline" element={<PipelineMethod />} />
            <Route path="/sources" element={<DataSources />} />
            <Route path="/time" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
