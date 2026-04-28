import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { vehicleData, getTotalCost, getFleetAverageCost, getHighCostVehicles } from "@/data/vehicleMockData";

export const SummaryCards = () => {
  const totalVehicles = vehicleData.length;
  const totalFleetCost = vehicleData.reduce((sum, v) => sum + getTotalCost(v), 0);
  const averageCost = getFleetAverageCost();
  const highCostCount = getHighCostVehicles().length;

  const highestCostVehicle = vehicleData.reduce((max, v) => 
    getTotalCost(v) > getTotalCost(max) ? v : max
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          <Car className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalVehicles}</div>
          <p className="text-xs text-muted-foreground">Active in fleet</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Fleet Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalFleetCost.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Annual lifecycle cost</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${Math.round(averageCost).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Per vehicle annually</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Cost Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{highCostCount}</div>
          <p className="text-xs text-muted-foreground">
            Highest: {highestCostVehicle.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
