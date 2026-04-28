import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, Trophy, Upload, BarChart3, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_ENDPOINTS } from '@/config/api';

const colors = {
  primary: { default: '#27549D', light: '#7099DB', darker: '#17325E', subtle: '#F7F9FD' },
  brand: { yellow: '#F1FF24' },
  support: { green: '#2EB844', orange: '#F29630', red: '#D15134' },
  grayscale: { title: '#1A1D23', body: '#323843', subtle: '#646F86', caption: '#848EA3', negative: '#F3F4F6', border: '#CDD1DA' },
};

interface DashboardStats {
  total: number;
  allocated: number;
  garage: number;
  due_service: number;
  spare_ready: number;
  reserved: number;
  written_off: number;
}

interface MetricCard {
  label: string;
  key: keyof DashboardStats;
  status?: string;
  color: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    fetchVehicleSummary();
    const userData = sessionStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserName(user.name || 'User');
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const fetchVehicleSummary = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLE_SUMMARY);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch vehicle summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user_session');
    sessionStorage.removeItem('user_data');
    navigate('/login');
  };

  const metrics: MetricCard[] = [
    { label: 'Total Vehicles', key: 'total', color: colors.primary.default },
    { label: 'Allocated', key: 'allocated', status: 'Allocated', color: colors.support.green },
    { label: 'In Garage', key: 'garage', status: 'Garage', color: colors.support.orange },
    { label: 'Due for Service', key: 'due_service', status: 'Due_Service', color: colors.support.red },
    { label: 'Spare Ready', key: 'spare_ready', status: 'Spare_Ready', color: colors.primary.light },
    { label: 'Reserved', key: 'reserved', status: 'Reserved', color: colors.brand.yellow },
    { label: 'Written Off', key: 'written_off', status: 'Written_Off', color: colors.grayscale.caption },
  ];

  const navigationButtons = [
    {
      icon: MessageCircle,
      label: 'Chat with AI',
      description: 'Ask questions about your fleet',
      onClick: () => navigate('/chatbot'),
    },
    {
      icon: Trophy,
      label: 'Driving Scores',
      description: 'Engineer performance metrics',
      onClick: () => navigate('/webfleet'),
    },
    {
      icon: Upload,
      label: 'Upload Vehicles',
      description: 'Add or update vehicle data',
      onClick: () => navigate('/upload'),
    },
    {
      icon: BarChart3,
      label: 'Assets Gallery',
      description: 'View all fleet vehicles',
      onClick: () => navigate('/assets'),
    },
  ];

  const handleCardClick = (metric: MetricCard) => {
    if (metric.status) {
      navigate(`/assets?status=${encodeURIComponent(metric.status)}`);
    }
  };

  return (
    <div style={{ padding: '24px', background: colors.grayscale.negative, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: colors.grayscale.title, margin: 0, fontFamily: 'MontBold' }}>
            Fleet Dashboard
          </h1>
          <p style={{ color: colors.grayscale.subtle, marginTop: '8px', fontFamily: 'MontRegular' }}>
            Welcome, {userName}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: colors.support.red,
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'MontSemiBold',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A83C2B'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.support.red}
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      {/* Quick Access Buttons */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: colors.grayscale.title, fontFamily: 'MontBold' }}>
          ⚡ Quick Access
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {navigationButtons.map((button, index) => {
            const Icon = button.icon;
            return (
              <button
                key={index}
                onClick={button.onClick}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'left',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: colors.primary.default,
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <Icon size={24} color="white" />
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: 0, fontFamily: 'MontBold' }}>
                    {button.label}
                  </h3>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: 0, fontFamily: 'MontRegular' }}>
                  {button.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle Statistics */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: colors.grayscale.title, fontFamily: 'MontBold' }}>
          📊 Fleet Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          {metrics.map((metric) => (
            <div
              key={metric.key}
              onClick={() => handleCardClick(metric)}
              style={{ cursor: metric.status ? 'pointer' : 'default', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => {
                if (metric.status) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Card style={{ height: '100%', backgroundColor: 'white', border: `1px solid ${colors.grayscale.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <CardHeader style={{ paddingBottom: '12px' }}>
                  <CardTitle style={{ fontSize: '13px', fontWeight: '500', color: colors.grayscale.subtle, fontFamily: 'MontRegular' }}>
                    {metric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{
                      backgroundColor: metric.color,
                      color: 'white',
                      borderRadius: '50%',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.grayscale.title, fontFamily: 'MontBold' }}>
                        {stats?.[metric.key] ?? (loading ? '...' : 0)}
                      </div>
                      {metric.status && (
                        <p style={{ fontSize: '12px', color: colors.grayscale.caption, marginTop: '4px', fontFamily: 'MontRegular' }}>
                          Click to view
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
