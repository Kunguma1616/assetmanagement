import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeaderActions from '@/components/layout/PageHeaderActions';
import SectionHero from '@/components/layout/SectionHero';
import { toast } from 'sonner';
import {
  Upload as UploadIcon,
  Loader2,
  Search,
  Eye,
  Calendar,
  PackagePlus,
  ImageIcon,
} from 'lucide-react';

// ── Vehicles (Vehicle__c) ─────────────────────────────────────────────────────
interface Vehicle {
  id: string;
  name: string;
  van_number: string;
  registration_number: string;
  tracking_number: string;
  vehicle_type: string;
  description: string;
  status: string;
  created_date: string;
}

// ── Registered Assets (Salesforce Asset object) ───────────────────────────────
interface SfAsset {
  id: string;
  name: string;
  serial_number: string;
  status: string;
  price: number | null;
  purchase_date: string | null;
  account_name: string | null;
  asset_type: string | null;
  user_name: string | null;
  description: string | null;
  equipment_owner: string | null;
  created_date: string;
  images: string[];   // base64 data URIs
}

const FONT = "Mont";

export default function AssetsGallery() {
  const navigate = useNavigate();

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  // Registered assets state
  const [sfAssets, setSfAssets] = useState<SfAsset[]>([]);
  const [filteredSfAssets, setFilteredSfAssets] = useState<SfAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetSearch, setAssetSearch] = useState('');

  // Active tab
  const [tab, setTab] = useState<'vehicles' | 'assets'>('assets');

  const startAssetsTour = () => {
    const steps = [
      {
        element: '#assets-tabs',
        popover: {
          title: 'Switch Views',
          description: 'Use these tabs to switch between registered assets and uploaded vehicles.',
          side: 'bottom' as const,
          align: 'start' as const,
        },
      },
      {
        element: '#uploaded-vehicles-tab',
        popover: {
          title: 'Uploaded Vehicles',
          description: 'Open this tab to view uploaded vehicle records separately from registered assets.',
          side: 'bottom' as const,
          align: 'start' as const,
        },
      },
      {
        element: '#assets-search',
        popover: {
          title: 'Search Portfolio',
          description: 'Search by asset name, serial number, type, user, or vehicle details to find entries quickly.',
          side: 'bottom' as const,
          align: 'start' as const,
        },
      },
      {
        element: '#assets-grid',
        popover: {
          title: 'Fleet Portfolio',
          description: 'This area shows your registered assets or uploaded vehicles in a simple card view.',
          side: 'top' as const,
          align: 'start' as const,
        },
      },
      {
        element: '#portfolio-actions',
        popover: {
          title: 'Create New Records',
          description: 'Use these actions to upload a new vehicle or register a new asset.',
          side: 'bottom' as const,
          align: 'start' as const,
        },
      },
      {
        element: '#assets-grid',
        popover: {
          title: 'Open Full Details',
          description: 'Click View Full Details on a vehicle card. The AI-Powered Vehicle Insights section appears on the vehicle detail page, not on this list screen.',
          side: 'top' as const,
          align: 'start' as const,
        },
      },
    ];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.6,
      allowClose: true,
      steps,
    });

    driverObj.drive();
  };

  useEffect(() => {
    fetchVehicles();
    fetchSfAssets();
  }, []);

  // ── Fetch vehicles (Vehicle__c) ──────────────────────────────────────────
  const fetchVehicles = async () => {
    try {
      setVehiclesLoading(true);
      const res = await fetch('/api/assets/all');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      setVehicles(data.assets || []);
      setFilteredVehicles(data.assets || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setVehiclesLoading(false);
    }
  };

  // ── Fetch registered Salesforce Assets ──────────────────────────────────
  const fetchSfAssets = async () => {
    try {
      setAssetsLoading(true);
      const res = await fetch('/api/register-asset/list');
      if (!res.ok) throw new Error('Failed to fetch assets');
      const data = await res.json();
      setSfAssets(data.assets || []);
      setFilteredSfAssets(data.assets || []);
    } catch (err) {
      // Non-fatal — just show empty
      setSfAssets([]);
      setFilteredSfAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  // ── Search handlers ──────────────────────────────────────────────────────
  const handleVehicleSearch = (term: string) => {
    setVehicleSearch(term);
    setFilteredVehicles(
      vehicles.filter(v =>
        v.van_number?.includes(term) ||
        v.registration_number?.includes(term) ||
        v.name?.toLowerCase().includes(term.toLowerCase()) ||
        v.tracking_number?.includes(term)
      )
    );
  };

  const handleAssetSearch = (term: string) => {
    setAssetSearch(term);
    setFilteredSfAssets(
      sfAssets.filter(a =>
        a.name?.toLowerCase().includes(term.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(term.toLowerCase()) ||
        a.asset_type?.toLowerCase().includes(term.toLowerCase()) ||
        a.user_name?.toLowerCase().includes(term.toLowerCase())
      )
    );
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (d: string | null) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatPrice = (p: number | null) =>
    p != null ? `£${p.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';

  const vehicleStatusStyle = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      'Uploaded':    { bg: '#17325E', text: 'white' },
      'Allocated':   { bg: '#F1FF24', text: '#17325E' },
      'Spare':       { bg: 'white',   text: '#17325E' },
      'Written Off': { bg: '#17325E', text: 'white' },
      'Reserved':    { bg: '#F1FF24', text: '#17325E' },
    };
    return map[status] || { bg: 'white', text: '#17325E' };
  };

  const assetStatusColor = (status: string | null) => {
    const map: Record<string, string> = {
      'Purchased':  'bg-blue-100 text-blue-800',
      'Installed':  'bg-green-100 text-green-800',
      'Registered': 'bg-purple-100 text-purple-800',
      'Obsolete':   'bg-gray-200 text-gray-600',
      'Disposed':   'bg-red-100 text-red-700',
      'Shipped':    'bg-yellow-100 text-yellow-800',
    };
    return map[status || ''] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #F7F9FD, #F3F4F6)' }}>
      <SectionHero
        title="Chumley Assets Gallery"
        subtitle="View uploaded vehicles and registered assets"
        onBack={() => navigate(-1)}
        actions={<PageHeaderActions onStartGuide={startAssetsTour} />}
      />

      <div className="max-w-7xl mx-auto p-6 pt-0">

        <div id="portfolio-actions" className="mb-6 flex justify-end items-start flex-wrap gap-3">
          <div className="flex gap-2">
              <Button
                onClick={() => navigate('/upload')}
                variant="outline"
                className="gap-2 border-[#17325E] text-[#17325E]"
              >
                <UploadIcon size={16} />
                New Vehicle
              </Button>
              <Button
                onClick={() => navigate('/upload-asset')}
                className="gap-2"
                style={{ backgroundColor: '#17325E', color: 'white' }}
              >
                <PackagePlus size={16} />
                Register Asset
              </Button>
          </div>
        </div>

        {/* Tabs */}
        <div id="assets-tabs" className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-200 w-fit">
          <button
            onClick={() => setTab('assets')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'assets'
                ? 'text-white shadow'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            style={tab === 'assets' ? { backgroundColor: '#17325E' } : {}}
          >
            Registered Assets
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === 'assets' ? '' : 'bg-gray-100'}`}
              style={tab === 'assets' ? { backgroundColor: '#0f1f3d' } : {}}>
              {sfAssets.length}
            </span>
          </button>
          <button
            id="uploaded-vehicles-tab"
            onClick={() => setTab('vehicles')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'vehicles'
                ? 'text-white shadow'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            style={tab === 'vehicles' ? { backgroundColor: '#17325E' } : {}}
          >
            Uploaded Vehicles
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === 'vehicles' ? '' : 'bg-gray-100'}`}
              style={tab === 'vehicles' ? { backgroundColor: '#0f1f3d' } : {}}>
              {vehicles.length}
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* REGISTERED ASSETS TAB                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'assets' && (
          <>
            {/* Search */}
            <Card className="mb-6 border-2" style={{ borderColor: 'rgba(39,84,157,0.2)' }}>
              <CardContent className="p-4">
                <div id="assets-search" className="flex gap-3 items-center">
                  <Search size={18} style={{ color: '#848EA3' }} className="flex-shrink-0" />
                  <Input
                    placeholder="Search by asset name, serial number, type or user…"
                    value={assetSearch}
                    onChange={e => handleAssetSearch(e.target.value)}
                    style={{ borderColor: '#CDD1DA' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {assetsLoading && (
              <div className="flex justify-center py-20">
                <Loader2 size={40} className="animate-spin" style={{ color: '#17325E' }} />
              </div>
            )}

            {/* Empty */}
            {!assetsLoading && filteredSfAssets.length === 0 && (
              <Card className="text-center py-16 border-2" style={{ borderColor: 'rgba(39,84,157,0.2)' }}>
                <CardContent>
                  <PackagePlus size={48} className="mx-auto mb-4" style={{ color: '#CDD1DA' }} />
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#323843' }}>
                    {sfAssets.length === 0 ? 'No Assets Registered Yet' : 'No Results Found'}
                  </h3>
                  <p className="mb-6" style={{ color: '#646F86' }}>
                    {sfAssets.length === 0
                      ? 'Register your first asset to see it here'
                      : 'Try a different search term'}
                  </p>
                  {sfAssets.length === 0 && (
                    <Button
                      onClick={() => navigate('/upload-asset')}
                      style={{ backgroundColor: '#17325E', color: 'white' }}
                    >
                      Register First Asset
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Grid */}
            {!assetsLoading && filteredSfAssets.length > 0 && (
              <div id="assets-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSfAssets.map(asset => (
                  <Card
                    key={asset.id}
                    className="hover:shadow-lg transition-shadow overflow-hidden border-2"
                    style={{ borderColor: 'rgba(39,84,157,0.2)', backgroundColor: 'white' }}
                  >
                    {/* Image */}
                    {asset.images && asset.images.length > 0 && (
                      <div className="h-44 w-full overflow-hidden flex items-center justify-center bg-gray-50 relative">
                        <img
                          src={asset.images[0]}
                          alt={asset.name}
                          className="object-cover w-full h-44"
                        />
                        {asset.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            +{asset.images.length - 1} more
                          </span>
                        )}
                      </div>
                    )}

                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base leading-tight" style={{ color: '#17325E' }}>
                          {asset.name}
                        </CardTitle>
                        {asset.status && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${assetStatusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                        )}
                      </div>
                      {asset.asset_type && (
                        <p className="text-xs text-gray-500 mt-0.5">{asset.asset_type}</p>
                      )}
                    </CardHeader>

                    <CardContent className="px-4 pb-4 space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {asset.serial_number && (
                          <>
                            <span className="text-gray-500">Serial:</span>
                            <span className="font-medium text-gray-800 truncate">{asset.serial_number}</span>
                          </>
                        )}
                        {asset.price != null && (
                          <>
                            <span className="text-gray-500">Price:</span>
                            <span className="font-medium text-gray-800">{formatPrice(asset.price)}</span>
                          </>
                        )}
                        {asset.user_name && (
                          <>
                            <span className="text-gray-500">User:</span>
                            <span className="font-medium text-gray-800 truncate">{asset.user_name}</span>
                          </>
                        )}
                        {asset.account_name && (
                          <>
                            <span className="text-gray-500">Account:</span>
                            <span className="font-medium text-gray-800 truncate">{asset.account_name}</span>
                          </>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={12} />
                        {formatDate(asset.created_date)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary */}
            {!assetsLoading && sfAssets.length > 0 && (
              <div className="mt-6 p-4 rounded-lg text-center text-sm"
                style={{ backgroundColor: 'rgba(241,255,36,0.2)', borderWidth: '1px', borderColor: '#F1FF24', color: '#17325E' }}>
                Showing <strong>{filteredSfAssets.length}</strong> of <strong>{sfAssets.length}</strong> registered assets
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* UPLOADED VEHICLES TAB                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'vehicles' && (
          <>
            {/* Search */}
            <Card className="mb-6 border-2" style={{ borderColor: 'rgba(39,84,157,0.2)' }}>
              <CardContent className="p-4">
                <div id="assets-search" className="flex gap-3 items-center">
                  <Search size={18} style={{ color: '#848EA3' }} className="flex-shrink-0" />
                  <Input
                    placeholder="Search by van number, registration, tracking number or name…"
                    value={vehicleSearch}
                    onChange={e => handleVehicleSearch(e.target.value)}
                    style={{ borderColor: '#CDD1DA' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {vehiclesLoading && (
              <div className="flex justify-center py-20">
                <Loader2 size={40} className="animate-spin" style={{ color: '#17325E' }} />
              </div>
            )}

            {/* Empty */}
            {!vehiclesLoading && filteredVehicles.length === 0 && (
              <Card className="text-center py-16 border-2" style={{ borderColor: 'rgba(39,84,157,0.2)' }}>
                <CardContent>
                  <UploadIcon size={48} className="mx-auto mb-4" style={{ color: '#CDD1DA' }} />
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#323843' }}>
                    {vehicles.length === 0 ? 'No Vehicles Uploaded' : 'No Results Found'}
                  </h3>
                  <p className="mb-6" style={{ color: '#646F86' }}>
                    {vehicles.length === 0
                      ? 'Start by uploading your first vehicle'
                      : 'Try adjusting your search criteria'}
                  </p>
                  {vehicles.length === 0 && (
                    <Button onClick={() => navigate('/upload')} style={{ backgroundColor: '#17325E', color: 'white' }}>
                      Upload First Vehicle
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Grid */}
            {!vehiclesLoading && filteredVehicles.length > 0 && (
              <div id="assets-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map(asset => (
                  <Card
                    key={asset.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border-2"
                    style={{ backgroundColor: 'white', borderColor: 'rgba(39,84,157,0.2)' }}
                    onClick={() => setExpandedVehicle(expandedVehicle === asset.id ? null : asset.id)}
                  >
                    {/* Vehicle image */}
                    <div className="h-48 w-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                      <img
                        src="/aspect-van.jpg"
                        alt={`Van ${asset.van_number}`}
                        onError={e => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          const p = el.parentElement;
                          if (p) p.style.background = 'linear-gradient(to bottom right, rgba(39,84,157,0.2), rgba(241,255,36,0.2))';
                        }}
                        className="object-cover w-full h-48"
                      />
                    </div>

                    <CardHeader>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <CardTitle className="text-lg" style={{ color: '#17325E' }}>{asset.name}</CardTitle>
                        <Badge
                          className="px-2 py-1 text-xs font-semibold rounded"
                          style={{
                            backgroundColor: vehicleStatusStyle(asset.status).bg,
                            color: vehicleStatusStyle(asset.status).text,
                            borderWidth: '1px',
                            borderColor: '#17325E',
                          }}
                        >
                          {asset.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span style={{ color: '#646F86' }}>Van #:</span>
                          <span className="font-semibold" style={{ color: '#1A1D23' }}>{asset.van_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: '#646F86' }}>Registration:</span>
                          <span className="font-semibold" style={{ color: '#1A1D23' }}>{asset.registration_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: '#646F86' }}>Tracking #:</span>
                          <span className="font-semibold" style={{ color: '#1A1D23' }}>{asset.tracking_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: '#646F86' }}>Type:</span>
                          <span className="font-semibold" style={{ color: '#1A1D23' }}>{asset.vehicle_type}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-1" style={{ borderTopWidth: '1px', borderColor: '#E8EAEE' }}>
                        <Calendar size={14} style={{ color: '#848EA3' }} />
                        <p className="text-xs" style={{ color: '#848EA3' }}>{formatDate(asset.created_date)}</p>
                      </div>

                      {expandedVehicle === asset.id && (
                        <div className="mt-4 pt-4 p-3 rounded" style={{ borderTopWidth: '1px', borderColor: '#E8EAEE', backgroundColor: '#F7F9FD' }}>
                          <p className="text-sm" style={{ color: '#323843' }}>
                            <strong>Description:</strong> {asset.description}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full mt-4 gap-2"
                        style={{ borderColor: '#17325E', color: '#17325E' }}
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/assets/${asset.id}`, { state: { asset } });
                        }}
                      >
                        <Eye size={16} />
                        View Full Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary */}
            {!vehiclesLoading && vehicles.length > 0 && (
              <div className="mt-8 p-4 rounded-lg text-center text-sm"
                style={{ backgroundColor: 'rgba(241,255,36,0.2)', borderWidth: '1px', borderColor: '#F1FF24', color: '#17325E' }}>
                Showing <strong>{filteredVehicles.length}</strong> of <strong>{vehicles.length}</strong> uploaded vehicles
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
