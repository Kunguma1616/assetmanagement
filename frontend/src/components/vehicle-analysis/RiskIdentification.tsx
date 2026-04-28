import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { vehicleData, getTotalCost, getFleetAverageCost, getHighCostVehicles, getRisingCostVehicles } from "@/data/vehicleMockData";

export const RiskIdentification = () => {
  const averageCost = getFleetAverageCost();
  const highCostVehicles = getHighCostVehicles();
  const risingCostVehicles = getRisingCostVehicles();

  // Deduplicate vehicles that appear in both lists
  const allRiskVehicles = [...new Set([
    ...highCostVehicles.map(v => v.id),
    ...risingCostVehicles.map(v => v.id)
  ])];

  const riskVehiclesData = allRiskVehicles.map(id => {
    const vehicle = vehicleData.find(v => v.id === id)!;
    const isHighCost = highCostVehicles.some(v => v.id === id);
    const isRising = risingCostVehicles.some(v => v.id === id);
    const totalCost = getTotalCost(vehicle);
    const percentAboveAvg = ((totalCost - averageCost) / averageCost * 100).toFixed(0);

    return {
      ...vehicle,
      isHighCost,
      isRising,
      totalCost,
      percentAboveAvg
    };
  }).sort((a, b) => b.totalCost - a.totalCost);

  if (riskVehiclesData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            High-Cost & Risk Identification
          </CardTitle>
          <CardDescription>
            Vehicles flagged for cost concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>All Clear!</AlertTitle>
            <AlertDescription>
              No vehicles are currently flagged for high costs or rising trends.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          High-Cost & Risk Identification
        </CardTitle>
        <CardDescription>
          {riskVehiclesData.length} vehicles flagged for attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {riskVehiclesData.map(vehicle => (
            <div 
              key={vehicle.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5 gap-3"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{vehicle.id}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{vehicle.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {vehicle.isHighCost && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      High Cost ({vehicle.percentAboveAvg}% above avg)
                    </Badge>
                  )}
                  {vehicle.isRising && (
                    <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
                      <TrendingUp className="h-3 w-3" />
                      Rising Risk
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-destructive">
                  ${vehicle.totalCost.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Annual Cost
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
