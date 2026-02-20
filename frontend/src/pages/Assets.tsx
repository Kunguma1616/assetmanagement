/**
 * VehicleAllocationHistory.tsx
 * 
 * FIXES:
 * 1. Engineer field is now a SEARCHABLE combobox (type to filter by name)
 * 2. Contact number auto-populates when engineer is selected
 * 3. Backend /api/assets/engineers returns contact info too
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Clock,
  Save,
  X,
  Search,
  ChevronDown,
  User,
  Phone,
  CalendarDays,
  Pencil,
  Plus,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Engineer {
  id: string;
  name: string;
  email?: string;
  contact_number?: string; // populated from Salesforce ServiceResource or allocation records
}

interface AllocationRecord {
  id: string;
  start_date: string;
  end_date: string | null;
  service_resource_name: string;
  service_resource_id: string;
  contact_number: string;
}

interface Props {
  vehicleId: string;
  allocations: AllocationRecord[];
  onAllocationSaved?: () => void; // callback to refresh parent data
}

const API_BASE = 'https://your-api-base.onrender.com'; // ← replace with your actual base URL

// ─── Searchable Engineer Combobox ─────────────────────────────────────────────
function EngineerCombobox({
  engineers,
  value,
  onChange,
  disabled,
}: {
  engineers: Engineer[];
  value: string;
  onChange: (engineer: Engineer | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = engineers.find((e) => e.id === value) ?? null;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return engineers;
    return engineers.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.contact_number ?? '').includes(q) ||
        (e.email ?? '').toLowerCase().includes(q)
    );
  }, [query, engineers]);

  function handleSelect(eng: Engineer) {
    onChange(eng);
    setQuery('');
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery('');
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger / Search Input */}
      <div
        className={`flex items-center border rounded-lg bg-white px-3 gap-2 h-10 cursor-text transition-shadow
          ${open ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200 hover:border-slate-300'}
          ${disabled ? 'opacity-50 pointer-events-none bg-slate-50' : ''}`}
        onClick={() => !disabled && setOpen(true)}
      >
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        {open ? (
          <input
            autoFocus
            className="flex-1 outline-none text-sm bg-transparent placeholder:text-slate-400"
            placeholder="Type name to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
            {selected ? selected.name : 'Select Engineer'}
          </span>
        )}
        {selected && !open ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No engineers found for "{query}"
              </div>
            ) : (
              filtered.map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => handleSelect(eng)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 transition-colors
                    ${eng.id === value ? 'bg-blue-50' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{eng.name}</div>
                    {eng.contact_number && (
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {eng.contact_number}
                      </div>
                    )}
                  </div>
                  {eng.id === value && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">{filtered.length} of {engineers.length} engineers</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Allocation Row ────────────────────────────────────────────────────────────
function AllocationRow({
  record,
  engineers,
  onSave,
}: {
  record: AllocationRecord;
  engineers: Engineer[];
  onSave: (id: string, data: Partial<AllocationRecord>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedEngineerId, setSelectedEngineerId] = useState(record.service_resource_id);
  const [contactNumber, setContactNumber] = useState(record.contact_number);
  const [startDate, setStartDate] = useState(record.start_date ?? '');
  const [endDate, setEndDate] = useState(record.end_date ?? '');

  const isCurrent = !record.end_date;

  // When engineer changes → auto-fill contact number
  function handleEngineerChange(eng: Engineer | null) {
    setSelectedEngineerId(eng?.id ?? '');
    if (eng?.contact_number) {
      setContactNumber(eng.contact_number);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(record.id, {
        service_resource_id: selectedEngineerId,
        contact_number: contactNumber,
        start_date: startDate,
        end_date: endDate || null,
      });
      setEditing(false);
      toast.success('Allocation updated successfully');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setSelectedEngineerId(record.service_resource_id);
    setContactNumber(record.contact_number);
    setStartDate(record.start_date ?? '');
    setEndDate(record.end_date ?? '');
    setEditing(false);
  }

  return (
    <div className={`rounded-xl border p-4 transition-all ${isCurrent ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCurrent ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">● Current</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Past</Badge>
          )}
          <span className="text-xs text-slate-400 font-mono">{record.id.slice(0, 18)}…</span>
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2 text-xs gap-1 text-slate-500">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        /* ── Edit Mode ── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engineer Combobox */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <User className="h-3 w-3" /> Engineer
              </Label>
              <EngineerCombobox
                engineers={engineers}
                value={selectedEngineerId}
                onChange={handleEngineerChange}
              />
            </div>

            {/* Contact Number — auto-populated but editable */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Phone className="h-3 w-3" /> Contact Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Auto-populated from engineer"
                  className="pl-9 h-10 text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400">Auto-filled when engineer selected. Edit if needed.</p>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> End Date
                <span className="text-slate-400 font-normal normal-case">(Optional)</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !selectedEngineerId}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs"
            >
              {saving ? (
                <span className="flex items-center gap-1"><span className="animate-spin">⟳</span> Saving…</span>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save Changes</>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1.5 h-8 text-xs">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Engineer</p>
            <p className="font-medium text-slate-800">{record.service_resource_name || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Contact</p>
            <p className="font-medium text-slate-800">{record.contact_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Start Date</p>
            <p className="font-medium text-slate-800">{record.start_date || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">End Date</p>
            <p className={`font-medium ${isCurrent ? 'text-green-600' : 'text-slate-800'}`}>
              {record.end_date || (isCurrent ? 'Current' : '—')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Allocation Form ───────────────────────────────────────────────────────
function NewAllocationForm({
  vehicleId,
  engineers,
  onCreated,
  onCancel,
}: {
  vehicleId: string;
  engineers: Engineer[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  function handleEngineerChange(eng: Engineer | null) {
    setSelectedEngineerId(eng?.id ?? '');
    if (eng?.contact_number) {
      setContactNumber(eng.contact_number);
    }
  }

  async function handleCreate() {
    if (!selectedEngineerId || !startDate) {
      toast.error('Engineer and start date are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/assets/allocation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          service_resource_id: selectedEngineerId,
          start_date: startDate,
          contact_number: contactNumber || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? 'Create failed');
      toast.success('New allocation created!');
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create allocation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-5 space-y-4">
      <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
        <Plus className="h-4 w-4" /> New Allocation
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engineer Search */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            <User className="h-3 w-3" /> Engineer
          </Label>
          <EngineerCombobox
            engineers={engineers}
            value={selectedEngineerId}
            onChange={handleEngineerChange}
          />
        </div>

        {/* Contact Number (auto-filled) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            <Phone className="h-3 w-3" /> Contact Number
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Auto-filled from engineer"
              className="pl-9 h-10 text-sm"
            />
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Start Date
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={saving || !selectedEngineerId || !startDate}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs"
        >
          {saving ? 'Creating…' : <><Plus className="h-3.5 w-3.5" /> Create Allocation</>}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs gap-1">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VehicleAllocationHistory({ vehicleId, allocations: initialAllocations, onAllocationSaved }: Props) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>(initialAllocations);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loadingEngineers, setLoadingEngineers] = useState(true);

  // ── Fetch engineers WITH contact numbers ──
  useEffect(() => {
    async function loadEngineers() {
      try {
        const res = await fetch(`${API_BASE}/api/assets/engineers`);
        const json = await res.json();
        setEngineers(json.engineers ?? []);
      } catch {
        toast.error('Could not load engineer list');
      } finally {
        setLoadingEngineers(false);
      }
    }
    loadEngineers();
  }, []);

  // ── Save existing allocation ──
  async function handleSaveAllocation(id: string, data: Partial<AllocationRecord>) {
    const res = await fetch(`${API_BASE}/api/assets/allocation/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocation_id: id,
        service_resource_id: data.service_resource_id,
        start_date: data.start_date,
        end_date: data.end_date ?? null,
        contact_number: data.contact_number,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).detail ?? 'Update failed');
    onAllocationSaved?.();
  }

  // ── After new allocation created ──
  function handleCreated() {
    setShowNewForm(false);
    onAllocationSaved?.();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Vehicle Allocation History
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete history of driver assignments — Click <strong>Edit</strong> to modify
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewForm(true)}
          disabled={showNewForm}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Allocation
        </Button>
      </div>

      {/* New Allocation Form */}
      {showNewForm && (
        <NewAllocationForm
          vehicleId={vehicleId}
          engineers={engineers}
          onCreated={handleCreated}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* Allocation Records */}
      {loadingEngineers ? (
        <div className="text-center py-8 text-slate-400 text-sm animate-pulse">Loading engineers…</div>
      ) : allocations.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          No allocation history for this vehicle.
        </div>
      ) : (
        <div className="space-y-3">
          {allocations.map((alloc) => (
            <AllocationRow
              key={alloc.id}
              record={alloc}
              engineers={engineers}
              onSave={handleSaveAllocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}