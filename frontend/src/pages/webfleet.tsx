import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, AlertCircle, CheckCircle, Users, Award } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';

interface Engineer {
  rank: number;
  name: string;
  email: string;
  van_number: string;
  trade_group: string;
  score: number;
  score_class: string;
}

interface Statistics {
  total_drivers: number;
  drivers_with_scores: number;
  average_score: number;
  highest_score: number;
  excellent: number;
  good: number;
  fair: number;
  needs_improvement: number;
  poor: number;
}

const Webfleet: React.FC = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEngineers();
  }, []);

  const isValidName = (name: string): boolean => {
    if (!name || name.length < 2) return false;
    
    const obviousGarbage = [
      'File "', 'Traceback', 'apply_stylesheet', 'self.archive',
      'from_tree', 'super()', 'cls(**attrib)', '_convert(',
      'expected_type', 'seq = self.container', 'raise TypeError',
      'openpyxl.', '.py", line', '~~~~~~~~^^^', '~~~~~~~~~~~~~~~~^',
      '^^^^^^^^^^', '~~~~~~~~~~~~~~~~~~~~'
    ];
    
    for (const pattern of obviousGarbage) {
      if (name.includes(pattern)) return false;
    }
    
    if (!/[a-zA-Z]/.test(name)) return false;
    
    return true;
  };

  const fetchEngineers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(API_ENDPOINTS.DRIVERS_EXCEL);
      
      const cleanDrivers = response.data.drivers
        .filter((driver: any) => isValidName(driver.name))
        .map((driver: any) => ({
          rank: driver.rank,
          name: driver.name,
          email: driver.email || 'N/A',
          van_number: driver.van_number || 'N/A',
          trade_group: driver.trade_group || 'N/A',
          score: driver.score || 0,
          score_class: driver.score_class || 'poor'
        }));
      
      setEngineers(cleanDrivers);
      setStats(response.data.statistics);
      
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      setError('Failed to load driver data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadgeColor = (scoreClass: string) => {
    return '#F1FF24';
  };

  const getScoreIcon = (score: number) => {
    return <Trophy className="w-8 h-8" style={{ color: '#F1FF24' }} />;
  };

  const getRowColor = (scoreClass: string) => {
    return 'transparent';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-7 h-7" style={{ color: '#F1FF24' }} />;
    if (rank === 2) return <Award className="w-7 h-7" style={{ color: '#CDD1DA' }} />;
    if (rank === 3) return <Trophy className="w-7 h-7" style={{ color: '#F1FF24' }} />;
    return <span className="font-bold text-lg" style={{ color: '#646F86' }}>#{rank}</span>;
  };

  return (
    <div className="space-y-8 p-6" style={{ backgroundColor: '#F3F4F6', minHeight: '100vh' }}>
      {/* Top Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Engineers */}
          <Card className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(39, 84, 157, 0.15)', borderWidth: '2px', borderColor: 'rgba(39, 84, 157, 0.3)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: '#27549D' }}>TOTAL ENGINEERS</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#27549D' }}>{stats.total_drivers}</p>
              </div>
              <Users className="w-12 h-12" style={{ color: 'rgba(39, 84, 157, 0.4)' }} />
            </div>
          </Card>
          
          {/* Average Score */}
          <Card className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(241, 255, 36, 0.25)', borderWidth: '2px', borderColor: 'rgba(241, 255, 36, 0.5)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: '#27549D' }}>AVERAGE SCORE</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#27549D' }}>{stats.average_score.toFixed(1)}</p>
                <p className="text-sm font-medium" style={{ color: '#646F86' }}>out of 10</p>
              </div>
              <TrendingUp className="w-12 h-12" style={{ color: 'rgba(39, 84, 157, 0.4)' }} />
            </div>
          </Card>

          {/* Top Score */}
          <Card className="p-6 rounded-2xl" style={{ backgroundColor: '#F1FF24', borderWidth: '2px', borderColor: '#F1FF24' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: '#27549D' }}>TOP SCORE</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#27549D' }}>{stats.highest_score}</p>
                <p className="text-sm font-medium flex items-center gap-1" style={{ color: '#27549D' }}>
                  ⭐ Excellence
                </p>
              </div>
              <Trophy className="w-12 h-12" style={{ color: 'rgba(39, 84, 157, 0.4)' }} />
            </div>
          </Card>

          {/* Excellent */}
          <Card className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(241, 255, 36, 0.2)', borderWidth: '2px', borderColor: 'rgba(241, 255, 36, 0.4)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: '#27549D' }}>EXCELLENT</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#27549D' }}>{stats.excellent}</p>
                <p className="text-sm font-medium" style={{ color: '#646F86' }}>9.0+ score</p>
              </div>
              <CheckCircle className="w-12 h-12" style={{ color: 'rgba(241, 255, 36, 0.6)' }} />
            </div>
          </Card>

          {/* Good */}
          <Card className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(39, 84, 157, 0.1)', borderWidth: '2px', borderColor: 'rgba(39, 84, 157, 0.25)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: '#27549D' }}>GOOD</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#27549D' }}>{stats.good}</p>
                <p className="text-sm font-medium" style={{ color: '#646F86' }}>8.0-8.9</p>
              </div>
              <CheckCircle className="w-12 h-12" style={{ color: 'rgba(39, 84, 157, 0.4)' }} />
            </div>
          </Card>

          {/* Needs Focus (spans remaining space) */}
          <Card className="p-6 rounded-2xl md:col-span-5" style={{ backgroundColor: 'rgba(241, 255, 36, 0.15)', borderWidth: '2px', borderColor: 'rgba(241, 255, 36, 0.3)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: '#27549D' }}>NEEDS FOCUS</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#27549D' }}>{stats.needs_improvement + stats.poor}</p>
                <p className="text-sm font-medium" style={{ color: '#646F86' }}>Below 7.0</p>
              </div>
              <AlertCircle className="w-12 h-12" style={{ color: 'rgba(39, 84, 157, 0.4)' }} />
            </div>
          </Card>
        </div>
      )}

      {/* Main Performance Table */}
      <Card className="overflow-hidden shadow-2xl rounded-2xl" style={{ backgroundColor: 'white', borderWidth: '2px', borderColor: 'rgba(39, 84, 157, 0.2)' }}>
        <div className="px-8 py-6" style={{ backgroundColor: 'white', borderBottomWidth: '2px', borderColor: '#E8EAEE' }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#27549D' }}>Engineer Performance Ranking</h2>
          <p className="text-sm" style={{ color: '#646F86' }}>Sorted by driving score - Top performers first</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F7F9FD', borderBottomWidth: '2px', borderColor: '#DEE8F7' }}>
                <th className="px-8 py-5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#27549D' }}>RANK</th>
                <th className="px-8 py-5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#27549D' }}>ENGINEER NAME</th>
                <th className="px-8 py-5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#27549D' }}>VAN</th>
                <th className="px-8 py-5 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#27549D' }}>PERFORMANCE</th>
                <th className="px-8 py-5 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#27549D' }}>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 mb-4" style={{ borderColor: '#27549D' }}></div>
                      <p className="font-semibold text-lg" style={{ color: '#646F86' }}>Loading performance data...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <AlertCircle className="w-20 h-20 mx-auto mb-4" style={{ color: '#27549D' }} />
                    <p className="font-bold text-lg" style={{ color: '#27549D' }}>{error}</p>
                  </td>
                </tr>
              ) : engineers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-lg" style={{ color: '#646F86' }}>
                    No engineers found
                  </td>
                </tr>
              ) : (
                engineers.map((engineer) => (
                  <tr 
                    key={engineer.rank} 
                    className="transition-all duration-200 hover:bg-opacity-50"
                    style={{ 
                      backgroundColor: engineer.rank <= 3 ? 'rgba(241, 255, 36, 0.08)' : 'white',
                      borderBottomWidth: '1px',
                      borderColor: '#F3F4F6'
                    }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {getRankBadge(engineer.rank)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-lg mb-1" style={{ color: '#1A1D23' }}>{engineer.name}</p>
                      {engineer.rank <= 3 && (
                        <p className="text-xs flex items-center gap-1" style={{ color: '#646F86' }}>
                          ⭐ Top Performer
                        </p>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <Badge 
                        variant="outline" 
                        className="font-mono font-semibold px-3 py-1 text-sm rounded-full"
                        style={{ borderWidth: '2px', borderColor: '#27549D', color: '#27549D', backgroundColor: 'white' }}
                      >
                        {engineer.van_number}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <Badge 
                          className="px-6 py-2 font-bold text-xs uppercase tracking-wide rounded-full"
                          style={{ 
                            backgroundColor: engineer.score_class === 'excellent' ? '#F1FF24' : 
                                           engineer.score_class === 'needs_improvement' ? '#FFA500' : '#FF6B6B',
                            color: '#27549D',
                            borderWidth: '0'
                          }}
                        >
                          {engineer.score_class === 'excellent' ? 'EXCELLENT' :
                           engineer.score_class === 'needs_improvement' ? 'NEEDS IMPROVEMENT' :
                           'POOR'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-3">
                        {getScoreIcon(engineer.score)}
                        <div className="text-center">
                          <p className="font-bold text-3xl" style={{ color: '#1A1D23' }}>{engineer.score.toFixed(1)}</p>
                          <p className="text-xs font-semibold" style={{ color: '#848EA3' }}>/ 10</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Webfleet;