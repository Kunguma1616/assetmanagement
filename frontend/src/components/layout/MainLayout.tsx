import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Upload,
  FolderKanban,
  UserCheck,
  PoundSterling,
  MessageCircle,
  ClipboardCheck
} from 'lucide-react';

const colors = {
  primary: {
    default: '#27549D',
    light: '#7099DB',
    darker: '#17325E',
    subtle: '#F7F9FD',
  },
  brand: {
    yellow: '#F1FF24',
  },
  support: {
    green: '#2EB844',
    red: '#D15134',
  },
  grayscale: {
    title: '#1A1D23',
    body: '#323843',
    subtle: '#646F86',
    caption: '#848EA3',
    negative: '#F3F4F6',
    border: '#CDD1DA',
  },
};

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
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

  const handleLogout = () => {
    sessionStorage.removeItem('user_session');
    sessionStorage.removeItem('user_data');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Fleet Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload New Vehicle', icon: Upload },
    { path: '/assets', label: 'Fleet Portfolio', icon: FolderKanban },
    { path: '/webfleet', label: 'Driver Performance Analysis', icon: UserCheck },
    { path: '/vehicle-cost', label: 'Vehicle Cost', icon: PoundSterling },
    { path: '/vehicle-condition', label: 'Vehicle Condition', icon: ClipboardCheck },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.grayscale.negative }}>
      {/* Sidebar */}
      <div
        style={{
          width: isSidebarOpen ? '256px' : '0px',
          backgroundColor: 'white',
          borderRight: `1px solid ${colors.grayscale.border}`,
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${colors.grayscale.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/aspectlogo.jpg"
              alt="Aspect Logo"
              className="h-10 w-auto object-contain"
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: colors.primary.default, fontWeight: 'bold', fontSize: '18px', fontFamily: 'MontBold' }}>
                Aspect Fleet AI
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive(item.path) ? colors.brand.yellow : 'transparent',
                  color: isActive(item.path) ? colors.primary.default : colors.grayscale.subtle,
                  fontWeight: isActive(item.path) ? '600' : 'normal',
                  fontFamily: isActive(item.path) ? 'MontSemiBold' : 'MontRegular',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = colors.primary.subtle;
                    e.currentTarget.style.color = colors.primary.default;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = colors.grayscale.subtle;
                  }
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: '14px' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div style={{ padding: '16px', borderTop: `1px solid ${colors.grayscale.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: colors.primary.subtle,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: colors.primary.default, fontSize: '14px', fontWeight: 'bold', fontFamily: 'MontBold' }}>
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ color: colors.grayscale.title, fontSize: '14px', fontWeight: 'bold', margin: '0', fontFamily: 'MontBold' }}>{userName}</p>
              <p style={{ color: colors.grayscale.caption, fontSize: '12px', margin: '0', fontFamily: 'MontRegular' }}>Authenticated</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 16px',
              color: colors.support.red,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'MontRegular',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FAEDEA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${colors.grayscale.border}`,
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.grayscale.negative;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isSidebarOpen ? (
                  <X size={20} color={colors.grayscale.subtle} />
                ) : (
                  <Menu size={20} color={colors.grayscale.subtle} />
                )}
              </button>
              <h1 style={{ color: colors.grayscale.title, fontSize: '20px', fontWeight: 'bold', fontFamily: 'MontBold', margin: '0' }}>
                Fleet Health Monitor
              </h1>
            </div>
            <button
              onClick={() => navigate('/chatbot')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: colors.primary.default,
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'MontBold',
                fontSize: '14px',
                fontWeight: '700',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary.darker;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary.default;
              }}
            >
              <MessageCircle size={18} />
              <span>AI Chat</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}