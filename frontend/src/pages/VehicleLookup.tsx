import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors, fonts } from '@/config/colors';

interface AllocationHistory {
  start_date: string;
  end_date: string;
  service_resource_name: string;
  contact_number?: string;
}

interface VehicleData {
  van_number: string;
  registration_number: string;
  tracking_number: string;
  vehicle_name: string;
  vehicle_type: string;
  trade_group: string;
  make_model: string;
  transmission: string;
  last_mot_date: string;
  next_mot_date: string;
  last_road_tax: string;
  next_road_tax: string;
  last_service_date: string;
  next_service_date: string;
  vehicle_ownership: string;
  vehicle_allocation_history: AllocationHistory[];
}

interface AvailableVehicle {
  van_number: string;
  name: string;
  registration_number: string;
  vehicle_type: string;
}

export default function VehicleLookup() {
  const navigate = useNavigate();
  const [vanNumber, setVanNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedVehicles, setSuggestedVehicles] = useState<AvailableVehicle[]>([]);

  const handleSearchVehicle = async () => {
    if (!vanNumber.trim()) {
      toast.error('Please enter a van number');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/vehicles/lookup/${vanNumber.trim()}`);

      if (!response.ok) {
        throw new Error(`Vehicle not found (${response.status})`);
      }

      const data = await response.json();

      setVehicleData({
        van_number: data.van_number || vanNumber,
        registration_number: data.registration_number || 'N/A',
        tracking_number: data.tracking_number || 'N/A',
        vehicle_name: data.vehicle_name || 'N/A',
        vehicle_type: data.vehicle_type || 'N/A',
        trade_group: data.trade_group || 'N/A',
        make_model: data.make_model || 'N/A',
        transmission: data.transmission || 'N/A',
        last_mot_date: data.last_mot_date || 'N/A',
        next_mot_date: data.next_mot_date || 'N/A',
        last_road_tax: data.last_road_tax || 'N/A',
        next_road_tax: data.next_road_tax || 'N/A',
        last_service_date: data.last_service_date || 'N/A',
        next_service_date: data.next_service_date || 'N/A',
        vehicle_ownership: data.vehicle_ownership || 'N/A',
        vehicle_allocation_history: data.vehicle_allocation_history || []
      });

      toast.success('Vehicle information loaded successfully!');
      setShowSuggestions(false);

    } catch (error) {
      console.error(error);

      try {
        const response = await fetch('/api/vehicles/search');
        const data = await response.json();
        setSuggestedVehicles(data.vehicles || []);
        setShowSuggestions(true);
      } catch {
        toast.error('Failed to fetch vehicle data. Is backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.grayscale.negative }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4 hover:opacity-80"
            style={{ color: colors.primary.default, ...fonts.body }}
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <h2 className="text-3xl font-bold mb-2" style={{ color: colors.grayscale.title, ...fonts.heading }}>
            Vehicle Lookup
          </h2>
          <p className="mt-2" style={{ color: colors.grayscale.subtle, ...fonts.light }}>
            Search for an existing vehicle by van number
          </p>
        </div>

        {/* Search Card */}
        <Card className="border-2" style={{ borderColor: colors.primary.subtle, backgroundColor: 'white' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: colors.primary.default, ...fonts.heading }}>
              <Search size={20} />
              Search Vehicle
            </CardTitle>
            <CardDescription style={{ color: colors.grayscale.subtle, ...fonts.light }}>
              Enter van number to find vehicle details
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., VEH-00001"
                value={vanNumber}
                onChange={(e) => setVanNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicle()}
                disabled={loading}
                style={{ ...fonts.body }}
              />
              <Button
                onClick={handleSearchVehicle}
                disabled={loading}
                style={{ backgroundColor: colors.primary.default, color: 'white', ...fonts.subheading }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {vehicleData && (
          <div className="space-y-6 mt-6">

            {/* Vehicle Details */}
            <Card className="border-2" style={{ borderColor: colors.primary.subtle, backgroundColor: 'white' }}>
              <CardHeader>
                <CardTitle style={{ color: colors.primary.default, ...fonts.heading }}>
                  Vehicle Details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Detail label="Van Number" value={vehicleData.van_number} />
                  <Detail label="Registration Number" value={vehicleData.registration_number} />
                  <Detail label="Trade Group" value={vehicleData.trade_group} />
                  <Detail label="Make & Model" value={vehicleData.make_model} />
                  <Detail label="Transmission" value={vehicleData.transmission} />
                  <Detail label="Last MOT Date" value={vehicleData.last_mot_date} />
                  <Detail label="Next MOT Date" value={vehicleData.next_mot_date} />
                  <Detail label="Last Road Tax" value={vehicleData.last_road_tax} />
                  <Detail label="Next Road Tax" value={vehicleData.next_road_tax} />
                  <Detail label="Last Service Date" value={vehicleData.last_service_date} />
                  <Detail label="Next Service Date" value={vehicleData.next_service_date} />
                  <Detail label="Vehicle Ownership" value={vehicleData.vehicle_ownership} />
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Allocation History */}
            <Card className="border-2" style={{ borderColor: colors.primary.subtle, backgroundColor: 'white' }}>
              <CardHeader>
                <CardTitle style={{ color: colors.primary.default, ...fonts.heading }}>
                  Vehicle Allocation History
                </CardTitle>
              </CardHeader>

              <CardContent>
                {vehicleData.vehicle_allocation_history.length === 0 ? (
                  <p style={{ color: colors.grayscale.subtle, ...fonts.body }}>
                    No allocation history found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {vehicleData.vehicle_allocation_history.map((allocation, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border"
                        style={{ backgroundColor: colors.grayscale.negative, borderColor: colors.grayscale.border.subtle }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Detail
                            label="Service Resource"
                            value={allocation.service_resource_name}
                          />
                          <Detail
                            label="Contact Number"
                            value={allocation.contact_number || 'N/A'}
                          />
                          <Detail
                            label="Start Date"
                            value={allocation.start_date || 'N/A'}
                          />
                          <Detail
                            label="End Date"
                            value={allocation.end_date || 'Active'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}

/* Reusable Detail Component */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs" style={{ color: colors.grayscale.caption, ...fonts.light }}>
        {label}
      </Label>
      <p className="text-sm font-medium" style={{ color: colors.grayscale.title, ...fonts.body }}>
        {value}
      </p>
    </div>
  );
}
