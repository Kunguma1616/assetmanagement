import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Trophy, TrendingUp, AlertCircle, CheckCircle2,
  Users, Award, RefreshCw, Star, Medal, Target, Zap,
} from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';

// ── Brand palette (exact colors.ts) ──────────────────────────────────────────
const C = {
  blue:          '#27549D',
  blueLight:     '#7099DB',
  blueDark:      '#17325E',
  blueSubtle:    '#F7F9FD',
  blueBorder:    '#DEE8F7',
  yellow:        '#F1FF24',
  yellowDark:    '#C8D400',
  green:         '#2EB844',
  greenSubtle:   '#ECFDF5',
  greenBorder:   '#BBF7D0',
  orange:        '#F29630',
  orangeSubtle:  '#FEF5EC',
  orangeBorder:  '#FCE9D4',
  red:           '#D15134',
  redSubtle:     '#FAEDEA',
  redBorder:     '#F6DBD5',
  gray:          '#848EA3',
  graySubtle:    '#646F86',
  body:          '#323843',
  title:         '#1A1D23',
  border:        '#CDD1DA',
  borderDisabled:'#E8EAEE',
  borderSubtle:  '#F3F4F6',
  bg:            '#F3F4F6',
  white:         '#FFFFFF',
};

const FONT = "'Mont', sans-serif";

// ── Inject Mont fonts once ────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('mont-wf-v2')) {
  const s = document.createElement('style');
  s.id = 'mont-wf-v2';
  s.textContent = `
    @font-face{font-family:'Mont';src:url('/fonts/MontBlack/MontBlack.otf') format('opentype');font-weight:950;font-style:normal;}
    @font-face{font-family:'Mont';src:url('/fonts/MontHeavy/MontHeavy.otf') format('opentype');font-weight:900;font-style:normal;}
    @font-face{font-family:'Mont';src:url('/fonts/MontHeavyItalic/MontHeavyItalic.otf') format('opentype');font-weight:900;font-style:italic;}
    @font-face{font-family:'Mont';src:url('/fonts/MontBold/MontBold.otf') format('opentype');font-weight:700;font-style:normal;}
    @font-face{font-family:'Mont';src:url('/fonts/MontBoldItalic/MontBoldItalic.otf') format('opentype');font-weight:700;font-style:italic;}
    @font-face{font-family:'Mont';src:url('/fonts/MontSemiBold/MontSemiBold.otf') format('opentype');font-weight:600;font-style:normal;}
    @font-face{font-family:'Mont';src:url('/fonts/MontRegular/MontRegular.otf') format('opentype');font-weight:400;font-style:normal;}
    @font-face{font-family:'Mont';src:url('/fonts/MontLight/MontLight.otf') format('opentype');font-weight:300;font-style:normal;}
    @font-face{font-family:'Mont';src:url('/fonts/MontThin/MontThin.otf') format('opentype');font-weight:100;font-style:normal;}

    /* Force Mont everywhere — overrides Tailwind */
    *, body, html { font-family: 'Mont', sans-serif !important; }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: ${C.borderSubtle}; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

    /* Hover states */
    .wf-kpi { transition: transform 0.18s ease, box-shadow 0.18s ease; }
    .wf-kpi:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(39,84,157,0.16) !important; }
    .wf-row { transition: background 0.12s; }
    .wf-row:hover td { background: ${C.blueSubtle} !important; }
    .wf-btn:hover { background: rgba(255,255,255,0.22) !important; }
  `;
  document.head.appendChild(s);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Engineer {
  rank: number; name: string; email: string;
  van_number: string; trade_group: string;
  score: number; score_class: string;
}
interface Statistics {
  total_drivers: number; drivers_with_scores: number;
  average_score: number; highest_score: number;
  excellent: number; good: number; fair: number;
  needs_improvement: number; poor: number;
}

