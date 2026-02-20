import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Upload as UploadIcon,
  Loader2,
  ArrowLeft,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AssetFormData {
  veh: string;
  registration_number: string;
  registration_date: string;
  van_number: string;
  tracking_number: string;
  make_model: string;
  status: string;
  vehicle_type: string;
  ulez_compliant: string;
  trade_group: string;
  transmission: string;
  department_type: string;
  vehicle_assigned_to: string;
  garage_repairs: string;
  vehicle_ownership: string;
  internal_notes: string;
  previous_drivers: string;
  previous_accident_date: string;
  vehicle_return_date: string;
  next_jetter_service: string;
  next_mot_date: string;
  next_road_tax: string;
  next_service_date: string;
  last_jetter_service: string;
  last_mot_date: string;
  last_road_tax: string;
  last_service_date: string;
  lease_start_date: string;
  owned_start_date: string;
  previous_accidents: boolean;
}

export default function UploadAsset() {
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<AssetFormData>({
    veh: '',
    registration_number: '',
    registration_date: '',
    van_number: '',
    tracking_number: '',
    make_model: '',
    status: '',
    vehicle_type: '',
    ulez_compliant: '',
    trade_group: '',
    transmission: '',
    department_type: '',
    vehicle_assigned_to: '',
    garage_repairs: '',
    vehicle_ownership: '',
    internal_notes: '',
    previous_drivers: '',
    previous_accident_date: '',
    vehicle_return_date: '',
    next_jetter_service: '',
    next_mot_date: '',
    next_road_tax: '',
    next_service_date: '',
    last_jetter_service: '',
    last_mot_date: '',
    last_road_tax: '',
    last_service_date: '',
    lease_start_date: '',
    owned_start_date: '',
    previous_accidents: false
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFiles(prev => [...prev, file]);
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    addImages(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ FIXED: Auto-generate VEH field
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Update the field
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    
    // Auto-generate VEH when van_number or registration_number changes
    if (name === 'van_number' || name === 'registration_number') {
      const vanNumber = name === 'van_number' ? value : formData.van_number;
      const regNumber = name === 'registration_number' ? value : formData.registration_number;
      
      // Generate VEH: "vanNumber - regNumber" (e.g., "379 - YB24UTN")
      if (vanNumber && regNumber) {
        updatedFormData.veh = `${vanNumber} - ${regNumber}`;
      } else if (vanNumber) {
        updatedFormData.veh = vanNumber;
      } else if (regNumber) {
        updatedFormData.veh = regNumber;
      } else {
        updatedFormData.veh = '';
      }
    }
    
    setFormData(updatedFormData);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSaveAsset = async (saveAndNew: boolean = false) => {
    // Validate required fields
    if (!formData.van_number.trim()) {
      toast.error('Please enter Van Number');
      return;
    }
    if (!formData.registration_number.trim()) {
      toast.error('Please enter Registration Number');
      return;
    }
    // VEH will be auto-generated, so we check it
    if (!formData.veh.trim()) {
      toast.error('VEH field could not be generated. Please enter Van Number and Registration Number');
      return;
    }

    setUploading(true);
    try {
      // Convert date format from YYYY-MM-DD to DD/MM/YYYY for backend
      let formattedDate = formData.registration_date;
      if (formData.registration_date) {
        const [year, month, day] = formData.registration_date.split('-');
        formattedDate = `${day}/${month}/${year}`;
      }

      const payload = {
        veh: formData.veh,
        registration_number: formData.registration_number,
        van_number: formData.van_number,
        tracking_number: formData.tracking_number,
        vehicle_type: formData.vehicle_type,
        status: formData.status,
        ulez_compliant: formData.ulez_compliant,
        trade_group: formData.trade_group,
        transmission: formData.transmission,
        department_type: formData.department_type,
        registration_date: formattedDate,
        make_model: formData.make_model,
        vehicle_ownership: formData.vehicle_ownership,
        garage_repairs: formData.garage_repairs,
        internal_notes: formData.internal_notes,
        images: previewUrls
      };

      console.log('📤 Sending payload:', payload);

      const response = await fetch('http://localhost:8000/api/assets/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('📥 Response:', result);

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to save asset');
      }

      toast.success('Vehicle uploaded successfully!');
      
      if (saveAndNew) {
        setFormData({
          veh: '',
          registration_number: '',
          registration_date: '',
          van_number: '',
          tracking_number: '',
          make_model: '',
          status: '',
          vehicle_type: '',
          ulez_compliant: '',
          trade_group: '',
          transmission: '',
          department_type: '',
          vehicle_assigned_to: '',
          garage_repairs: '',
          vehicle_ownership: '',
          internal_notes: '',
          previous_drivers: '',
          previous_accident_date: '',
          vehicle_return_date: '',
          next_jetter_service: '',
          next_mot_date: '',
          next_road_tax: '',
          next_service_date: '',
          last_jetter_service: '',
          last_mot_date: '',
          last_road_tax: '',
          last_service_date: '',
          lease_start_date: '',
          owned_start_date: '',
          previous_accidents: false
        });
        setImageFiles([]);
        setPreviewUrls([]);
      } else {
        setTimeout(() => {
          navigate('/assets');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save vehicle');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setImageFiles([]);
    setPreviewUrls([]);
    setFormData({
      veh: '',
      registration_number: '',
      registration_date: '',
      van_number: '',
      tracking_number: '',
      make_model: '',
      status: '',
      vehicle_type: '',
      ulez_compliant: '',
      trade_group: '',
      transmission: '',
      department_type: '',
      vehicle_assigned_to: '',
      garage_repairs: '',
      vehicle_ownership: '',
      internal_notes: '',
      previous_drivers: '',
      previous_accident_date: '',
      vehicle_return_date: '',
      next_jetter_service: '',
      next_mot_date: '',
      next_road_tax: '',
      next_service_date: '',
      last_jetter_service: '',
      last_mot_date: '',
      last_road_tax: '',
      last_service_date: '',
      lease_start_date: '',
      owned_start_date: '',
      previous_accidents: false
    });
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload New Vehicle</h1>
          <p className="text-sm text-gray-600">Upload vehicle images and enter details</p>
        </div>

        <div className="space-y-6">
          {/* Vehicle Images Card */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UploadIcon size={20} className="text-blue-700" />
                <CardTitle className="text-lg font-semibold text-blue-700">Vehicle Images</CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-600">Upload multiple photos of the vehicle (optional)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <div
                onClick={openFilePicker}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <UploadIcon size={40} className="mx-auto mb-3 text-blue-700" />
                <p className="text-base font-medium text-gray-900 mb-1">Drag & drop images here</p>
                <p className="text-sm text-gray-600 mb-1">or click to browse files</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF — max 10MB each</p>
              </div>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Details Card */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-blue-700">Vehicle Details</CardTitle>
              <CardDescription className="text-sm text-gray-600">Enter new vehicle information</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Van Number */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Van Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="van_number"
                    placeholder="e.g., 379"
                    value={formData.van_number}
                    onChange={handleInputChange}
                    className="border-gray-300"
                  />
                </div>

                {/* Registration Number */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Registration Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="registration_number"
                    placeholder="e.g., YB24UTN"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    className="border-gray-300"
                  />
                </div>

                {/* VEH (Auto-generated) - Read-only */}
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    VEH (Auto-generated) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="veh"
                    value={formData.veh}
                    readOnly
                    disabled
                    className="border-gray-300 bg-gray-100 cursor-not-allowed"
                    placeholder="Will be auto-generated from Van Number and Registration Number"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This field is automatically generated from Van Number and Registration Number
                  </p>
                </div>

                {/* Tracking Number */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Tracking Number
                  </Label>
                  <Input
                    name="tracking_number"
                    placeholder="e.g., TRACK-12345"
                    value={formData.tracking_number}
                    onChange={handleInputChange}
                    className="border-gray-300"
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Vehicle Type</Label>
                  <Select value={formData.vehicle_type} onValueChange={(value) => handleSelectChange('vehicle_type', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="e.g., Van, Truck" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long_wheel_base_high_roof">Long wheel base high roof</SelectItem>
                      <SelectItem value="long_wheel_base_low_roof">Long wheel base low roof</SelectItem>
                      <SelectItem value="short_wheel_base">Short wheel base</SelectItem>
                      <SelectItem value="cars">Cars</SelectItem>
                      <SelectItem value="heavy_goods_vehicle">Heavy Goods Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allocated">Allocated</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="spare">Spare</SelectItem>
                      <SelectItem value="awaiting_delivery">Awaiting Delivery</SelectItem>
                      <SelectItem value="written_off">Written Off</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="loaned">Loaned</SelectItem>
                      <SelectItem value="spare_not_available">Spare Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ULEZ Compliant */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">ULEZ Compliant</Label>
                  <Select value={formData.ulez_compliant} onValueChange={(value) => handleSelectChange('ulez_compliant', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Trade Group */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Trade Group</Label>
                  <Select value={formData.trade_group} onValueChange={(value) => handleSelectChange('trade_group', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select trade group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="leak_detection">Leak Detection</SelectItem>
                      <SelectItem value="multi">Multi</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="drainage">Drainage</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="roofing">Roofing</SelectItem>
                      <SelectItem value="ventilation">Ventilation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transmission */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Transmission</Label>
                  <Select value={formData.transmission} onValueChange={(value) => handleSelectChange('transmission', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Type */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Department Type</Label>
                  <Select value={formData.department_type} onValueChange={(value) => handleSelectChange('department_type', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="key_account">Key Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Registration Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Registration Date</Label>
                  <Input
                    name="registration_date"
                    type="date"
                    value={formData.registration_date}
                    onChange={handleInputChange}
                    className="border-gray-300"
                  />
                </div>

                {/* Make & Model */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Make & Model</Label>
                  <Input
                    name="make_model"
                    placeholder="e.g., Ford Transit"
                    value={formData.make_model}
                    onChange={handleInputChange}
                    className="border-gray-300"
                  />
                </div>

                {/* Vehicle Ownership */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Vehicle Ownership</Label>
                  <Select value={formData.vehicle_ownership} onValueChange={(value) => handleSelectChange('vehicle_ownership', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select ownership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aspect_owned">Aspect Owned</SelectItem>
                      <SelectItem value="leased">Leased</SelectItem>
                      <SelectItem value="via_hsbc">Via HSBC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Garage Repairs */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Garage Repairs</Label>
                  <Select value={formData.garage_repairs} onValueChange={(value) => handleSelectChange('garage_repairs', value)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to_be_collected_by_fleet">To be Collected by Fleet</SelectItem>
                      <SelectItem value="to_be_collected_by_engineer">To be Collected by Engineer</SelectItem>
                      <SelectItem value="awaiting_quote">Awaiting Quote</SelectItem>
                      <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Internal Notes - Full Width */}
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Internal Notes</Label>
                  <Textarea
                    name="internal_notes"
                    placeholder="Enter any additional notes..."
                    value={formData.internal_notes}
                    onChange={handleInputChange}
                    className="border-gray-300"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={uploading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Clear
            </Button>
            <Button
              onClick={() => handleSaveAsset(false)}
              disabled={uploading}
              className="bg-blue-700 text-white hover:bg-blue-800"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <UploadIcon size={16} className="mr-2" />
                  Save Vehicle
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}