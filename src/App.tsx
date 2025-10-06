import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Builders from "./pages/Builders";
import Projects from "./pages/Projects";
import Activities from "./pages/Activities";
import Matchings from "./pages/Matchings";
import SupplyDashboard from "./pages/SupplyDashboard";
import Users from "./pages/Users";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<SetupAdmin />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/supply" element={<SupplyDashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/builders" element={<Builders />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/matchings" element={<Matchings />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
