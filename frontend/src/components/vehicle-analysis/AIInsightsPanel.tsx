import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle, Fuel, Wrench } from "lucide-react";
import { vehicleData, getTotalCost, getFleetAverageCost, getHighCostVehicles, getRisingCostVehicles } from "@/data/vehicleMockData";

interface Insight {
  type: 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const AIInsightsPanel = () => {
  const averageCost = getFleetAverageCost();
  const highCostVehicles = getHighCostVehicles();
  const risingCostVehicles = getRisingCostVehicles();

  // Find most/least efficient vehicles
  const sortedByTotalCost = [...vehicleData].sort((a, b) => getTotalCost(a) - getTotalCost(b));
  const mostEfficient = sortedByTotalCost[0];
  const leastEfficient = sortedByTotalCost[sortedByTotalCost.length - 1];

  // Calculate highest fuel cost vehicle
  const highestFuelVehicle = vehicleData.reduce((max, v) => 
    v.costs.fuel > max.costs.fuel ? v : max
  );
  const avgFuelCost = vehicleData.reduce((sum, v) => sum + v.costs.fuel, 0) / vehicleData.length;
  const fuelPercentAboveAvg = ((highestFuelVehicle.costs.fuel - avgFuelCost) / avgFuelCost * 100).toFixed(0);


  const insights: Insight[] = [
    {
      type: 'warning',
      icon: <Fuel className="h-4 w-4" />,
      title: `${highestFuelVehicle.name} has highest fuel costs`,
      description: `At $${highestFuelVehicle.costs.fuel.toLocaleString()}/year, fuel costs are ${fuelPercentAboveAvg}% above the fleet average. Consider route optimization or vehicle replacement.`
    },
    {
      type: 'warning',
      icon: <Wrench className="h-4 w-4" />,
      title: `${risingCostVehicles.length} vehicles show rising repair costs`,
      description: risingCostVehicles.length > 0 
        ? `${risingCostVehicles.map(v => v.id).join(', ')} have costs trending upward. Consider scheduling preventive inspections.`
        : 'All vehicles have stable or declining cost trends.'
    },
    {
      type: 'success',
      icon: <CheckCircle className="h-4 w-4" />,
      title: `${mostEfficient.name} is your most cost-efficient`,
      description: `Total annual cost of $${getTotalCost(mostEfficient).toLocaleString()} is ${((1 - getTotalCost(mostEfficient) / averageCost) * 100).toFixed(0)}% below fleet average. This ${mostEfficient.year} ${mostEfficient.type} sets the efficiency benchmark.`
    },
    {
      type: 'info',
      icon: <AlertCircle className="h-4 w-4" />,
      title: `${leastEfficient.name} needs attention`,
      description: `With $${getTotalCost(leastEfficient).toLocaleString()} in annual costs (${((getTotalCost(leastEfficient) / averageCost - 1) * 100).toFixed(0)}% above average), primarily from ${leastEfficient.costs.repairs > leastEfficient.costs.fuel ? 'repairs' : 'fuel'}. Review for potential replacement.`
    },
    {
      type: 'info',
      icon: <TrendingUp className="h-4 w-4" />,
      title: 'Fleet cost summary',
      description: `Your ${vehicleData.length}-vehicle fleet costs $${vehicleData.reduce((sum, v) => sum + getTotalCost(v), 0).toLocaleString()}/year. ${highCostVehicles.length} vehicles exceed the $${Math.round(averageCost * 1.2).toLocaleString()} high-cost threshold.`
    }
  ];

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  const getBadgeVariant = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return 'outline';
      case 'success':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          AI Insights
        </CardTitle>
        <CardDescription>
          Plain-English analysis of your fleet costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getInsightStyles(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-muted-foreground">
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <Badge variant={getBadgeVariant(insight.type)} className="text-xs">
                      {insight.type === 'warning' ? 'Action Needed' : 
                       insight.type === 'success' ? 'Performing Well' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
