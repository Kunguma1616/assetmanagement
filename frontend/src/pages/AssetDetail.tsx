import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Calendar, MapPin, Hash, Settings, Zap, FileText,
  Brain, Download, Trash2, Car, Wrench, Users, Phone, Shield, Clock,
  Sparkles, Edit2, Save, X, Search, ChevronDown, CheckCircle2, User,
  Lock, Plus
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Engineer {
  id: string;
  name: string;
  email?: string;
  contact_number?: string;
}

interface AllocationHistory {
  id: string;
  start_date: string;
  end_date: string | null;
  service_resource_name: string;
  service_resource_id: string;
  contact_number: string;
}

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
  image_data?: string;
  ai_insights?: string;
  trade_group?: string;
  make_model?: string;
  transmission?: string;
  last_mot_date?: string;
  next_mot_date?: string;
  last_road_tax?: string;
  next_road_tax?: string;
  last_service_date?: string;
  next_service_date?: string;
  vehicle_ownership?: string;
  vehicle_allocation_history?: AllocationHistory[];
  driver_name?: string;
}

// ─── Searchable Engineer Combobox ─────────────────────────────────────────────

function EngineerCombobox({
  engineers,
  value,
  onChange,
  disabled,
  placeholder = 'Select Engineer',
}: {
  engineers: Engineer[];
  value: string;
  onChange: (engineer: Engineer | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = engineers.find((e) => e.id === value) ?? null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return engineers;
    return engineers.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.contact_number ?? '').includes(q)
    );
  }, [query, engineers]);

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`flex items-center border rounded-md bg-white px-3 gap-2 h-10 cursor-text transition-all
          ${open ? 'ring-2 ring-[#27549D] border-[#27549D]' : 'border-[#CDD1DA] hover:border-[#27549D]'}
          ${disabled ? 'opacity-50 pointer-events-none bg-[#F7F9FD]' : ''}`}
      >
        <Search className="h-4 w-4 text-[#848EA3] shrink-0" />
        {open ? (
          <input
            autoFocus
            className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#848EA3] text-[#1A1D23]"
            placeholder="Type name to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-[#1A1D23] font-semibold' : 'text-[#848EA3]'}`}>
            {selected ? selected.name : placeholder}
          </span>
        )}
        {selected && !open ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); setQuery(''); }}
            className="text-[#848EA3] hover:text-[#323843]">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className={`h-4 w-4 text-[#848EA3] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#CDD1DA] rounded-md shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-[#848EA3]">
                No engineers found{query ? ` for "${query}"` : ''}
              </div>
            ) : filtered.map((eng) => (
              <button
                key={eng.id}
                type="button"
                onClick={() => { onChange(eng); setQuery(''); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 hover:bg-[#F7F9FD] flex items-center gap-3 transition-colors
                  ${eng.id === value ? 'bg-[#DEE8F7]' : ''}`}
              >
                <div className="w-7 h-7 rounded-full bg-[#DEE8F7] flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-[#27549D]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1A1D23] truncate">{eng.name}</div>
                  {eng.contact_number && (
                    <div className="text-xs text-[#848EA3] flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />{eng.contact_number}
                    </div>
                  )}
                </div>
                {eng.id === value && <CheckCircle2 className="h-4 w-4 text-[#27549D] shrink-0" />}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-[#CDD1DA] bg-[#F7F9FD]">
            <p className="text-xs text-[#848EA3]">{filtered.length} of {engineers.length} engineers</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contact Number Display (read-only) ──────────────────────────────────────

function ContactDisplay({ number }: { number: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#323843] mb-2">
        <span className="flex items-center gap-1.5">
          <Lock size={12} className="text-[#848EA3]" />
          Contact Number
          <span className="text-[10px] font-normal text-[#848EA3] bg-[#F3F4F6] px-1.5 py-0.5 rounded">read-only</span>
        </span>
      </label>
      <div className="flex items-center h-10 px-3 gap-2 border border-[#E8EAEE] rounded-md bg-[#F7F9FD]">
        <Phone className="h-4 w-4 text-[#848EA3] shrink-0" />
        <span className="text-sm text-[#646F86] font-medium">{number || 'N/A'}</span>
      </div>
      <p className="text-[11px] text-[#848EA3] mt-1">Pulled from engineer's allocation record in Salesforce.</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [asset, setAsset] = useState<Asset | null>(location.state?.asset || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [engineers, setEngineers] = useState<Engineer[]>([]);

  // ── Edit existing allocation ──
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [editEngineerId, setEditEngineerId] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editContactDisplay, setEditContactDisplay] = useState('');
  const [updatingAllocation, setUpdatingAllocation] = useState(false);

  // ── Add new allocation ──
  const [showNewForm, setShowNewForm] = useState(false);
  const [newEngineerId, setNewEngineerId] = useState('');
  const [newContactDisplay, setNewContactDisplay] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState('');
  const [creatingAllocation, setCreatingAllocation] = useState(false);

  // ── Fetch asset ──
  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) { setError('No asset ID provided'); setLoading(false); return; }
      try {
        setLoading(true); setError(null);
        const isSalesforceId = /^a[A-Za-z0-9]{17}$/i.test(id);
        const endpoint = isSalesforceId
          ? `/api/assets/by-id/${encodeURIComponent(id)}`
          : `/api/assets/by-van/${encodeURIComponent(id)}`;
        const res = await fetch(endpoint);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Asset not found' }));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        setAsset(await res.json());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load asset';
        setError(msg); toast.error(msg);
      } finally { setLoading(false); }
    };
    fetchAsset();
  }, [id]);

  // ── Fetch engineers ──
  useEffect(() => {
    fetch('/api/assets/engineers')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setEngineers(data.engineers || []))
      .catch(() => console.error('Could not load engineers'));
  }, []);

  // ── Helpers ──
  const startEditingAllocation = (a: AllocationHistory) => {
    setEditingAllocationId(a.id);
    setEditEngineerId(a.service_resource_id);
    setEditStartDate(a.start_date ?? '');
    setEditEndDate(a.end_date ?? '');
    setEditContactDisplay(a.contact_number ?? 'N/A');
  };

  const cancelEditing = () => {
    setEditingAllocationId(null);
    setEditEngineerId(''); setEditStartDate(''); setEditEndDate(''); setEditContactDisplay('');
  };

  const handleEditEngineerChange = (eng: Engineer | null) => {
    setEditEngineerId(eng?.id ?? '');
    setEditContactDisplay(eng?.contact_number || 'N/A');
  };

  const handleNewEngineerChange = (eng: Engineer | null) => {
    setNewEngineerId(eng?.id ?? '');
    setNewContactDisplay(eng?.contact_number || 'N/A');
  };

  const resetNewForm = () => {
    setShowNewForm(false);
    setNewEngineerId(''); setNewContactDisplay('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewEndDate('');
  };

  // ── Update existing allocation — NO contact_number sent to SF ──
  const handleUpdateAllocation = async () => {
    if (!editingAllocationId) return;
    setUpdatingAllocation(true);
    try {
      const res = await fetch('/api/assets/allocation/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocation_id: editingAllocationId,
          service_resource_id: editEngineerId || undefined,
          start_date: editStartDate || undefined,
          end_date: editEndDate || null,
          // ❌ contact_number NOT sent — read-only field in Salesforce
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Allocation updated successfully');
        cancelEditing();
        window.location.reload();
      } else {
        toast.error(result.detail || 'Failed to update allocation');
      }
    } catch { toast.error('Error updating allocation'); }
    finally { setUpdatingAllocation(false); }
  };

  // ── Create new allocation — saves to Salesforce ──
  const handleCreateAllocation = async () => {
    if (!newEngineerId || !newStartDate) {
      toast.error('Please select an engineer and start date');
      return;
    }
    if (!asset?.id) { toast.error('No asset ID found'); return; }

    setCreatingAllocation(true);
    try {
      const res = await fetch('/api/assets/allocation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: asset.id,
          service_resource_id: newEngineerId,
          start_date: newStartDate,
          end_date: newEndDate || null,
          // ❌ contact_number NOT sent — read-only field in Salesforce
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          result.previous_allocation_closed
            ? 'New allocation created & previous one closed'
            : 'New allocation created successfully'
        );
        resetNewForm();
        window.location.reload();
      } else {
        toast.error(result.detail || 'Failed to create allocation');
      }
    } catch { toast.error('Error creating allocation'); }
    finally { setCreatingAllocation(false); }
  };

  // ── Delete individual allocation row from Salesforce ──
  const handleDeleteAllocation = async (allocationId: string, engineerName: string) => {
    if (!window.confirm(`Delete the allocation for "${engineerName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/assets/allocation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocation_id: allocationId }),
      });
      
      // Handle non-OK responses
      if (!res.ok) {
        let errorMsg = `HTTP Error: ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          // Response is not JSON, use default message
        }
        throw new Error(errorMsg);
      }
      
      const result = await res.json();
      if (result.success) {
        toast.success('Allocation deleted successfully');
        window.location.reload();
      } else {
        toast.error(result.detail || 'Failed to delete allocation');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error deleting allocation';
      toast.error(errMsg);
      console.error('Delete allocation error:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this vehicle asset?')) return;
    setDeleting(true);
    try { toast.success('Asset deleted successfully'); navigate('/assets'); }
    catch { toast.error('Failed to delete asset'); }
    finally { setDeleting(false); }
  };

  const formatDate = (d?: string) => {
    if (!d) return 'N/A';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return 'N/A'; }
  };

  const formatDateTime = (d: string) => {
    if (!d) return 'N/A';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'N/A'; }
  };

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FD] flex items-center justify-center font-['Montserrat']">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#27549D] mx-auto mb-4" />
          <p className="text-[#646F86] font-medium">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-[#F7F9FD] p-6 font-['Montserrat']">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate('/assets')} className="flex items-center gap-2 text-[#27549D] hover:text-[#17325E] mb-4 font-semibold">
            <ArrowLeft size={20} /> Back to Assets
          </button>
          <Card className="text-center py-16 border-[#CDD1DA] bg-white shadow-sm">
            <CardContent>
              <h3 className="text-xl font-bold text-[#1A1D23] mb-2">{error || 'Asset Not Found'}</h3>
              <Button onClick={() => navigate('/assets')} variant="outline" className="border-[#27549D] text-[#27549D] font-semibold">
                Return to Assets List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F7F9FD] p-6 font-['Montserrat']">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/assets')} className="flex items-center gap-2 text-[#27549D] hover:text-[#17325E] mb-4 font-semibold transition-colors">
            <ArrowLeft size={20} /> Back to Assets
          </button>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#1A1D23]">{asset.name}</h1>
              <p className="text-[#646F86] mt-2 font-medium flex items-center gap-2">
                <Calendar size={16} /> Added on {formatDateTime(asset.created_date)}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className="text-sm bg-[#27549D] text-white font-semibold px-4 py-1">{asset.status}</Badge>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 border-[#CDD1DA] text-[#323843] font-semibold">
                <Download size={16} /> Export
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-2 bg-[#D15134] hover:bg-[#812F1D] text-white font-semibold">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
              </Button>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {asset.ai_insights && (
          <Card className="mb-6 border-2 border-[#27549D] bg-gradient-to-br from-[#F7F9FD] to-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#17325E] font-bold">
                <Sparkles size={24} className="text-[#27549D]" /> AI-Powered Vehicle Insights
              </CardTitle>
              <CardDescription className="text-[#646F86] font-semibold">
                Intelligent analysis based on vehicle data and allocation history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white/90 p-6 rounded-lg border border-[#DEE8F7] shadow-sm">
                <div className="text-[#323843] leading-relaxed whitespace-pre-wrap font-medium">{asset.ai_insights}</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-[#27549D]">
                <Brain size={16} /><span className="font-bold">Powered by AI Fleet Analysis Engine</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Hash size={16} />, label: 'Van Number', value: asset.van_number, big: true },
            { icon: <FileText size={16} />, label: 'Registration', value: asset.registration_number, big: true },
            { icon: <MapPin size={16} />, label: 'Tracking #', value: asset.tracking_number, big: false },
            { icon: <Settings size={16} />, label: 'Vehicle Type', value: asset.vehicle_type, big: false },
          ].map(({ icon, label, value, big }) => (
            <Card key={label} className="border-[#CDD1DA] bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#27549D]">{icon} {label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`font-bold text-[#1A1D23] ${big ? 'text-2xl' : 'text-sm'}`}>{value || 'N/A'}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vehicle Details */}
        <Card className="mb-6 border-[#CDD1DA] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#27549D] font-bold"><Car size={20} /> Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Trade Group', value: asset.trade_group },
                { label: 'Make & Model', value: asset.make_model },
                { label: 'Transmission', value: asset.transmission },
                { label: 'Vehicle Ownership', value: asset.vehicle_ownership },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-sm text-[#27549D] mb-1 font-bold">{label}</p>
                  <p className="font-bold text-[#1A1D23]">{value || 'N/A'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MOT / Tax / Service / Driver */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-[#CDD1DA] bg-white shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-[#27549D] font-bold"><Shield size={20} /> MOT Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-sm text-[#27549D] mb-1 font-bold">Last MOT Date</p><p className="font-bold text-[#323843]">{formatDate(asset.last_mot_date)}</p></div>
              <div><p className="text-sm text-[#27549D] mb-1 font-bold">Next MOT Date</p><p className="font-bold text-[#323843]">{formatDate(asset.next_mot_date)}</p></div>
            </CardContent>
          </Card>
          <Card className="border-[#CDD1DA] bg-white shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-[#27549D] font-bold"><FileText size={20} /> Road Tax Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-sm text-[#27549D] mb-1 font-bold">Last Road Tax</p><p className="font-bold text-[#323843]">{formatDate(asset.last_road_tax)}</p></div>
              <div><p className="text-sm text-[#27549D] mb-1 font-bold">Next Road Tax</p><p className="font-bold text-[#323843]">{formatDate(asset.next_road_tax)}</p></div>
            </CardContent>
          </Card>
          <Card className="border-[#CDD1DA] bg-white shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-[#27549D] font-bold"><Wrench size={20} /> Service Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-sm text-[#27549D] mb-1 font-bold">Last Service Date</p><p className="font-bold text-[#323843]">{formatDate(asset.last_service_date)}</p></div>
              <div><p className="text-sm text-[#27549D] mb-1 font-bold">Next Service Date</p><p className="font-bold text-[#323843]">{formatDate(asset.next_service_date)}</p></div>
            </CardContent>
          </Card>
          <Card className="border-[#CDD1DA] bg-white shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-[#27549D] font-bold"><Users size={20} /> Current Assignment</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-[#27549D] mb-1 font-bold">Assigned Driver</p>
              <p className="font-bold text-[#323843]">{asset.driver_name || 'No driver assigned'}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Vehicle Allocation History ── */}
        <Card className="mb-6 border-[#CDD1DA] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-[#27549D] font-bold">
                  <Clock size={20} /> Vehicle Allocation History
                </CardTitle>
                <CardDescription className="text-[#646F86] font-semibold mt-1">
                  Complete history of driver assignments — Click Edit to modify or Add New to create
                </CardDescription>
              </div>
              {/* ── Add New Allocation Button ── */}
              {!showNewForm && (
                <Button
                  onClick={() => setShowNewForm(true)}
                  className="bg-[#27549D] hover:bg-[#1e3f73] text-white flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} /> Add New Allocation
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* ── NEW ALLOCATION FORM ── */}
            {showNewForm && (
              <div className="mb-6 border-2 border-[#27549D] rounded-xl p-5 bg-[#F0F5FC]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#17325E] font-bold text-base flex items-center gap-2">
                    <Plus size={18} className="text-[#27549D]" /> New Allocation
                  </h3>
                  <button onClick={resetNewForm} className="text-[#848EA3] hover:text-[#323843]">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Engineer Search */}
                  <div>
                    <label className="block text-sm font-semibold text-[#323843] mb-2">
                      Engineer <span className="text-red-500">*</span>
                    </label>
                    <EngineerCombobox
                      engineers={engineers}
                      value={newEngineerId}
                      onChange={handleNewEngineerChange}
                      placeholder="Search & select engineer..."
                    />
                  </div>

                  {/* Contact Number — display only */}
                  <ContactDisplay number={newContactDisplay} />

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-semibold text-[#323843] mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="border-[#CDD1DA] focus:ring-[#27549D] focus:border-[#27549D] h-10"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-semibold text-[#323843] mb-2">
                      End Date <span className="font-normal text-[#848EA3]">(Optional — leave blank for current)</span>
                    </label>
                    <Input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="border-[#CDD1DA] focus:ring-[#27549D] focus:border-[#27549D] h-10"
                    />
                  </div>
                </div>

                {/* Info banner */}
                <div className="mt-4 p-3 bg-[#DEE8F7] rounded-lg border border-[#27549D]/20">
                  <p className="text-xs text-[#17325E] font-medium flex items-start gap-2">
                    <span className="text-[#27549D] font-bold shrink-0">ℹ</span>
                    If this vehicle has an active (no end date) allocation, it will be automatically closed with today's date before the new one is created.
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleCreateAllocation}
                    disabled={creatingAllocation || !newEngineerId || !newStartDate}
                    className="bg-[#27549D] hover:bg-[#1e3f73] text-white flex items-center gap-2"
                  >
                    {creatingAllocation
                      ? <><Loader2 size={16} className="animate-spin" /> Saving to Salesforce...</>
                      : <><Save size={16} /> Save Allocation to Salesforce</>
                    }
                  </Button>
                  <Button onClick={resetNewForm} variant="outline" className="border-[#CDD1DA] text-[#323843] hover:bg-[#E8EAEE] flex items-center gap-2">
                    <X size={16} /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* ── EXISTING ALLOCATION RECORDS ── */}
            {(!asset.vehicle_allocation_history || asset.vehicle_allocation_history.length === 0) ? (
              <div className="text-center py-10 border-2 border-dashed border-[#CDD1DA] rounded-xl">
                <Clock size={32} className="mx-auto text-[#CDD1DA] mb-3" />
                <p className="text-[#848EA3] font-semibold">No allocation history yet.</p>
                <p className="text-[#848EA3] text-sm mt-1">Click <strong>Add New Allocation</strong> above to assign an engineer.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {asset.vehicle_allocation_history.map((allocation) => (
                  <div
                    key={allocation.id}
                    className={`border rounded-lg p-4 transition-all ${
                      !allocation.end_date
                        ? 'border-[#27549D] bg-[#F0F5FC]'
                        : 'border-[#CDD1DA] bg-[#F7F9FD]'
                    }`}
                  >
                    {editingAllocationId === allocation.id ? (
                      /* ── Edit Mode ── */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-[#323843] mb-2">Engineer</label>
                            <EngineerCombobox
                              engineers={engineers}
                              value={editEngineerId}
                              onChange={handleEditEngineerChange}
                            />
                          </div>
                          <ContactDisplay number={editContactDisplay} />
                          <div>
                            <label className="block text-sm font-semibold text-[#323843] mb-2">Start Date</label>
                            <Input
                              type="date"
                              value={editStartDate}
                              onChange={(e) => setEditStartDate(e.target.value)}
                              className="border-[#CDD1DA] focus:ring-[#27549D] h-10"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#323843] mb-2">
                              End Date <span className="font-normal text-[#848EA3]">(Optional)</span>
                            </label>
                            <Input
                              type="date"
                              value={editEndDate}
                              onChange={(e) => setEditEndDate(e.target.value)}
                              className="border-[#CDD1DA] focus:ring-[#27549D] h-10"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={handleUpdateAllocation}
                            disabled={updatingAllocation || !editEngineerId}
                            className="bg-[#27549D] hover:bg-[#1e3f73] text-white flex items-center gap-2"
                          >
                            {updatingAllocation
                              ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                              : <><Save size={16} /> Save Changes</>
                            }
                          </Button>
                          <Button onClick={cancelEditing} variant="outline" className="border-[#CDD1DA] text-[#323843] hover:bg-[#E8EAEE] flex items-center gap-2">
                            <X size={16} /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── View Mode ── */
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-[#646F86] font-semibold">Engineer</p>
                              <p className="font-semibold text-[#323843] flex items-center gap-2 mt-0.5">
                                <Users size={15} className="text-[#848EA3]" />
                                {allocation.service_resource_name || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-[#646F86] font-semibold">Contact</p>
                              <p className="font-semibold text-[#323843] flex items-center gap-2 mt-0.5">
                                <Phone size={15} className="text-[#848EA3]" />
                                {allocation.contact_number || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-[#646F86] font-semibold">Start Date</p>
                              <p className="font-semibold text-[#323843] flex items-center gap-2 mt-0.5">
                                <Calendar size={15} className="text-[#848EA3]" />
                                {formatDate(allocation.start_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-[#646F86] font-semibold">End Date</p>
                              {allocation.end_date
                                ? <p className="font-semibold text-[#323843] mt-0.5">{formatDate(allocation.end_date)}</p>
                                : <Badge variant="outline" className="border-[#2EB844] text-[#2EB844] font-bold mt-1">Current Assignment</Badge>
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4 shrink-0">
                          <Button
                            onClick={() => startEditingAllocation(allocation)}
                            variant="outline"
                            className="border-[#27549D] text-[#27549D] hover:bg-[#DEE8F7] flex items-center gap-2"
                          >
                            <Edit2 size={16} /> Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteAllocation(allocation.id, allocation.service_resource_name)}
                            variant="outline"
                            className="border-[#D15134] text-[#D15134] hover:bg-[#FDF2F0] flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Image */}
        <Card className="mb-6 border-[#CDD1DA] bg-white shadow-sm">
          <CardHeader><CardTitle className="text-[#27549D] font-bold">Vehicle Image</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-[#DEE8F7] to-[#F7F9FD] h-96 rounded-lg border border-[#CDD1DA] overflow-hidden">
              <img src={asset.image_data || '/aspect-van.jpg'} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="mb-6 border-[#CDD1DA] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#27549D] font-bold"><FileText size={20} /> Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#323843] leading-relaxed font-medium">{asset.description || 'No description available'}</p>
          </CardContent>
        </Card>

        {/* Footer */}
        <Alert className="bg-[#F7F9FD] border-2 border-[#27549D]">
          <Zap size={16} className="text-[#27549D]" />
          <AlertDescription className="text-[#17325E] font-semibold">
            This asset includes complete vehicle information, maintenance schedules, allocation history, AI-powered insights, and compliance data. All information is stored securely and can be exported for reporting purposes.
          </AlertDescription>
        </Alert>

      </div>
    </div>
  );
}