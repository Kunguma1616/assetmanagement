import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { PackagePlus, Loader2, ArrowLeft, ChevronDown, X, ImagePlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AssetFormData {
  // Required
  asset_name: string;
  // Core
  serial_number: string;
  account_name: string;
  asset_type: string;
  status: string;
  // Financial
  price: string;
  purchase_date: string;
  purchase_type: string;
  // People
  user_name: string;
  // Extra
  repair_status: string;
  description: string;
}

interface SfUser {
  Id: string;
  Name: string;
  Email: string;
}

interface SfAssetType {
  id: string;
  name: string;
}

interface PurchaseType {
  id: string;
  name: string;
}

const EMPTY_FORM: AssetFormData = {
  asset_name: '',
  serial_number: '',
  account_name: '',
  asset_type: '',
  status: '',
  price: '',
  purchase_date: '',
  purchase_type: '',
  user_name: '',
  repair_status: '',
  description: '',
};

export default function RegisterAsset() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AssetFormData>(EMPTY_FORM);

  // ── Image upload state ───────────────────────────────────────────────────
  const [images, setImages] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── User picklist state ──────────────────────────────────────────────────
  const [sfUsers, setSfUsers] = useState<SfUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [usersApiError, setUsersApiError] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  // ── Asset Type picklist state ────────────────────────────────────────────
  const [sfAssetTypes, setSfAssetTypes] = useState<SfAssetType[]>([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [typesApiError, setTypesApiError] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  // ── Purchase Type picklist state ────────────────────────────────────────
  const [purchaseTypes, setPurchaseTypes] = useState<PurchaseType[]>([]);
  const [purchaseTypesError, setPurchaseTypesError] = useState(false);

  // Fetch users
  useEffect(() => {
    fetch('/api/register-asset/users')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setSfUsers(d.users || []))
      .catch(() => setUsersApiError(true));
  }, []);

  // Fetch asset types
  useEffect(() => {
    fetch('/api/register-asset/asset-types')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setSfAssetTypes(d.asset_types || []))
      .catch(() => setTypesApiError(true));
  }, []);

  // Fetch purchase types
  useEffect(() => {
    fetch('/api/register-asset/purchase-types')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setPurchaseTypes(d.purchase_types || []))
      .catch(() => setPurchaseTypesError(true));
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close asset type dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setTypeDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredUsers = sfUsers.filter(u =>
    u.Name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.Email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTypes = sfAssetTypes.filter(t =>
    t.name.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const selectUser = (user: SfUser) => {
    setFormData(prev => ({ ...prev, user_name: user.Name }));
    setUserSearch(user.Name);
    setUserDropOpen(false);
  };

  const clearUser = () => {
    setFormData(prev => ({ ...prev, user_name: '' }));
    setUserSearch('');
  };

  const selectType = (type: SfAssetType) => {
    setFormData(prev => ({ ...prev, asset_type: type.name }));
    setTypeSearch(type.name);
    setTypeDropOpen(false);
  };

  const clearType = () => {
    setFormData(prev => ({ ...prev, asset_type: '' }));
    setTypeSearch('');
  };

  // ── Image handling ───────────────────────────────────────────────────────
  // Compress to max 1024×1024 JPEG 72% before upload — keeps payload small
  // and prevents ERR_CONTENT_LENGTH_MISMATCH on large images.
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1024;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addImages = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const compressed = await Promise.all(imageFiles.map(compressImage));
    setImages(prev => [...prev, ...compressed]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addImages(e.dataTransfer.files);
  }, [addImages]);

  const removeImage = (idx: number) =>
    setImages(prev => prev.filter((_, i) => i !== idx));

  // ────────────────────────────────────────────────────────────────────────

  const set = (field: keyof AssetFormData, value: string | boolean) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const resetAll = () => {
    setFormData(EMPTY_FORM);
    setUserSearch('');
    setTypeSearch('');
    setImages([]);
  };

  const handleSave = async (saveAndNew = false) => {
    if (!formData.asset_name.trim()) {
      toast.error('Asset Name is required');
      return;
    }

    if (!formData.account_name.trim()) {
      toast.error('Account is required (Salesforce requires an Account or Contact for every Asset)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : undefined,
        images,
      };

      const res = await fetch('/api/register-asset/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 405) throw new Error('Backend not updated — please restart the backend server (python app.py)');
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Failed to register asset');

      toast.success(`Asset registered! Salesforce ID: ${result.salesforce_id}`);

      if (saveAndNew) {
        resetAll();
      } else {
        setTimeout(() => navigate('/assets'), 1500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <PackagePlus size={28} className="text-blue-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Register New Asset</h1>
              <p className="text-sm text-gray-500">Creates a new Salesforce Asset record</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">

          {/* ── Image Upload ──────────────────────────────────────────── */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-blue-700">Asset Images</CardTitle>
              <CardDescription>Upload photos of the asset (optional)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={36} className="mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-600">
                  Drag &amp; drop images here, or <span className="text-blue-600 underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP supported</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => addImages(e.target.files)}
                />
              </div>

              {/* Previews */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {images.map((src, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={src}
                        alt={`Asset image ${idx + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Core Information ──────────────────────────────────────── */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-blue-700">Core Information</CardTitle>
              <CardDescription>Basic asset identification</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">

                {/* Asset Name — required */}
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Asset Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., Laptop Dell XPS 15"
                    value={formData.asset_name}
                    onChange={e => set('asset_name', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Serial Number</Label>
                  <Input
                    placeholder="e.g., SN-2024-00123"
                    value={formData.serial_number}
                    onChange={e => set('serial_number', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                {/* Asset Type — searchable combobox (falls back to text input if API unavailable) */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Asset Type</Label>
                  {typesApiError ? (
                    <Input
                      placeholder="Enter asset type"
                      value={formData.asset_type}
                      onChange={e => set('asset_type', e.target.value)}
                      className="border-gray-300"
                    />
                  ) : (
                    <div className="relative" ref={typeRef}>
                      <div className="relative flex items-center">
                        <Input
                          placeholder={sfAssetTypes.length ? 'Search asset types…' : 'Loading types…'}
                          value={typeSearch}
                          onChange={e => {
                            setTypeSearch(e.target.value);
                            setTypeDropOpen(true);
                            if (!e.target.value) clearType();
                          }}
                          onFocus={() => setTypeDropOpen(true)}
                          className="border-gray-300 pr-16"
                        />
                        {typeSearch && (
                          <button
                            type="button"
                            onClick={clearType}
                            className="absolute right-8 text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Dropdown list */}
                      {typeDropOpen && filteredTypes.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {filteredTypes.slice(0, 50).map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onMouseDown={() => selectType(t)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors text-sm text-gray-800"
                            >
                              {t.name}
                            </button>
                          ))}
                          {filteredTypes.length > 50 && (
                            <p className="px-3 py-2 text-xs text-gray-400 text-center border-t">
                              Showing 50 of {filteredTypes.length} — type to narrow
                            </p>
                          )}
                        </div>
                      )}

                      {typeDropOpen && typeSearch && filteredTypes.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
                          <p className="text-sm text-gray-400">No types found for "{typeSearch}"</p>
                        </div>
                      )}
                    </div>
                  )}
                  {formData.asset_type && (
                    <p className="text-xs text-blue-600 mt-1">Selected: {formData.asset_type}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</Label>
                  <Select value={formData.status} onValueChange={v => set('status', v)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Purchased">Purchased</SelectItem>
                      <SelectItem value="Shipped">Shipped</SelectItem>
                      <SelectItem value="Installed">Installed</SelectItem>
                      <SelectItem value="Registered">Registered</SelectItem>
                      <SelectItem value="Obsolete">Obsolete</SelectItem>
                      <SelectItem value="Disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Repair Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Repair Status</Label>
                  <Select value={formData.repair_status} onValueChange={v => set('repair_status', v)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select repair status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Required">Not Required</SelectItem>
                      <SelectItem value="Awaiting Parts">Awaiting Parts</SelectItem>
                      <SelectItem value="Repaired">Repaired</SelectItem>
                      <SelectItem value="Written Off">Written Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* ── Ownership & Account ───────────────────────────────────── */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-blue-700">Ownership & Account</CardTitle>
              <CardDescription>Who owns and is responsible for this asset</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">

                {/* Account */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Account <span className="text-red-600">*</span></Label>
                  <Input
                    placeholder="Account name (exact match)"
                    value={formData.account_name}
                    onChange={e => set('account_name', e.target.value)}
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Looked up by name → AccountId (Required by Salesforce)</p>
                </div>

                {/* User — searchable dropdown from Salesforce engineer/warehouse names */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Engineer / User</Label>
                  <p className="text-xs text-gray-500 mb-2">Search for an engineer name or warehouse user</p>
                  {usersApiError ? (
                    <Input
                      placeholder="Enter user name"
                      value={formData.user_name}
                      onChange={e => set('user_name', e.target.value)}
                      className="border-gray-300"
                    />
                  ) : (
                    <div className="relative" ref={userRef}>
                      <div className="relative flex items-center">
                        <Input
                          placeholder={sfUsers.length ? 'Search users…' : 'Loading users…'}
                          value={userSearch}
                          onChange={e => {
                            setUserSearch(e.target.value);
                            setUserDropOpen(true);
                            if (!e.target.value) clearUser();
                          }}
                          onFocus={() => setUserDropOpen(true)}
                          className="border-gray-300 pr-16"
                        />
                        {userSearch && (
                          <button
                            type="button"
                            onClick={clearUser}
                            className="absolute right-8 text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                      </div>

                      {userDropOpen && filteredUsers.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {filteredUsers.slice(0, 50).map(user => (
                            <button
                              key={user.Id}
                              type="button"
                              onMouseDown={() => selectUser(user)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-800">{user.Name}</p>
                              <p className="text-xs text-gray-400">{user.Email}</p>
                            </button>
                          ))}
                          {filteredUsers.length > 50 && (
                            <p className="px-3 py-2 text-xs text-gray-400 text-center border-t">
                              Showing 50 of {filteredUsers.length} — type to narrow
                            </p>
                          )}
                        </div>
                      )}

                      {userDropOpen && userSearch && filteredUsers.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
                          <p className="text-sm text-gray-400">No users found for "{userSearch}"</p>
                        </div>
                      )}
                    </div>
                  )}
                  {formData.user_name && (
                    <p className="text-xs text-blue-600 mt-1">Selected: {formData.user_name}</p>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>

          {/* ── Financial ─────────────────────────────────────────────── */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-blue-700">Financial</CardTitle>
              <CardDescription>Purchase cost and acquisition details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Price (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 1250.00"
                    value={formData.price}
                    onChange={e => set('price', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Purchase Type</Label>
                  <Select value={formData.purchase_type} onValueChange={v => set('purchase_type', v)} disabled={purchaseTypesError || purchaseTypes.length === 0}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder={purchaseTypesError ? "Error loading types" : purchaseTypes.length === 0 ? "Loading..." : "Select type"} />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseTypes.length > 0 && purchaseTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={e => set('purchase_date', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* ── Description ───────────────────────────────────────────── */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-blue-700">Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea
                placeholder="Enter any additional notes or description for this asset..."
                value={formData.description}
                onChange={e => set('description', e.target.value)}
                className="border-gray-300"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={resetAll}
              disabled={saving}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Save & New
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-blue-700 text-white hover:bg-blue-800"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <PackagePlus size={16} className="mr-2" />
                  Register Asset
                </>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
