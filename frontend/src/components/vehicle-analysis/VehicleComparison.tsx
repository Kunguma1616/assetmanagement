import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { vehicleData, getTotalCost, VehicleCostData } from "@/data/vehicleMockData";

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export const VehicleComparison = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    vehicleData[0].id,
    vehicleData[3].id
  ]);

  const addVehicle = (id: string) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeVehicle = (id: string) => {
    setSelectedIds(selectedIds.filter(v => v !== id));
  };

  const availableVehicles = vehicleData.filter(v => !selectedIds.includes(v.id));
  const selectedVehicles = selectedIds
    .map(id => vehicleData.find(v => v.id === id))
    .filter((v): v is VehicleCostData => v !== undefined);

  // Comparison bar chart data
  const comparisonData = [
    {
      category: 'Insurance',
      ...selectedVehicles.reduce((acc, v, i) => ({ ...acc, [v.id]: v.costs.insurance }), {})
    },
    {
      category: 'Repairs',
      ...selectedVehicles.reduce((acc, v, i) => ({ ...acc, [v.id]: v.costs.repairs }), {})
    },
    {
      category: 'Fuel',
      ...selectedVehicles.reduce((acc, v, i) => ({ ...acc, [v.id]: v.costs.fuel }), {})
    },
    {
      category: 'Tax',
      ...selectedVehicles.reduce((acc, v, i) => ({ ...acc, [v.id]: v.costs.tax }), {})
    },
    {
      category: 'Other',
      ...selectedVehicles.reduce((acc, v, i) => ({ ...acc, [v.id]: v.costs.other }), {})
    }
  ];

  // Trend comparison data
  const trendData = vehicleData[0].monthlyHistory.map((m, index) => {
    const point: Record<string, string | number> = { month: m.month.split(' ')[0] };
    selectedVehicles.forEach(v => {
      point[v.id] = v.monthlyHistory[index].total;
    });
    return point;
  });

  const chartConfig = selectedVehicles.reduce((acc, v, i) => {
    acc[v.id] = { label: `${v.id} - ${v.name}`, color: COLORS[i] };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Comparison Tool</CardTitle>
        <CardDescription>
          Compare up to 4 vehicles side by side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vehicle Selection */}
        <div className="flex flex-wrap gap-2 items-center">
          {selectedVehicles.map((v, i) => (
            <div 
              key={v.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
              style={{ borderColor: COLORS[i] }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[i] }}
              />
              <span className="text-sm font-medium">{v.id}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={() => removeVehicle(v.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {selectedIds.length < 4 && availableVehicles.length > 0 && (
            <Select onValueChange={addVehicle}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.id} - {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedVehicles.map((v, i) => (
            <div 
              key={v.id}
              className="p-4 rounded-lg border"
              style={{ borderColor: COLORS[i] }}
            >
              <div className="text-sm text-muted-foreground">{v.id}</div>
              <div className="font-semibold truncate">{v.name}</div>
              <div className="text-xl font-bold mt-2">
                ${getTotalCost(v).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          ))}
        </div>

        {selectedVehicles.length >= 2 && (
          <>
            {/* Category Comparison */}
            <div>
              <h4 className="text-sm font-medium mb-3">Cost by Category</h4>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={comparisonData}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                      />
                    }
                  />
                  <Legend />
                  {selectedVehicles.map((v, i) => (
                    <Bar 
                      key={v.id} 
                      dataKey={v.id} 
                      fill={COLORS[i]} 
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </div>

            {/* Trend Comparison */}
            <div>
              <h4 className="text-sm font-medium mb-3">Cost Trends</h4>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={trendData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                      />
                    }
                  />
                  <Legend />
                  {selectedVehicles.map((v, i) => (
                    <Line
                      key={v.id}
                      type="monotone"
                      dataKey={v.id}
                      stroke={COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
