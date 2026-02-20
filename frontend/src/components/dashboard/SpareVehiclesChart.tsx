import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SpareVehicleData {
  name: string;
  count: number;
}

interface SpareVehiclesChartProps {
  data: SpareVehicleData[];
  title: string;
}

export const SpareVehiclesChart: React.FC<SpareVehiclesChartProps> = ({ data, title }) => {
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="chart-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="chart-title mb-0">{title}</h3>
        <span className="text-xs text-primary cursor-pointer hover:underline">
          View Report (Spare Vans Ready)
        </span>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barCategoryGap="25%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={true} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              domain={[0, 'dataMax + 0.5']}
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
              formatter={(value: number) => [value, 'Record Count']}
            />
            <Bar dataKey="count" fill="#0070d2" radius={[0, 4, 4, 0]} maxBarSize={30}>
              {sortedData.map((_, index) => (
                <Cell key={`cell-${index}`} fill="#0070d2" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-right">
        As of {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};
