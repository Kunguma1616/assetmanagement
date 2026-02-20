import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleRecord } from '@/data/fleetData';

interface VehicleDataSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  vehicles: VehicleRecord[];
}

const getStatusBadgeVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('allocated')) return 'default';
  if (s.includes('spare')) return 'secondary';
  if (s.includes('garage') || s.includes('repair')) return 'destructive';
  if (s.includes('written off')) return 'outline';
  if (s.includes('reserved')) return 'secondary';
  return 'outline';
};

export const VehicleDataSheet: React.FC<VehicleDataSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  vehicles,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold">{title}</SheetTitle>
          <SheetDescription className="text-base">
            {description} • {vehicles.length} vehicles
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-180px)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Van Number</TableHead>
                <TableHead className="font-semibold">Reg No</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Vehicle Type</TableHead>
                <TableHead className="font-semibold">Trade Group</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle, index) => (
                <TableRow key={`${vehicle.vanNumber}-${index}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{vehicle.vanNumber}</TableCell>
                  <TableCell className="font-mono text-sm">{vehicle.regNo}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{vehicle.vehicleType}</TableCell>
                  <TableCell className="text-sm">{vehicle.tradeGroup}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
