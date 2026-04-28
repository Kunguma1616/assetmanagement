import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { vehicleData } from "@/data/vehicleMockData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(280, 70%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(340, 70%, 50%)',
];

export const CostTrendsChart = () => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([
    vehicleData[0].id,
    vehicleData[1].id,
    vehicleData[2].id
  ]);

  const toggleVehicle = (id: string) => {
    setSelectedVehicles(prev => 
      prev.includes(id) 
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  // Combine all monthly data
  const months = vehicleData[0].monthlyHistory.map(m => m.month);
  const chartData = months.map((month, index) => {
    const dataPoint: Record<string, string | number> = { month: month.split(' ')[0] };
    vehicleData.forEach(v => {
      if (selectedVehicles.includes(v.id)) {
        dataPoint[v.id] = v.monthlyHistory[index].total;
      }
    });
    return dataPoint;
  });

  const chartConfig = vehicleData.reduce((acc, v, i) => {
    acc[v.id] = { label: v.id, color: COLORS[i % COLORS.length] };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const getTrend = (vehicleId: string) => {
    const vehicle = vehicleData.find(v => v.id === vehicleId);
    if (!vehicle) return 'stable';
    
    const history = vehicle.monthlyHistory;
    const firstHalf = history.slice(0, 6).reduce((sum, m) => sum + m.total, 0) / 6;
    const secondHalf = history.slice(6).reduce((sum, m) => sum + m.total, 0) / 6;
    
    if (secondHalf > firstHalf * 1.1) return 'rising';
    if (secondHalf < firstHalf * 0.9) return 'declining';
    return 'stable';
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'rising') return <TrendingUp className="h-3 w-3 text-destructive" />;
    if (trend === 'declining') return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Trends Over Time</CardTitle>
        <CardDescription>
          Monthly cost progression for selected vehicles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-48 shrink-0">
            <p className="text-sm font-medium mb-2">Select Vehicles</p>
            <ScrollArea className="h-[280px] rounded-md border p-3">
              <div className="space-y-2">
                {vehicleData.map((v, i) => (
                  <div key={v.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={v.id}
                      checked={selectedVehicles.includes(v.id)}
                      onCheckedChange={() => toggleVehicle(v.id)}
                    />
                    <Label 
                      htmlFor={v.id} 
                      className="text-sm flex items-center gap-1 cursor-pointer"
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {v.id}
                      <TrendIcon trend={getTrend(v.id)} />
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <ChartContainer config={chartConfig} className="h-[300px] flex-1">
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                }
              />
              <Legend />
              {selectedVehicles.map((vehicleId, index) => (
                <Line
                  key={vehicleId}
                  type="monotone"
                  dataKey={vehicleId}
                  stroke={COLORS[vehicleData.findIndex(v => v.id === vehicleId) % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