// ── Aspect Logo ───────────────────────────────────────────────────────────────
function AspectLogo({ size = 48 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      <path d="M8 10C8 4 12 0 18 0H68L100 50L68 100H18C12 100 8 96 8 90Z" fill={C.blue} />
      <rect x="16" y="14" width="18" height="14" rx="2" fill={C.yellow} />
      <rect x="16" y="34" width="18" height="14" rx="2" fill={C.yellow} />
      <rect x="16" y="54" width="18" height="14" rx="2" fill={C.yellow} />
      <rect x="16" y="74" width="18" height="14" rx="2" fill={C.yellow} />
      <rect x="40" y="14" width="12" height="14" rx="2" fill={C.yellow} />
      <rect x="40" y="34" width="12" height="14" rx="2" fill={C.yellow} />
      <rect x="40" y="54" width="30" height="14" rx="2" fill={C.yellow} />
      <rect x="40" y="74" width="30" height="14" rx="2" fill={C.yellow} />
      <rect x="58" y="14" width="24" height="28" rx="2" fill={C.yellow} />
    </svg>
  );
  return (
    <img
      src="/aspect-logo-icon.svg" alt="Aspect"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, display: 'block', objectFit: 'contain' }}
    />
  );
}

// ── Score config ──────────────────────────────────────────────────────────────
type ScoreClass = 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'poor';

const SCORE_CFG: Record<ScoreClass, { bg: string; text: string; border: string; label: string; bar: string }> = {
  excellent:         { bg: C.yellow,       text: C.blueDark, border: C.yellowDark,   label: 'Excellent',         bar: C.yellowDark   },
  good:              { bg: C.greenSubtle,  text: C.green,    border: C.greenBorder,  label: 'Good',              bar: C.green        },
  fair:              { bg: C.orangeSubtle, text: C.orange,   border: C.orangeBorder, label: 'Fair',              bar: C.orange       },
  needs_improvement: { bg: C.orangeSubtle, text: '#A35C0A',  border: C.orangeBorder, label: 'Needs Improvement', bar: C.orange       },
  poor:              { bg: C.redSubtle,    text: C.red,      border: C.redBorder,    label: 'Poor',              bar: C.red          },
};

function cfg(sc: string) {
  return SCORE_CFG[sc as ScoreClass] ?? { bg: C.borderSubtle, text: C.gray, border: C.border, label: sc, bar: C.gray };
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ width: 64, height: 4, background: C.borderSubtle, borderRadius: 4, overflow: 'hidden', marginTop: 5 }}>
      <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: color, borderRadius: 4 }} />
    </div>
  );
}

// ── Rank display ──────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700 0%, #F1FF24 100%)', boxShadow: '0 3px 12px rgba(241,255,36,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Trophy style={{ width: 18, height: 18, color: C.blueDark }} />
    </div>
  );
  if (rank === 2) return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #B8C0CC 0%, #E8EAEE 100%)', boxShadow: '0 3px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Medal style={{ width: 18, height: 18, color: '#5A6272' }} />
    </div>
  );
  if (rank === 3) return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #CD7F32 0%, #F29630 100%)', boxShadow: '0 3px 12px rgba(242,150,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Award style={{ width: 18, height: 18, color: C.white }} />
    </div>
  );
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.borderSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.graySubtle, fontFamily: FONT }}>{rank}</span>
    </div>
  );
}

