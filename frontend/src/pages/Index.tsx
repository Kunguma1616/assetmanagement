import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LayoutDashboard,
  Upload as UploadIcon,
  Image as ImageIcon,
  Zap,
  Gauge,
  TrendingUp,
  Wrench
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Fleet Health Monitor
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Manage your vehicle fleet with real-time insights, driver performance tracking, and comprehensive asset management.
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Dashboard Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-white" onClick={() => navigate('/fleet-dashboard')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <LayoutDashboard className="w-8 h-8 text-blue-600" />
                <CardTitle>Fleet Dashboard</CardTitle>
              </div>
              <CardDescription>View overall fleet status and KPIs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Open Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Upload Vehicle Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 bg-white" onClick={() => navigate('/upload')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <UploadIcon className="w-8 h-8 text-green-600" />
                <CardTitle>Upload Vehicle</CardTitle>
              </div>
              <CardDescription>Add new vehicle with image and details</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Start Upload
              </Button>
            </CardContent>
          </Card>

          {/* Asset Portfolio Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-purple-200 bg-white" onClick={() => navigate('/assets')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <ImageIcon className="w-8 h-8 text-purple-600" />
                <CardTitle>Asset Portfolio</CardTitle>
              </div>
              <CardDescription>Browse all uploaded vehicle assets</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                View Portfolio
              </Button>
            </CardContent>
          </Card>

          {/* Driving Performance Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200 bg-white" onClick={() => navigate('/webfleet')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-8 h-8 text-orange-600" />
                <CardTitle>Driving Performance</CardTitle>
              </div>
              <CardDescription>View engineer driving scores and OptiDrive metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                View Scores
              </Button>
            </CardContent>
          </Card>

          {/* Maintenance Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-yellow-200 bg-white" onClick={() => navigate('/maintenance')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Wrench className="w-8 h-8 text-yellow-600" />
                <CardTitle>Maintenance</CardTitle>
              </div>
              <CardDescription>View upcoming maintenance tasks and schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                View Maintenance
              </Button>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card className="hover:shadow-lg transition-shadow border-cyan-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-cyan-600" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>Coming soon - Fleet analytics and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gray-300 hover:bg-gray-400 cursor-not-allowed" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Health Check Card */}
          <Card className="hover:shadow-lg transition-shadow border-red-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Gauge className="w-8 h-8 text-red-600" />
                <CardTitle>Health Check</CardTitle>
              </div>
              <CardDescription>Coming soon - Vehicle health diagnostics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gray-300 hover:bg-gray-400 cursor-not-allowed" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20 mt-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Real-time Fleet Tracking</h3>
                <p className="mt-2 text-gray-600">Monitor vehicle status, assignments, and maintenance schedules in real-time.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Easy Vehicle Upload</h3>
                <p className="mt-2 text-gray-600">Upload vehicle images and auto-fill all details from Salesforce with one click.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-600 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Asset Portfolio Management</h3>
                <p className="mt-2 text-gray-600">Browse and organize all uploaded vehicle assets with search and filtering.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-600 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Driver Performance Analytics</h3>
                <p className="mt-2 text-gray-600">Track driving scores, OptiDrive metrics, and engineer performance rankings.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-cyan-600 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">AI-Powered Analysis</h3>
                <p className="mt-2 text-gray-600">Get intelligent insights on vehicle condition and maintenance needs.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-600 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Salesforce Integration</h3>
                <p className="mt-2 text-gray-600">Seamless sync with Salesforce for complete vehicle and driver data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-400">Fleet Health Monitor v1.0 | Real-time fleet management and analytics</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
