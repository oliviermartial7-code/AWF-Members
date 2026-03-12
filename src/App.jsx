import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js'

// ─── THEME ───────────────────────────────────────────────────────────────────
const t = {
  bg: '#0D1420', surface: '#111B30', card: '#172040', border: '#243060',
  accent: '#F26522', accentLight: '#FF8C4A', green: '#2ECC8A',
  red: '#E85555', yellow: '#F0C040', text: '#EAF0FF',
  textMuted: '#8A9AC8', textDim: '#3A4870',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${t.bg}; font-family: 'DM Sans', sans-serif; color: ${t.text}; }
  input, select, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${t.surface}; }
  ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .spin { animation: spin 1s linear infinite; display:inline-flex; }
  .fade-in { animation: fadeIn 0.3s ease; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${t.accent} !important; }
`

// ─── ICON ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = 'currentColor' }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    members: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></>,
    payments: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    add: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    loader: <><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

// ─── BADGE ──────────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const cfg = {
    'Valide': { bg: '#0D2E20', color: t.green },
    'Validé': { bg: '#0D2E20', color: t.green },
    'A verifier': { bg: '#2E2200', color: t.yellow },
    'À vérifier': { bg: '#2E2200', color: t.yellow },
    'En attente': { bg: '#2E1500', color: t.accent },
    'Actif': { bg: '#0D2E20', color: t.green },
    'Inactif': { bg: '#2E1010', color: t.red },
    'admin': { bg: '#1A1A2E', color: '#A07AE8' },
    'gestionnaire': { bg: '#1A2A1A', color: '#6ABF8E' },
    'membre': { bg: '#1A2630', color: t.textMuted },
  }
  const c = cfg[status] || { bg: t.surface, color: t.textMuted }
  return <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{status}</span>
}

// ─── BUTTON ─────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', disabled, style = {} }) => {
  const variants = {
    primary: { background: t.accent, color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: t.textMuted, border: `1px solid ${t.border}` },
    danger: { background: `${t.red}22`, color: t.red, border: `1px solid ${t.red}44` },
    success: { background: `${t.green}22`, color: t.green, border: `1px solid ${t.green}44` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: disabled ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.7 : 1, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

// ─── FIELD & INPUT ──────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
    {children}
  </div>
)

const Input = ({ value, onChange, type = 'text', placeholder, ...props }) => {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div style={{ position: 'relative' }}>
      <input type={isPassword && show ? 'text' : type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', padding: '11px 14px', paddingRight: isPassword ? 42 : 14, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14 }} {...props} />
      {isPassword && (
        <span onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: t.textMuted }}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
        </span>
      )}
    </div>
  )
}

// ─── STAT CARD ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, accent }) => (
  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: accent || t.accent, opacity: 0.06, borderRadius: '0 16px 0 80px' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ color: t.textMuted, fontSize: 13 }}>{label}</span>
      <Icon name={icon} size={18} color={accent || t.accent} />
    </div>
    <div style={{ color: t.text, fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{value}</div>
    {sub && <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
  </div>
)

// ─── EXPORT THEME & COMPONENTS ──────────────────────────────────────────────
export { t, css, Icon, Badge, Btn, Field, Input, StatCard }
