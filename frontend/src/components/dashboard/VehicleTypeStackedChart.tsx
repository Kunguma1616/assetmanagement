import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VehicleTypeData {
  name: string;
  lwbHighRoof: number;
  lwbLowRoof: number;
  swb: number;
  cars: number;
  tippers: number;
  lutonBox: number;
}

interface VehicleTypeStackedChartProps {
  data: VehicleTypeData[];
  title: string;
}

const COLORS = {
  lwbHighRoof: '#a094ed',      // Purple
  lwbLowRoof: '#0070d2',       // Blue
  swb: '#4bca81',              // Green
  cars: '#1b96ff',             // Light blue
  tippers: '#ff6b6b',          // Red
  lutonBox: '#ffc658',         // Yellow
};

export const VehicleTypeStackedChart: React.FC<VehicleTypeStackedChartProps> = ({ data, title }) => {
  // Calculate total for each row and sort by total
  const sortedData = [...data]
    .map(item => ({
      ...item,
      total: item.lwbHighRoof + item.lwbLowRoof + item.swb + item.cars + item.tippers + item.lutonBox
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="chart-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="chart-title mb-0">{title}</h3>
        <span className="text-xs text-primary cursor-pointer hover:underline">
          View Report (All Vehicles by Vehicle Type)
        </span>
      </div>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={true} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={200}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px' }}
              formatter={(value: string) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
            <Bar dataKey="lwbHighRoof" stackId="a" fill={COLORS.lwbHighRoof} name="Long WB High Roof" />
            <Bar dataKey="lwbLowRoof" stackId="a" fill={COLORS.lwbLowRoof} name="Long WB Low Roof" />
            <Bar dataKey="swb" stackId="a" fill={COLORS.swb} name="Short WB" />
            <Bar dataKey="cars" stackId="a" fill={COLORS.cars} name="Cars" />
            <Bar dataKey="tippers" stackId="a" fill={COLORS.tippers} name="Tippers" />
            <Bar dataKey="lutonBox" stackId="a" fill={COLORS.lutonBox} name="Luton Box" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-right">
        As of {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};
