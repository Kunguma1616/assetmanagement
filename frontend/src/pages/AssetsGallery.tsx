import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { toast } from 'sonner';
import {
  Upload as UploadIcon,
  Loader2,
  ArrowLeft,
  Search,
  Eye,
  Calendar
} from 'lucide-react';

interface Asset {
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

export default function AssetsGallery() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assets/all');
      
      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data = await response.json();
      setAssets(data.assets || []);
      setFilteredAssets(data.assets || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load assets');
      setAssets([]);
      setFilteredAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = assets.filter((asset) =>
      asset.van_number?.includes(term) ||
      asset.registration_number?.includes(term) ||
      asset.name?.toLowerCase().includes(term.toLowerCase()) ||
      asset.tracking_number?.includes(term)
    );
    setFilteredAssets(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string }> = {
      'Uploaded': { bg: '#27549D', text: 'white' },
      'Allocated': { bg: '#F1FF24', text: '#27549D' },
      'Spare': { bg: 'white', text: '#27549D' },
      'Written Off': { bg: '#27549D', text: 'white' },
      'Reserved': { bg: '#F1FF24', text: '#27549D' }
    };

    return statusStyles[status] || { bg: 'white', text: '#27549D' };
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(to bottom right, #F7F9FD, #F3F4F6)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition"
            style={{ color: '#27549D' }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold" style={{ color: '#1A1D23' }}>Vehicle Assets</h1>
              <p className="mt-2" style={{ color: '#646F86' }}>View all uploaded vehicle details with images and AI analysis</p>
            </div>
            <Button
              onClick={() => navigate('/upload')}
              className="gap-2"
              style={{ backgroundColor: '#27549D', color: 'white' }}
            >
              <UploadIcon size={20} />
              Upload New Vehicle
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-6" style={{ backgroundColor: 'white', borderWidth: '2px', borderColor: 'rgba(39, 84, 157, 0.2)' }}>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Search className="flex-shrink-0 mt-2" size={20} style={{ color: '#848EA3' }} />
              <Input
                placeholder="Search by van number, registration, tracking number, or vehicle name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1"
                style={{ borderColor: '#CDD1DA' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={40} className="animate-spin" style={{ color: '#27549D' }} />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAssets.length === 0 && (
          <Card className="text-center py-16" style={{ backgroundColor: 'white', borderWidth: '2px', borderColor: 'rgba(39, 84, 157, 0.2)' }}>
            <CardContent>
              <UploadIcon size={48} className="mx-auto mb-4" style={{ color: '#CDD1DA' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#323843' }}>No Assets Found</h3>
              <p className="mb-6" style={{ color: '#646F86' }}>
                {assets.length === 0
                  ? "Start by uploading your first vehicle"
                  : "Try adjusting your search criteria"}
              </p>
              {assets.length === 0 && (
                <Button
                  onClick={() => navigate('/upload')}
                  style={{ backgroundColor: '#27549D', color: 'white' }}
                >
                  Upload First Vehicle
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assets Grid */}
        {!loading && filteredAssets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <Card
                key={asset.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                style={{ backgroundColor: 'white', borderWidth: '2px', borderColor: 'rgba(39, 84, 157, 0.2)' }}
                onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
              >
                {/* Vehicle Image */}
                <div className="h-48 w-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                  <img
                    src="/aspect-van.jpg"
                    alt={`Van ${asset.van_number}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) parent.style.background = 'linear-gradient(to bottom right, rgba(39, 84, 157, 0.2), rgba(241, 255, 36, 0.2))';
                    }}
                    className="object-cover w-full h-48"
                  />
                </div>

                <CardHeader>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <CardTitle className="text-lg" style={{ color: '#27549D' }}>{asset.name}</CardTitle>
                    <Badge 
                      className="px-2 py-1 text-xs font-semibold rounded"
                      style={{ 
                        backgroundColor: getStatusBadge(asset.status).bg,
                        color: getStatusBadge(asset.status).text,
                        borderWidth: '1px',
                        borderColor: '#27549D'
                      }}
                    >
                      {asset.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Key Information */}
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

                  <div className="pt-2" style={{ borderTopWidth: '1px', borderColor: '#E8EAEE' }}>
                    <p className="text-xs flex items-center gap-1" style={{ color: '#848EA3' }}>
                      <Calendar size={14} />
                      {formatDate(asset.created_date)}
                    </p>
                  </div>

                  {/* Description (collapsible) */}
                  {expandedAsset === asset.id && (
                    <div className="mt-4 pt-4 p-3 rounded" style={{ borderTopWidth: '1px', borderColor: '#E8EAEE', backgroundColor: '#F7F9FD' }}>
                      <p className="text-sm" style={{ color: '#323843' }}>
                        <strong>Description:</strong> {asset.description}
                      </p>
                    </div>
                  )}

                  {/* View Details Button */}
                  <Button
                    variant="outline"
                    className="w-full mt-4 gap-2"
                    style={{ borderColor: '#27549D', color: '#27549D' }}
                    onClick={(e) => {
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
        {!loading && assets.length > 0 && (
          <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'rgba(241, 255, 36, 0.2)', borderWidth: '1px', borderColor: '#F1FF24' }}>
            <p className="text-center" style={{ color: '#27549D' }}>
              Showing <strong>{filteredAssets.length}</strong> of <strong>{assets.length}</strong> uploaded vehicles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}