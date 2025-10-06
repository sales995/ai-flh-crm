import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Package, Sparkles } from "lucide-react";
import DemandDashboard from "./Dashboard";
import SupplyAnalytics from "./SupplyAnalytics";
import MatchMakingDashboard from "./MatchMakingDashboard";

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState("demand");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive insights across Demand, Supply, and Match Making
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="demand" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Demand
          </TabsTrigger>
          <TabsTrigger value="supply" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Supply
          </TabsTrigger>
          <TabsTrigger value="matchmaking" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Match Making
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demand" className="space-y-6">
          <DemandDashboard />
        </TabsContent>

        <TabsContent value="supply" className="space-y-6">
          <SupplyAnalytics />
        </TabsContent>

        <TabsContent value="matchmaking" className="space-y-6">
          <MatchMakingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
