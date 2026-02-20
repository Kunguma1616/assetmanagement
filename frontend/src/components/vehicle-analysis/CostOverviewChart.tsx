import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { vehicleData, getTotalCost, getFleetAverageCost } from "@/data/vehicleMockData";

const chartConfig = {
  cost: {
    label: "Total Cost",
  },
};

export const CostOverviewChart = () => {
  const averageCost = getFleetAverageCost();
  
  const data = vehicleData
    .map(v => ({
      id: v.id,
      name: v.name,
      cost: getTotalCost(v),
    }))
    .sort((a, b) => a.cost - b.cost);

  const getCostTier = (cost: number) => {
    if (cost < averageCost * 0.8) return 'hsl(142, 76%, 36%)'; // green
    if (cost < averageCost * 1.2) return 'hsl(48, 96%, 53%)'; // yellow
    return 'hsl(0, 84%, 60%)'; // red
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Lifecycle Cost Overview</CardTitle>
        <CardDescription>
          Vehicles ranked by total cost (Green = Low, Yellow = Average, Red = High)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
            <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <YAxis 
              type="category" 
              dataKey="id" 
              tick={{ fontSize: 12 }}
              width={80}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex flex-col">
                      <span className="font-medium">{item.payload.name}</span>
                      <span>${Number(value).toLocaleString()}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="cost" radius={4}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCostTier(entry.cost)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