// ── KPI card — opaque white with coloured left accent ─────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accentColor, iconBg,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; accentColor: string; iconBg: string;
}) {
  return (
    <div className="wf-kpi" style={{
      background: C.white,                        // ← solid white, never transparent
      borderRadius: 16,
      border: `1px solid ${C.borderSubtle}`,
      boxShadow: '0 2px 10px rgba(39,84,157,0.07)',
      padding: '20px 20px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Coloured left-edge accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accentColor, borderRadius: '16px 0 0 16px' }} />

      {/* Icon */}
      <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon style={{ width: 18, height: 18, color: accentColor }} />
      </div>

      {/* Label */}
      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.gray, margin: '0 0 5px', fontFamily: FONT }}>
        {label}
      </p>

      {/* Value */}
      <p style={{ fontSize: 34, fontWeight: 900, color: C.title, margin: '0 0 2px', lineHeight: 1, fontFamily: FONT }}>
        {value}
      </p>

      {/* Sub */}
      {sub && <p style={{ fontSize: 11, color: C.gray, margin: 0, fontWeight: 500, fontFamily: FONT }}>{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const Webfleet: React.FC = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [stats,     setStats]     = useState<Statistics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => { fetchEngineers(); }, []);

  const isValidName = (name: string): boolean => {
    if (!name || name.length < 2) return false;
    const garbage = [
      'File "', 'Traceback', 'apply_stylesheet', 'self.archive', 'from_tree', 'super()',
      'cls(**attrib)', '_convert(', 'expected_type', 'seq = self.container', 'raise TypeError',
      'openpyxl.', '.py", line', '~~~~~~~~^^^', '~~~~~~~~~~~~~~~~^', '^^^^^^^^^^', '~~~~~~~~~~~~~~~~~~~~',
    ];
    for (const p of garbage) { if (name.includes(p)) return false; }
    return /[a-zA-Z]/.test(name);
  };

  const fetchEngineers = async () => {
    try {
      setLoading(true); setError(null);
      const response = await axios.get(API_ENDPOINTS.DRIVERS_EXCEL);
      const clean = response.data.drivers
        .filter((d: any) => isValidName(d.name))
        .map((d: any) => ({
          rank:        d.rank,
          name:        d.name,
          email:       d.email       || 'N/A',
          van_number:  d.van_number  || 'N/A',
          trade_group: d.trade_group || 'N/A',
          score:       d.score       || 0,
          score_class: d.score_class || 'poor',
        }));
      setEngineers(clean);
      setStats(response.data.statistics);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      setError('Failed to load driver data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: FONT }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${C.blueBorder}`, borderTopColor: C.blue, animation: 'spin 0.75s linear infinite' }} />
      <p style={{ color: C.gray, fontSize: 14, fontWeight: 700, fontFamily: FONT }}>Loading performance data…</p>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.white, borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: '0 8px 32px rgba(39,84,157,0.12)', maxWidth: 400 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.redSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle style={{ width: 26, height: 26, color: C.red }} />
        </div>
        <p style={{ fontWeight: 800, fontSize: 17, color: C.title, margin: '0 0 8px', fontFamily: FONT }}>Failed to load data</p>
        <p style={{ fontSize: 13, color: C.gray, margin: '0 0 24px', fontFamily: FONT }}>{error}</p>
        <button onClick={fetchEngineers} style={{
          background: C.blue, color: C.white, border: 'none', borderRadius: 10,
          padding: '11px 28px', fontWeight: 700, fontSize: 13, fontFamily: FONT,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Try Again
        </button>
      </div>
    </div>
  );

  // ── Avatar initials ───────────────────────────────────────────────────────
  const initials = (name: string) =>
    name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER — profile_header.jpg background + brand gradient overlay
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '30px 40px 100px' }}>
        {/* Photo */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('/profile_header.jpg')",
          backgroundSize: 'cover', backgroundPosition: 'center top',
          zIndex: 0,
        }} />
        {/* Brand overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: `linear-gradient(135deg, ${C.blueDark}F2 0%, ${C.blue}D8 55%, ${C.blueLight}B0 100%)`,
        }} />
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, right: 200, width: 200, height: 200, borderRadius: '50%', background: 'rgba(241,255,36,0.07)', zIndex: 1, pointerEvents: 'none' }} />

        {/* Header content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(255,255,255,0.13)',
              backdropFilter: 'blur(14px)',
              border: '1.5px solid rgba(255,255,255,0.24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'visible',
              boxShadow: '0 4px 18px rgba(0,0,0,0.14)',
            }}>
              <AspectLogo size={54} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONT }}>
                  Driver Performance
                </p>
                {/* Live pill */}
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.09em',
                  color: C.green, background: 'rgba(46,184,68,0.18)',
                  border: '1px solid rgba(46,184,68,0.35)',
                  borderRadius: 20, padding: '2px 9px', fontFamily: FONT,
                }}>
                  ● LIVE
                </span>
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: C.white, margin: '0 0 5px', letterSpacing: '-0.03em', fontFamily: FONT }}>
                Engineer Rankings
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', margin: 0, fontWeight: 500, fontFamily: FONT }}>
                {stats ? `${stats.total_drivers} engineers · Webfleet driving scores` : 'Webfleet driving scores'}
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <button onClick={fetchEngineers} className="wf-btn" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.13)', color: C.white,
            border: '1.5px solid rgba(255,255,255,0.24)', borderRadius: 12,
            padding: '11px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            fontFamily: FONT, backdropFilter: 'blur(10px)', transition: 'background 0.15s',
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 40px 48px' }}>

        {/* ── KPI CARDS — overlapping header, fully opaque white ─────────────
            marginTop: -72 pulls them up into the header zone.
            background: C.white ensures they're NEVER see-through.
        ──────────────────────────────────────────────────────────────────── */}
        {stats && (
          <div style={{ marginTop: -72, position: 'relative', zIndex: 20, marginBottom: 28 }}>

            {/* Row 1 — 5 equal columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
              <KpiCard
                label="Total Engineers"
                value={stats.total_drivers}
                sub={`${stats.drivers_with_scores} with scores`}
                icon={Users}
                accentColor={C.blue}
                iconBg={C.blueSubtle}
              />
              <KpiCard
                label="Average Score"
                value={stats.average_score.toFixed(1)}
                sub="out of 10"
                icon={TrendingUp}
                accentColor={C.blueLight}
                iconBg={C.blueSubtle}
              />
              <KpiCard
                label="Top Score"
                value={stats.highest_score}
                sub="⭐ Best result"
                icon={Trophy}
                accentColor={C.yellowDark}
                iconBg={`${C.yellow}44`}
              />
              <KpiCard
                label="Excellent"
                value={stats.excellent}
                sub="Score 9.0+"
                icon={Star}
                accentColor={C.green}
                iconBg={C.greenSubtle}
              />
              <KpiCard
                label="Good"
                value={stats.good}
                sub="Score 8.0–8.9"
                icon={CheckCircle2}
                accentColor={C.blueLight}
                iconBg={C.blueSubtle}
              />
            </div>

            {/* Row 2 — Needs Focus card (wide, split layout) */}
            <div style={{
              background: C.white,                          // ← always opaque
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: 16,
              padding: '20px 28px',
              boxShadow: '0 2px 10px rgba(39,84,157,0.07)',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: 32,
            }}>
              {/* Left — main number */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: C.redSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${C.redBorder}` }}>
                  <AlertCircle style={{ width: 22, height: 22, color: C.red }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.red, margin: '0 0 3px', fontFamily: FONT }}>
                    Needs Focus
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 38, fontWeight: 900, color: C.title, lineHeight: 1, fontFamily: FONT }}>
                      {stats.needs_improvement + stats.poor}
                    </span>
                    <span style={{ fontSize: 13, color: C.gray, fontWeight: 600, fontFamily: FONT }}>engineers below 7.0</span>
                  </div>
                </div>
              </div>

              {/* Right — breakdown pills */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Fair',              val: stats.fair,              color: C.orange, bg: C.orangeSubtle, border: C.orangeBorder },
                  { label: 'Needs Improvement', val: stats.needs_improvement, color: C.orange, bg: C.orangeSubtle, border: C.orangeBorder },
                  { label: 'Poor',              val: stats.poor,              color: C.red,    bg: C.redSubtle,    border: C.redBorder    },
                ].map(item => (
                  <div key={item.label} style={{
                    textAlign: 'center', background: item.bg,
                    border: `1px solid ${item.border}`,
                    borderRadius: 12, padding: '12px 18px', minWidth: 90,
                  }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: item.color, margin: '0 0 3px', lineHeight: 1, fontFamily: FONT }}>
                      {item.val}
                    </p>
                    <p style={{ fontSize: 10, color: item.color, margin: 0, fontWeight: 700, opacity: 0.85, fontFamily: FONT }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PERFORMANCE TABLE ─────────────────────────────────────────────── */}
        <div style={{
          background: C.white,
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(39,84,157,0.09)',
          border: `1px solid ${C.borderSubtle}`,
          overflow: 'hidden',
        }}>
          {/* Table title bar */}
          <div style={{
            padding: '22px 32px',
            borderBottom: `1px solid ${C.borderSubtle}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: C.title, margin: '0 0 3px', fontFamily: FONT }}>
                Engineer Performance Ranking
              </h2>
              <p style={{ fontSize: 12, color: C.gray, margin: 0, fontFamily: FONT }}>
                Sorted by driving score — top performers first
              </p>
            </div>
            <div style={{
              background: C.blueSubtle, border: `1px solid ${C.blueBorder}`,
              borderRadius: 20, padding: '6px 16px',
              fontSize: 12, fontWeight: 700, color: C.blue, fontFamily: FONT,
            }}>
              {engineers.length} engineers
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
              <thead>
                <tr style={{ background: C.blueSubtle }}>
                  {[
                    { h: 'Rank',        align: 'left'   },
                    { h: 'Engineer',    align: 'left'   },
                    { h: 'Van',         align: 'left'   },
                    { h: 'Trade Group', align: 'left'   },
                    { h: 'Performance', align: 'center' },
                    { h: 'Score',       align: 'right'  },
                  ].map(({ h, align }) => (
                    <th key={h} style={{
                      padding: '13px 20px',
                      textAlign: align as any,
                      fontSize: 10, fontWeight: 800, color: C.blue,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: `1.5px solid ${C.blueBorder}`,
                      whiteSpace: 'nowrap', fontFamily: FONT,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {engineers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: C.gray, fontSize: 14, fontFamily: FONT }}>
                      No engineers found
                    </td>
                  </tr>
                ) : engineers.map((eng) => {
                  const scoreCfg = cfg(eng.score_class);
                  const isTop3   = eng.rank <= 3;
                  return (
                    <tr
                      key={eng.rank}
                      className="wf-row"
                      style={{
                        borderBottom: `1px solid ${C.borderSubtle}`,
                        background: isTop3 ? 'rgba(241,255,36,0.03)' : C.white,
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '15px 20px', background: 'inherit' }}>
                        <RankBadge rank={eng.rank} />
                      </td>

                      {/* Engineer name + avatar */}
                      <td style={{ padding: '15px 20px', minWidth: 200, background: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: isTop3
                              ? `linear-gradient(135deg, ${C.yellow} 0%, ${C.blueLight} 100%)`
                              : C.blueSubtle,
                            border: `1.5px solid ${isTop3 ? C.yellowDark : C.blueBorder}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 900,
                            color: isTop3 ? C.blueDark : C.blue,
                            fontFamily: FONT,
                          }}>
                            {initials(eng.name)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: 14, color: C.title, margin: '0 0 2px', fontFamily: FONT }}>
                              {eng.name}
                            </p>
                            {isTop3 && (
                              <span style={{ fontSize: 10, color: C.graySubtle, fontWeight: 600, fontFamily: FONT }}>
                                ⭐ Top Performer
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Van number */}
                      <td style={{ padding: '15px 20px', background: 'inherit' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px',
                          borderRadius: 20, border: `1.5px solid ${C.blueBorder}`,
                          background: C.blueSubtle, color: C.blue,
                          fontWeight: 700, fontSize: 12, fontFamily: 'monospace',
                        }}>
                          {eng.van_number}
                        </span>
                      </td>

                      {/* Trade group */}
                      <td style={{ padding: '15px 20px', fontSize: 12, color: C.graySubtle, fontWeight: 600, fontFamily: FONT, background: 'inherit' }}>
                        {eng.trade_group}
                      </td>

                      {/* Performance badge */}
                      <td style={{ padding: '15px 20px', textAlign: 'center', background: 'inherit' }}>
                        <span style={{
                          display: 'inline-block', padding: '5px 14px',
                          borderRadius: 20,
                          border: `1.5px solid ${scoreCfg.border}`,
                          background: scoreCfg.bg, color: scoreCfg.text,
                          fontWeight: 800, fontSize: 10,
                          textTransform: 'uppercase', letterSpacing: '0.07em',
                          fontFamily: FONT, whiteSpace: 'nowrap',
                        }}>
                          {scoreCfg.label}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '15px 24px 15px 20px', textAlign: 'right', minWidth: 110, background: 'inherit' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                            <span style={{ fontSize: 26, fontWeight: 900, color: C.title, lineHeight: 1, fontFamily: FONT }}>
                              {eng.score.toFixed(1)}
                            </span>
                            <span style={{ fontSize: 11, color: C.gray, fontWeight: 600, fontFamily: FONT }}>/10</span>
                          </div>
                          <ScoreBar score={eng.score} color={scoreCfg.bar} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {engineers.length > 0 && (
            <div style={{
              padding: '14px 28px',
              borderTop: `1px solid ${C.borderSubtle}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT, fontWeight: 600 }}>
                Showing <b style={{ color: C.body }}>{engineers.length}</b> engineers · Sorted by score descending
              </p>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {[
                  { label: 'Excellent', color: C.yellowDark },
                  { label: 'Good',      color: C.green      },
                  { label: 'Fair',      color: C.orange     },
                  { label: 'Poor',      color: C.red        },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: C.gray, fontWeight: 700, fontFamily: FONT }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Webfleet;