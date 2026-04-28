import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleRecord } from '@/data/fleetData';

type SheetType = 'current' | 'allocated' | 'garage' | 'spare_ready' | 'reserved' | 'writtenOff' | 'mot' | 'service' | 'tax' | null;

interface VehicleDataSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  vehicles: VehicleRecord[];
  sheetType?: SheetType;
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

const fmt = (val: string | undefined) => val || '—';

export const VehicleDataSheet: React.FC<VehicleDataSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  vehicles,
  sheetType,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-5xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold">{title}</SheetTitle>
          <SheetDescription className="text-base">
            {description} • {vehicles.length} vehicles
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          {/* ── Vehicles to Service ── */}
          {sheetType === 'service' && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Van Number</TableHead>
                  <TableHead className="font-semibold">Reg No</TableHead>
                  <TableHead className="font-semibold">Last Service</TableHead>
                  <TableHead className="font-semibold">Next Service</TableHead>
                  <TableHead className="font-semibold">Vehicle Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v, i) => (
                  <TableRow key={`${v.vanNumber}-${i}`} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{fmt(v.name)}</TableCell>
                    <TableCell className="font-medium">{fmt(v.vanNumber)}</TableCell>
                    <TableCell className="font-mono text-sm">{fmt(v.regNo)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.lastServiceDate)}</TableCell>
                    <TableCell className="text-sm font-semibold text-blue-700">{fmt(v.nextServiceDate)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.vehicleType)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* ── Road Tax Due ── */}
          {sheetType === 'tax' && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Van Number</TableHead>
                  <TableHead className="font-semibold">Reg No</TableHead>
                  <TableHead className="font-semibold">Trade Group</TableHead>
                  <TableHead className="font-semibold">Last Road Tax</TableHead>
                  <TableHead className="font-semibold">Next Road Tax</TableHead>
                  <TableHead className="font-semibold">Next Tax (Editable)</TableHead>
                  <TableHead className="font-semibold">Vehicle Type</TableHead>
                  <TableHead className="font-semibold">Ownership</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v, i) => (
                  <TableRow key={`${v.vanNumber}-${i}`} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{fmt(v.name)}</TableCell>
                    <TableCell className="font-medium">{fmt(v.vanNumber)}</TableCell>
                    <TableCell className="font-mono text-sm">{fmt(v.regNo)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.tradeGroup)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.lastRoadTax)}</TableCell>
                    <TableCell className="text-sm font-semibold text-red-700">{fmt(v.nextRoadTax)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.nextRoadTaxEditable)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.vehicleType)}</TableCell>
                    <TableCell className="text-sm">{fmt(v.vehicleOwnership)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* ── All other sheets (default columns) ── */}
          {sheetType !== 'service' && sheetType !== 'tax' && (
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
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
