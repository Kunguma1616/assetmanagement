import React from 'react';
import { Target } from 'lucide-react';

interface PageHeaderActionsProps {
  onStartGuide: () => void;
}

const guideButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '56px',
  height: '56px',
  minWidth: '56px',
  padding: '0',
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#FFFFFF',
  borderRadius: '999px',
  border: '2px solid rgba(255, 255, 255, 0.45)',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 700,
  fontFamily: 'Mont, sans-serif',
  letterSpacing: '-0.01em',
  lineHeight: 1,
  transition: 'all 0.2s ease',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  backdropFilter: 'blur(8px)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

export default function PageHeaderActions({
  onStartGuide,
}: PageHeaderActionsProps) {
  return (
    <button
      onClick={onStartGuide}
      title="Start Guide"
      aria-label="Start Guide"
      style={guideButtonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
      }}
    >
      <Target style={{ width: 20, height: 20 }} />
    </button>
  );
}
