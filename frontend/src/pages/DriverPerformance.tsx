import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, AlertCircle, User, Calendar, Award } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

interface DriverMetrics {
  driver_name: string;
  total_trips: number;
  avg_rating: number;
  safety_score: number;
  fuel_efficiency: number;
  on_time_percentage: number;
  violations: number;
  miles_driven: number;
}

const colors = {
  primary: {
    light: "#7099DB",
    default: "#27549D",
    darker: "#17325E",
    subtle: "#F7F9FD",
  },
  error: {
    light: "#E49786",
    default: "#D15134",
    darker: "#812F1D",
    subtle: "#FAEDEA",
  },
  warning: {
    light: "#F7C182",
    default: "#F29630",
    darker: "#A35C0A",
    subtle: "#FEF5EC",
  },
  grayscale: {
    title: "#1A1D23",
    body: "#323843",
    caption: "#848EA3",
    border: "#CDD1DA",
  },
};

const DriverPerformance = () => {
  const [drivers, setDrivers] = useState<DriverMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      const base = API_BASE_URL || '';
      const response = await fetch(`${base}/api/drivers/performance`);
      
      if (!response.ok) {
        throw new Error('Failed to load driver performance data');
      }

      const data = await response.json();
      setDrivers(Array.isArray(data) ? data : [data]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching driver data:', err);
      setError(err.message || 'Failed to load driver data');
      // Set sample data for demo
      setDrivers([
        {
          driver_name: "John Smith",
          total_trips: 487,
          avg_rating: 4.8,
          safety_score: 95,
          fuel_efficiency: 8.2,
          on_time_percentage: 98,
          violations: 1,
          miles_driven: 12450,
        },
        {
          driver_name: "Sarah Johnson",
          total_trips: 512,
          avg_rating: 4.7,
          safety_score: 92,
          fuel_efficiency: 7.9,
          on_time_percentage: 96,
          violations: 3,
          miles_driven: 13220,
        },
        {
          driver_name: "Michael Brown",
          total_trips: 445,
          avg_rating: 4.5,
          safety_score: 88,
          fuel_efficiency: 7.5,
          on_time_percentage: 94,
          violations: 5,
          miles_driven: 11890,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return colors.primary.default;
    if (rating >= 3.5) return colors.warning.default;
    return colors.error.default;
  };

  const getSafetyColor = (score: number) => {
    if (score >= 90) return colors.primary.default;
    if (score >= 75) return colors.warning.default;
    return colors.error.default;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.primary.subtle, padding: '32px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${colors.primary.default} 0%, ${colors.primary.darker} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: colors.grayscale.title, margin: 0 }}>Driver Performance</h1>
              <p style={{ fontSize: '16px', color: colors.grayscale.body, margin: '4px 0 0 0' }}>Monitor driver metrics and safety scores</p>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', backgroundColor: colors.warning.subtle, border: `1px solid ${colors.warning.default}` }}>
            <p style={{ color: colors.warning.darker, margin: 0, fontSize: '14px' }}>Note: Showing sample data. {error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: `4px solid ${colors.grayscale.border}`, borderTop: `4px solid ${colors.primary.default}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {drivers.map((driver, idx) => (
              <div key={idx} style={{ borderRadius: '16px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', padding: '24px', backgroundColor: '#FFFFFF', border: `1px solid ${colors.grayscale.border}` }}>
                {/* Driver Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.grayscale.border}` }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary.light} 0%, ${colors.primary.default} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {driver.driver_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.grayscale.title, margin: 0 }}>{driver.driver_name}</h3>
                    <p style={{ fontSize: '13px', color: colors.grayscale.caption, margin: '2px 0 0 0' }}>ID: DRV{String(idx + 1).padStart(3, '0')}</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  {/* Rating */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: colors.grayscale.body }}>Customer Rating</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: getRatingColor(driver.avg_rating) }}>⭐ {driver.avg_rating.toFixed(1)}</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: colors.grayscale.border, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg, ${colors.primary.default}, ${colors.primary.light})`, width: `${(driver.avg_rating / 5) * 100}%` }} />
                    </div>
                  </div>

                  {/* Safety Score */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: colors.grayscale.body }}>Safety Score</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: getSafetyColor(driver.safety_score) }}>{driver.safety_score}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: colors.grayscale.border, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg, ${getSafetyColor(driver.safety_score)}, ${colors.primary.light})`, width: `${driver.safety_score}%` }} />
                    </div>
                  </div>

                  {/* On-Time Percentage */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: colors.grayscale.body }}>On-Time Delivery</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: colors.primary.default }}>{driver.on_time_percentage}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: colors.grayscale.border, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg, ${colors.primary.default}, ${colors.primary.light})`, width: `${driver.on_time_percentage}%` }} />
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', borderTop: `1px solid ${colors.grayscale.border}`, paddingTop: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: colors.grayscale.caption, margin: 0 }}>Trips</p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: colors.primary.default, margin: '4px 0 0 0' }}>{driver.total_trips}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: colors.grayscale.caption, margin: 0 }}>Miles</p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: colors.primary.default, margin: '4px 0 0 0' }}>{(driver.miles_driven / 1000).toFixed(1)}k</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: colors.grayscale.caption, margin: 0 }}>Fuel Eff.</p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: colors.primary.default, margin: '4px 0 0 0' }}>{driver.fuel_efficiency.toFixed(1)} MPG</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: '12px', color: colors.grayscale.caption, margin: 0 }}>Violations</p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: driver.violations > 0 ? colors.error.default : colors.primary.default, margin: '4px 0 0 0' }}>{driver.violations}</p>
                  </div>
                </div>

                {/* Status Badge */}
                {driver.violations === 0 && (
                  <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#E6F5E6', border: `1px solid ${colors.primary.default}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award style={{ width: '16px', height: '16px', color: colors.primary.default }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: colors.primary.default }}>Excellent Safety Record</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DriverPerformance;
