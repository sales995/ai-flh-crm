import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import Auth from "./pages/Auth";
import Bootstrap from "./pages/Bootstrap";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Supply from "./pages/Supply";
import Activities from "./pages/Activities";
import Matchings from "./pages/Matchings";
import Users from "./pages/Users";
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
          <Route path="/bootstrap" element={<Bootstrap />} />
          <Route element={<Layout />}>
            <Route path="/" element={<UnifiedDashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/supply" element={<Supply />} />
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
