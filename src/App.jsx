import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js'

// ─── THEME ────────────────────────────────────────────────────────────────────
const t = {
  bg: '#0D1420', surface: '#111B30', card: '#172040', border: '#243060',
  accent: '#F26522', accentLight: '#FF8C4A', green: '#2ECC8A',
  red: '#E85555', yellow: '#F0C040', text: '#EAF0FF',
  textMuted: '#8A9AC8', textDim: '#3A4870',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0D1420; font-family: 'DM Sans', sans-serif; color: #EAF0FF; }
  input, select, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #111B30; }
  ::-webkit-scrollbar-thumb { background: #243060; border-radius: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes pageEnter { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
  .spin { animation: spin 1s linear infinite; display:inline-flex; }
  .fade-in { animation: fadeIn 0.3s ease; }
  .page-enter { animation: pageEnter 0.28s cubic-bezier(.4,0,.2,1); }
  .slide-in { animation: slideInLeft 0.28s cubic-bezier(.4,0,.2,1); }
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:99; backdrop-filter:blur(2px); }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #F26522 !important; }
  @media (max-width: 768px) { .desktop-only { display: none !important; } }
  @media (min-width: 769px) { .mobile-only { display: none !important; } }
`

// ─── CONSTANTES AWF ──────────────────────────────────────────────────────────
const OBJECTIFS_AWF = [
  { nom: 'Cotisation mensuelle',            montant: 2500 },
  { nom: 'Secours',                         montant: 5000 },
  { nom: 'Main levee',                      montant: 2500 },
  { nom: 'On recoit une equipe',            montant: 5000 },
  { nom: 'On est recu par une equipe',      montant: 2500 },
  { nom: 'Avance sur cotisation',           montant: 0    },
  { nom: 'Cotisation evenement heureux',    montant: 2500 },
  { nom: 'Cotisation evenement malheureux', montant: 5000 },
  { nom: 'Sanction',                        montant: 0    },
  { nom: 'Aide',                            montant: 0    },
]

const NUMS_VALIDES = ['699201466', '657790272']
const NOMS_VALIDES = ['ronald leumeni', 'leumeni nya', 'ronald', 'leumeni', 'laeticia ngo', 'ngo laeticia', 'laeticia']

const detectOperateur = (num) => {
  const n = (num || '').replace(/[\s+\-.()]/g, '').replace(/^237/, '')
  if (/^(69|655|656|657|658|659)/.test(n)) return 'Orange Money'
  if (/^(67|650|651|652|653)/.test(n)) return 'MTN MoMo'
  return 'Mobile Money'
}

const validerPreuve = (texte) => {
  if (!texte) return { ok: false }
  const s = texte.toLowerCase().replace(/\+237/g, '').replace(/237/g, '').replace(/[\s\-.() ]/g, '')
  const hasNum  = NUMS_VALIDES.some(n => s.includes(n))
  const hasName = NOMS_VALIDES.some(n => texte.toLowerCase().includes(n))
  return { ok: hasNum || hasName }
}

const fmt = (n) => (n != null ? Number(n).toLocaleString() : '0')

const notifierEmail = (email, nom, montant, objectif) => {
  const s = encodeURIComponent('Paiement valide - AWF Members')
  const b = encodeURIComponent('Bonjour ' + nom + ',\n\nVotre paiement de ' + fmt(montant) + ' FCFA pour "' + objectif + '" a ete valide.\n\nMerci.\n\n--- AWF Members\nPowered by Olivier Martial KONO')
  window.open('mailto:' + email + '?subject=' + s + '&body=' + b, '_blank')
}

// ─── UI DE BASE ───────────────────────────────────────────────────────────────
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  members:   <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></>,
  payments:  <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  report:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  add:       <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  check:     <><polyline points="20 6 9 17 4 12"/></>,
  scan:      <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></>,
  send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  target:    <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  upload:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  loader:    <><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></>,
  eye:       <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:    <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
}

const Icon = ({ name, size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {ICONS[name] || null}
  </svg>
)

const Spinner = () => <span className="spin"><Icon name="loader" size={16} color="currentColor" /></span>

const BADGE_CFG = {
  'Valide':       { bg: '#0D2E20', color: '#2ECC8A' },
  'A verifier':   { bg: '#2E2200', color: '#F0C040' },
  'En attente':   { bg: '#2E1500', color: '#F26522' },
  'Actif':        { bg: '#0D2E20', color: '#2ECC8A' },
  'Inactif':      { bg: '#2E1010', color: '#E85555' },
  'admin':        { bg: '#1A1A2E', color: '#A07AE8' },
  'gestionnaire': { bg: '#1A2A1A', color: '#6ABF8E' },
  'membre':       { bg: '#1A2630', color: '#8A9AC8' },
}

const Badge = ({ status }) => {
  const c = BADGE_CFG[status] || { bg: '#111B30', color: '#8A9AC8' }
  return <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{status}</span>
}

const BTN_STYLES = {
  primary: { background: '#F26522', color: '#fff', border: 'none' },
  ghost:   { background: 'transparent', color: '#8A9AC8', border: '1px solid #243060' },
  danger:  { background: '#E8555522', color: '#E85555', border: '1px solid #E8555544' },
  success: { background: '#2ECC8A22', color: '#2ECC8A', border: '1px solid #2ECC8A44' },
}

const Btn = ({ children, onClick, variant = 'primary', disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: disabled ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.7 : 1, ...BTN_STYLES[variant], ...style }}>
    {children}
  </button>
)

const Field = ({ label, children }) => (
  <div>
    <label style={{ color: '#8A9AC8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
    {children}
  </div>
)

const inpStyle = { width: '100%', padding: '11px 14px', background: '#111B30', border: '1px solid #243060', borderRadius: 8, color: '#EAF0FF', fontSize: 14 }

const Input = ({ type = 'text', value, onChange, placeholder, onKeyDown }) => {
  const [show, setShow] = useState(false)
  const isPwd = type === 'password'
  return (
    <div style={{ position: 'relative' }}>
      <input type={isPwd && show ? 'text' : type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={{ ...inpStyle, paddingRight: isPwd ? 42 : 14 }} />
      {isPwd && <span onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#8A9AC8' }}><Icon name={show ? 'eyeOff' : 'eye'} size={16} /></span>}
    </div>
  )
}

const StatCard = ({ label, value, icon, accent }) => (
  <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: accent || '#F26522', opacity: 0.06, borderRadius: '0 16px 0 80px' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ color: '#8A9AC8', fontSize: 13 }}>{label}</span>
      <Icon name={icon} size={18} color={accent || '#F26522'} />
    </div>
    <div style={{ color: '#EAF0FF', fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{value}</div>
  </div>
)

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const AuthPage = ({ onAuth }) => {
  const [mode, setMode] = useState('login')
  return (
    <div style={{ minHeight: '100vh', background: '#0D1420', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>{css}</style>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, background: '#F26522', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', overflow: 'hidden' }}>
            <img src="/logo.jpg" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="logo" />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#EAF0FF' }}>AWF's Members</h1>
          <p style={{ color: '#8A9AC8', fontSize: 13, marginTop: 6 }}>Gestion des cotisations et contributions</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111B30', borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {[['login', 'Connexion'], ['register', 'Inscription']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: mode === m ? '#172040' : 'transparent', color: mode === m ? '#EAF0FF' : '#8A9AC8', fontWeight: mode === m ? 600 : 400, fontSize: 14, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        {mode === 'login' ? <LoginForm onAuth={onAuth} /> : <RegisterForm onAuth={onAuth} setMode={setMode} />}
      </div>
    </div>
  )
}

const LoginForm = ({ onAuth }) => {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async () => {
    if (!email || !password) return setError('Remplissez tous les champs')
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    const { data: m } = await supabase.from('membres').select('*').eq('email', email).maybeSingle()
    onAuth(data.user, m)
    setLoading(false)
  }

  return (
    <div className="fade-in" style={{ background: '#172040', borderRadius: 16, border: '1px solid #243060', padding: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" /></Field>
        <Field label="Mot de passe"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></Field>
        {error && <div style={{ color: '#E85555', fontSize: 13, padding: '8px 12px', background: '#E8555511', borderRadius: 8 }}>{error}</div>}
        <Btn onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading && <Spinner />}{loading ? 'Connexion...' : 'Se connecter'}
        </Btn>
      </div>
    </div>
  )
}

const RegisterForm = ({ onAuth, setMode }) => {
  const [form, setForm]             = useState({ nom: '', telephone: '', email: '', nom_utilisateur: '', password: '', confirm: '' })
  const [photo, setPhoto]           = useState(null)
  const [photoPreview, setPreview]  = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const photoRef = useRef()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handlePhoto = e => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const submit = async () => {
    if (!form.nom || !form.email || !form.password || !form.nom_utilisateur) return setError('Tous les champs * sont obligatoires')
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas')
    if (form.password.length < 6) return setError('Mot de passe : 6 caracteres minimum')
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (err) { setError(err.message); setLoading(false); return }
    let photo_url = null
    if (photo) {
      try {
        const path = 'reg_' + Date.now() + '.jpg'
        const { error: upErr } = await supabase.storage.from('photos').upload(path, photo, { upsert: true, contentType: photo.type })
        if (!upErr) {
          const { data: ud } = supabase.storage.from('photos').getPublicUrl(path)
          photo_url = ud ? ud.publicUrl : null
        }
      } catch (_) {}
    }
    const { error: err2 } = await supabase.from('membres').insert({ nom: form.nom, telephone: form.telephone, email: form.email, nom_utilisateur: form.nom_utilisateur, statut: 'Actif', role: 'membre', photo_url })
    if (err2) { setError(err2.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  if (success) return (
    <div className="fade-in" style={{ background: '#172040', borderRadius: 16, border: '1px solid #243060', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8, color: '#EAF0FF' }}>Inscription reussie !</h3>
      <p style={{ color: '#8A9AC8', fontSize: 14, marginBottom: 20 }}>Verifiez votre email puis connectez-vous.</p>
      <Btn onClick={() => setMode('login')} style={{ margin: '0 auto', justifyContent: 'center' }}>Aller a la connexion</Btn>
    </div>
  )

  return (
    <div className="fade-in" style={{ background: '#172040', borderRadius: 16, border: '1px solid #243060', padding: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div onClick={() => photoRef.current.click()} style={{ width: 80, height: 80, borderRadius: 14, cursor: 'pointer', overflow: 'hidden', border: '2px dashed ' + (photoPreview ? '#F26522' : '#243060'), background: '#111B30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoPreview ? <img src={photoPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24 }}>📷</div><div style={{ color: '#3A4870', fontSize: 10, marginTop: 2 }}>Photo</div></div>}
          </div>
          <div style={{ color: '#3A4870', fontSize: 11 }}>Photo de profil — facultatif</div>
          <input ref={photoRef} type="file" accept="image/*" capture="user" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>
        <Field label="Nom complet *"><Input value={form.nom} onChange={set('nom')} placeholder="Jean Dupont" /></Field>
        <Field label="Telephone"><Input value={form.telephone} onChange={set('telephone')} placeholder="+237 6 99 00 00 00" /></Field>
        <Field label="Email *"><Input type="email" value={form.email} onChange={set('email')} placeholder="jean@email.com" /></Field>
        <Field label="Nom utilisateur *"><Input value={form.nom_utilisateur} onChange={set('nom_utilisateur')} placeholder="jean_dupont" /></Field>
        <Field label="Mot de passe * (min. 6)"><Input type="password" value={form.password} onChange={set('password')} /></Field>
        <Field label="Confirmer mot de passe *"><Input type="password" value={form.confirm} onChange={set('confirm')} /></Field>
        {error && <div style={{ color: '#E85555', fontSize: 13, padding: '8px 12px', background: '#E8555511', borderRadius: 8 }}>{error}</div>}
        <Btn onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <Spinner /> : <Icon name="user" size={16} color="#fff" />}{loading ? 'Inscription...' : "S'inscrire"}
        </Btn>
      </div>
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Tableau de bord',     icon: 'dashboard', roles: ['admin', 'gestionnaire'] },
  { id: 'members',   label: 'Membres',              icon: 'members',   roles: ['admin', 'gestionnaire'] },
  { id: 'payments',  label: 'Contributions',        icon: 'payments',  roles: ['admin', 'gestionnaire'] },
  { id: 'declare',   label: 'Declarer un paiement', icon: 'add',       roles: ['admin', 'gestionnaire', 'membre'] },
  { id: 'myaccount', label: 'Mon compte',            icon: 'user',      roles: ['membre'] },
  { id: 'report',    label: 'Rapport mensuel',       icon: 'report',    roles: ['admin'] },
]

const SidebarContent = ({ page, setPage, membre, onLogout, onClose }) => {
  const role  = membre ? membre.role : 'membre'
  const items = NAV.filter(i => i.roles.includes(role))
  const go    = id => { setPage(id); if (onClose) onClose() }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #243060' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#F26522' }}>
            <img src="/logo.jpg" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="logo" />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: '#EAF0FF' }}>AWF's Members</div>
            <div style={{ color: '#8A9AC8', fontSize: 11, marginTop: 1 }}>{membre ? membre.nom : 'Utilisateur'}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><Badge status={role} /></div>
      </div>
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {items.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => go(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', marginBottom: 4, background: active ? '#F2652228' : 'transparent', color: active ? '#FF8C4A' : '#8A9AC8', fontWeight: active ? 600 : 400, fontSize: 14, borderLeft: '3px solid ' + (active ? '#F26522' : 'transparent') }}>
              <Icon name={item.icon} size={18} color={active ? '#FF8C4A' : '#8A9AC8'} />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div style={{ padding: '12px 10px', borderTop: '1px solid #243060' }}>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#8A9AC8', fontSize: 14, width: '100%', marginBottom: 12 }}>
          <Icon name="logout" size={18} color="#8A9AC8" /> Deconnexion
        </button>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#3A4870', lineHeight: 1.6 }}>
          Powered by<br /><span style={{ color: '#F26522', fontWeight: 700, fontSize: 11 }}>Olivier Martial KONO</span>
        </div>
      </div>
    </div>
  )
}

const Sidebar = ({ page, setPage, membre, onLogout, mobileOpen, onMobileClose }) => (
  <>
    <div className="desktop-only" style={{ width: 240, background: '#111B30', borderRight: '1px solid #243060', minHeight: '100vh', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <SidebarContent page={page} setPage={setPage} membre={membre} onLogout={onLogout} />
    </div>
    {mobileOpen && (
      <>
        <div className="overlay mobile-only" onClick={onMobileClose} />
        <div className="mobile-only slide-in" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 270, background: '#111B30', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 32px rgba(0,0,0,.5)' }}>
          <button onClick={onMobileClose} style={{ position: 'absolute', top: 14, right: 14, background: '#172040', border: '1px solid #243060', borderRadius: 8, color: '#8A9AC8', width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>X</button>
          <SidebarContent page={page} setPage={setPage} membre={membre} onLogout={onLogout} onClose={onMobileClose} />
        </div>
      </>
    )}
  </>
)

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats]     = useState({ total: 0, attente: 0, membres: 0 })
  const [contribs, setList]   = useState([])
  const [objectifs, setObjs]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: cl }, { count: mc }, { data: ol }] = await Promise.all([
        supabase.from('contributions').select('*, membres(nom), objectifs(nom)').order('created_at', { ascending: false }).limit(6),
        supabase.from('membres').select('*', { count: 'exact', head: true }),
        supabase.from('objectifs').select('*, contributions(montant, statut)'),
      ])
      const list = cl || []
      setList(list); setObjs(ol || [])
      setStats({
        total:   list.filter(c => c.statut === 'Valide').reduce((s, c) => s + (c.montant || 0), 0),
        attente: list.filter(c => c.statut === 'En attente' || c.statut === 'A verifier').length,
        membres: mc || 0,
      })
      setLoading(false)
    }
    load()
    // Temps réel : rafraîchit le dashboard à chaque changement
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) return <div style={{ padding: 40, color: '#8A9AC8' }}>Chargement...</div>

  return (
    <div className="page-enter" style={{ padding: '28px 20px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Tableau de bord</h2>
        <p style={{ color: '#8A9AC8', fontSize: 13, marginTop: 4 }}>{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total collecte" value={fmt(stats.total) + ' F'} icon="payments" accent="#2ECC8A" />
        <StatCard label="En attente" value={stats.attente} icon="scan" accent="#F0C040" />
        <StatCard label="Membres" value={stats.membres} icon="members" accent="#F26522" />
      </div>
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Avancement par objectif</h3>
        {objectifs.filter(o => (o.montant_cible || 0) > 0).map(obj => {
          const total = (obj.contributions || []).filter(c => c.statut === 'Valide').reduce((s, c) => s + (c.montant || 0), 0)
          const pct   = Math.min(100, Math.round((total / obj.montant_cible) * 100))
          return (
            <div key={obj.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{obj.nom}</span>
                <span style={{ color: '#8A9AC8', fontSize: 12 }}>{fmt(total)} / {fmt(obj.montant_cible)} F — {pct}%</span>
              </div>
              <div style={{ height: 6, background: '#243060', borderRadius: 3 }}>
                <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? '#2ECC8A' : '#F26522', borderRadius: 3 }} />
              </div>
            </div>
          )
        })}
        {objectifs.filter(o => (o.montant_cible || 0) > 0).length === 0 && <p style={{ color: '#3A4870', fontSize: 13 }}>Aucun objectif configure</p>}
      </div>
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #243060' }}><span style={{ fontWeight: 600, fontSize: 15 }}>Dernieres contributions</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#111B30' }}>
            {['Membre', 'Objectif', 'Montant', 'Statut'].map(h => <th key={h} style={{ color: '#8A9AC8', fontSize: 11, textAlign: 'left', padding: '11px 16px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {contribs.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #243060' }}>
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500 }}>{c.membres ? c.membres.nom : '—'}</td>
                <td style={{ padding: '11px 16px', color: '#8A9AC8', fontSize: 12 }}>{c.objectifs ? c.objectifs.nom : '—'}</td>
                <td style={{ padding: '11px 16px', color: '#FF8C4A', fontWeight: 600, fontSize: 13 }}>{fmt(c.montant)} F</td>
                <td style={{ padding: '11px 16px' }}><Badge status={c.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {contribs.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#8A9AC8' }}>Aucune contribution</div>}
      </div>
    </div>
  )
}

// ─── MEMBRES ─────────────────────────────────────────────────────────────────
const Members = () => {
  const [membres, setMembres] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase.from('membres').select('*').order('nom')
    setMembres(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setRole = async (id, role) => { await supabase.from('membres').update({ role }).eq('id', id); load() }
  const toggle  = async (id, s)    => { await supabase.from('membres').update({ statut: s === 'Actif' ? 'Inactif' : 'Actif' }).eq('id', id); load() }

  if (loading) return <div style={{ padding: 40, color: '#8A9AC8' }}>Chargement...</div>

  return (
    <div className="page-enter" style={{ padding: '28px 16px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Membres</h2>
        <p style={{ color: '#8A9AC8', fontSize: 13, marginTop: 4 }}>{membres.length} membres</p>
      </div>
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead><tr style={{ background: '#111B30' }}>
            {['Membre', 'Contact', 'Role', 'Statut', 'Action'].map(h => <th key={h} style={{ color: '#8A9AC8', fontSize: 11, textAlign: 'left', padding: '12px 14px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {membres.map(m => (
              <tr key={m.id} style={{ borderTop: '1px solid #243060' }}>
                <td style={{ padding: '14px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.photo_url
                      ? <img src={m.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F2652233', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F26522', fontWeight: 700, fontSize: 14 }}>{m.nom ? m.nom.charAt(0) : '?'}</div>
                    }
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{m.nom}</div>
                      <div style={{ color: '#3A4870', fontSize: 11 }}>@{m.nom_utilisateur}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 14px', color: '#8A9AC8', fontSize: 12 }}><div>{m.email}</div><div>{m.telephone}</div></td>
                <td style={{ padding: '14px 14px' }}>
                  <select value={m.role} onChange={e => setRole(m.id, e.target.value)} style={{ background: '#111B30', border: '1px solid #243060', borderRadius: 6, color: '#EAF0FF', fontSize: 12, padding: '4px 8px' }}>
                    <option value="membre">membre</option>
                    <option value="gestionnaire">gestionnaire</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td style={{ padding: '14px 14px' }}><Badge status={m.statut} /></td>
                <td style={{ padding: '14px 14px' }}>
                  <button onClick={() => toggle(m.id, m.statut)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #243060', background: 'transparent', color: '#8A9AC8', fontSize: 12, cursor: 'pointer' }}>
                    {m.statut === 'Actif' ? 'Desactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {membres.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#8A9AC8' }}>Aucun membre</div>}
      </div>
    </div>
  )
}

// ─── CONTRIBUTIONS ───────────────────────────────────────────────────────────
const Contributions = () => {
  const [contribs, setContribs] = useState([])
  const [filter, setFilter]     = useState('Tous')
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading]   = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('contributions')
      .select('*, membres(nom, email), objectifs(nom)')
      .order('created_at', { ascending: false })
    setContribs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Abonnement temps réel — toute modification sur contributions rafraîchit
    const channel = supabase
      .channel('contributions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const validate = async c => {
    // Mise à jour optimiste immédiate dans l'état local
    setContribs(prev => prev.map(x => x.id === c.id ? { ...x, statut: 'Valide' } : x))
    // Puis mise à jour en base
    await supabase.from('contributions').update({ statut: 'Valide' }).eq('id', c.id)
    if (c.membres && c.membres.email) {
      notifierEmail(c.membres.email, c.membres.nom, c.montant, c.objectifs ? c.objectifs.nom : 'contribution')
    }
  }

  const filtered = filter === 'Tous' ? contribs : contribs.filter(c => c.statut === filter)

  if (loading) return <div style={{ padding: 40, color: '#8A9AC8' }}>Chargement...</div>

  return (
    <div className="page-enter" style={{ padding: '28px 16px', maxWidth: 1050 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Contributions</h2>
          <p style={{ color: '#8A9AC8', fontSize: 13, marginTop: 4 }}>{contribs.length} transactions</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Tous', 'Valide', 'En attente', 'A verifier'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '7px 13px', background: filter === s ? '#F26522' : 'transparent', border: '1px solid ' + (filter === s ? '#F26522' : '#243060'), borderRadius: 8, color: filter === s ? '#fff' : '#8A9AC8', fontSize: 12, fontWeight: filter === s ? 600 : 400, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead><tr style={{ background: '#111B30' }}>
            {['Membre', 'Objectif', 'Montant', 'Mode', 'Date', 'Notes', 'Statut', 'Action'].map(h => (
              <th key={h} style={{ color: '#8A9AC8', fontSize: 11, textAlign: 'left', padding: '12px 12px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <React.Fragment key={c.id}>
                <tr style={{ borderTop: '1px solid #243060', cursor: c.preuve_texte ? 'pointer' : 'default', transition: 'background 0.2s' }}
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 500 }}>{c.membres ? c.membres.nom : '—'}</td>
                  <td style={{ padding: '12px 12px', color: '#8A9AC8', fontSize: 12 }}>{c.objectifs ? c.objectifs.nom : '—'}</td>
                  <td style={{ padding: '12px 12px', color: '#FF8C4A', fontSize: 13, fontWeight: 600 }}>{fmt(c.montant)} F</td>
                  <td style={{ padding: '12px 12px', color: '#8A9AC8', fontSize: 12 }}>{c.mode_paiement}</td>
                  <td style={{ padding: '12px 12px', color: '#8A9AC8', fontSize: 12 }}>{c.date}</td>
                  <td style={{ padding: '12px 12px', fontSize: 11, color: '#8A9AC8', maxWidth: 160 }}>
                    {c.note && <div style={{ marginBottom: 2 }}>📝 {c.note}</div>}
                    {c.preuve_texte && <div style={{ color: '#F26522', fontSize: 11 }}>💬 SMS ▾</div>}
                  </td>
                  <td style={{ padding: '12px 12px' }}><Badge status={c.statut} /></td>
                  <td style={{ padding: '12px 12px' }}>
                    {c.statut !== 'Valide' && (
                      <Btn variant="success" onClick={e => { e.stopPropagation(); validate(c) }} style={{ padding: '5px 10px', fontSize: 11 }}>
                        <Icon name="check" size={12} color="#2ECC8A" /> Valider
                      </Btn>
                    )}
                  </td>
                </tr>
                {expanded === c.id && c.preuve_texte && (
                  <tr style={{ background: '#111B30' }}>
                    <td colSpan={8} style={{ padding: '10px 20px' }}>
                      <div style={{ background: '#0D1420', border: '1px solid #243060', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#EAF0FF', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{c.preuve_texte}</div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#8A9AC8' }}>Aucune transaction</div>}
      </div>
    </div>
  )
}

// ─── DECLARER UN PAIEMENT ─────────────────────────────────────────────────────
const EMPTY_FORM = { membre_id: '', objectif_nom: '', montant: '', date: '', mode_paiement: 'Mobile Money', note: '' }

const Declare = ({ membreId }) => {
  const getEmptyForm = () => ({ ...EMPTY_FORM, membre_id: membreId || '', date: new Date().toISOString().split('T')[0] })
  const [membres, setMembres]       = useState([])
  const [form, setForm]             = useState(getEmptyForm())
  const [preuveMode, setPreuveMode] = useState('image')
  const [image, setImage]           = useState(null)
  const [imageB64, setImageB64]     = useState(null)
  const [preuveTexte, setTexte]     = useState('')
  const [ocr, setOcr]               = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [preuveOk, setPreuveOk]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [sent, setSent]             = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('membres').select('id, nom').order('nom').then(({ data }) => setMembres(data || []))
  }, [])

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return
    setImage(URL.createObjectURL(file)); setOcr(null); setPreuveOk(null)
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target && ev.target.result) {
        const parts = ev.target.result.split(',')
        if (parts.length > 1) setImageB64(parts[1])
      }
    }
    reader.readAsDataURL(file)
  }

  const handleTexte = val => {
    setTexte(val)
    if (val.length > 10) {
      setPreuveOk(validerPreuve(val).ok)
      const nm = val.match(/\b(6[579]\d{7}|6[50-3]\d{7})\b/)
      if (nm) setForm(f => ({ ...f, mode_paiement: detectOperateur(nm[0]) }))
    } else {
      setPreuveOk(null)
    }
  }

  const analyzeOCR = async () => {
    setOcrLoading(true)
    try {
      const prompt = 'Analyse cette preuve de paiement Mobile Money camerounais. Verifie si le destinataire est Ronald LEUMENI NYA (699201466) ou Laeticia NGO (657790272). Retourne UNIQUEMENT du JSON valide sans markdown ni explication: {"montant":null,"reference":null,"expediteur":null,"recepteur":null,"date":null,"mode":"Orange Money","destinataire_valide":false,"confiance":"faible"}'
      const msgContent = preuveMode === 'image'
        ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } }, { type: 'text', text: prompt }]
        : 'Analyse ce SMS:\n' + preuveTexte + '\n\n' + prompt
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: msgContent }] })
      })
      if (!resp.ok) throw new Error('Erreur API')
      const data = await resp.json()
      const raw = ((data.content && data.content[0] && data.content[0].text) || '{}').replace(/```[a-z]*/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(raw)
      setOcr(parsed)
      const checkText = (parsed.recepteur || '') + ' ' + (parsed.numero_recepteur || '') + ' ' + preuveTexte
      setPreuveOk(validerPreuve(checkText).ok || !!parsed.destinataire_valide)
      if (parsed.montant && !form.montant) setForm(f => ({ ...f, montant: String(parsed.montant), mode_paiement: parsed.mode || f.mode_paiement }))
    } catch (_) {
      setOcr({ confiance: 'faible', destinataire_valide: false })
    }
    setOcrLoading(false)
  }

  const submit = async () => {
    if (!form.membre_id || !form.objectif_nom || !form.montant) return
    setLoading(true)
    const montant   = Number(form.montant)
    const hasPreuve = (preuveMode === 'image' && imageB64) || (preuveMode === 'texte' && preuveTexte)
    const statut    = hasPreuve ? (preuveOk ? 'Valide' : 'A verifier') : 'En attente'

    let objId = null
    const { data: objEx } = await supabase.from('objectifs').select('id').eq('nom', form.objectif_nom).maybeSingle()
    if (objEx) {
      objId = objEx.id
    } else {
      const mc = OBJECTIFS_AWF.find(o => o.nom === form.objectif_nom)
      const montantCible = mc ? mc.montant : 0
      const { data: newObj } = await supabase.from('objectifs').insert({ nom: form.objectif_nom, montant_cible: montantCible, est_fixe: montantCible > 0 }).select('id').maybeSingle()
      if (newObj) objId = newObj.id
    }

    await supabase.from('contributions').insert({
      membre_id:     form.membre_id,
      objectif_id:   objId,
      montant,
      date:          form.date,
      mode_paiement: form.mode_paiement,
      statut,
      note:          form.note || null,
      preuve_texte:  preuveMode === 'texte' ? (preuveTexte || null) : null,
    })
    setLoading(false); setSent(true)
    setTimeout(() => {
      setSent(false); setForm(getEmptyForm()); setImage(null); setImageB64(null); setTexte(''); setOcr(null); setPreuveOk(null)
    }, 3000)
  }

  if (sent) return (
    <div className="fade-in" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 70, height: 70, background: '#2ECC8A22', borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon name="check" size={32} color="#2ECC8A" />
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Declaration envoyee !</h3>
      <p style={{ color: '#8A9AC8', marginTop: 8 }}>Votre paiement a ete enregistre.</p>
    </div>
  )

  const objActuel = OBJECTIFS_AWF.find(o => o.nom === form.objectif_nom)
  const hasAnalyse = (preuveMode === 'image' && imageB64) || (preuveMode === 'texte' && preuveTexte.length > 20)
  const canSubmit  = form.membre_id && form.objectif_nom && form.montant

  return (
    <div className="page-enter" style={{ padding: '28px 16px', maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Declarer un paiement</h2>
        <p style={{ color: '#8A9AC8', fontSize: 13, marginTop: 4 }}>Enregistrez votre contribution avec preuve</p>
      </div>
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Membre *">
            <select value={form.membre_id} onChange={e => setForm({ ...form, membre_id: e.target.value })} style={inpStyle}>
              <option value="">Selectionner...</option>
              {membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </Field>
          <Field label="Type de cotisation *">
            <select value={form.objectif_nom} onChange={e => {
              const o = OBJECTIFS_AWF.find(x => x.nom === e.target.value)
              setForm({ ...form, objectif_nom: e.target.value, montant: (o && o.montant > 0) ? String(o.montant) : form.montant })
            }} style={inpStyle}>
              <option value="">Selectionner...</option>
              {OBJECTIFS_AWF.map(o => <option key={o.nom} value={o.nom}>{o.nom + (o.montant > 0 ? ' — ' + o.montant.toLocaleString() + ' F' : '')}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Montant (FCFA) *">
            <Input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} placeholder={objActuel && objActuel.montant > 0 ? String(objActuel.montant) : '5000'} />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Operateur">
            <select value={form.mode_paiement} onChange={e => setForm({ ...form, mode_paiement: e.target.value })} style={inpStyle}>
              <option>Mobile Money</option><option>Orange Money</option><option>MTN MoMo</option><option>Cash</option>
            </select>
          </Field>
        </div>

        <Field label="Note / Details (optionnel)">
          <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ex: cotisation mars 2025..." />
        </Field>

        <div>
          <label style={{ color: '#8A9AC8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Preuve de paiement</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['image', 'Capture ecran'], ['texte', 'Texte SMS']].map(([m, l]) => (
              <button key={m} onClick={() => setPreuveMode(m)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid ' + (preuveMode === m ? '#F26522' : '#243060'), background: preuveMode === m ? '#F2652222' : 'transparent', color: preuveMode === m ? '#FF8C4A' : '#8A9AC8', fontSize: 13, cursor: 'pointer', fontWeight: preuveMode === m ? 600 : 400 }}>
                {m === 'image' ? '📷 ' : '💬 '}{l}
              </button>
            ))}
          </div>

          {preuveMode === 'image' && (
            <>
              <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed ' + (image ? '#F26522' : '#243060'), borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: image ? '#F2652208' : 'transparent' }}>
                {image
                  ? <><img src={image} alt="preuve" style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} /><div style={{ color: '#F26522', fontSize: 12 }}>Image chargee — cliquez pour changer</div></>
                  : <><Icon name="upload" size={24} color="#3A4870" /><div style={{ color: '#8A9AC8', fontSize: 13, marginTop: 8 }}>Cliquez pour uploader la capture</div><div style={{ color: '#3A4870', fontSize: 11, marginTop: 4 }}>Destinataire : Ronald LEUMENI NYA (699201466) ou Laeticia NGO (657790272)</div></>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </>
          )}

          {preuveMode === 'texte' && (
            <>
              <textarea value={preuveTexte} onChange={e => handleTexte(e.target.value)}
                placeholder="Collez ici le texte du SMS de confirmation."
                rows={5} style={{ width: '100%', padding: '11px 14px', background: '#111B30', border: '1px solid ' + (preuveOk === null ? '#243060' : preuveOk ? '#2ECC8A' : '#E85555'), borderRadius: 8, color: '#EAF0FF', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
              {preuveOk !== null && (
                <div className="fade-in" style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: preuveOk ? '#2ECC8A15' : '#E8555515', border: '1px solid ' + (preuveOk ? '#2ECC8A33' : '#E8555533') }}>
                  <span style={{ color: preuveOk ? '#2ECC8A' : '#E85555', fontSize: 13 }}>
                    {preuveOk ? '✅ Destinataire reconnu — preuve valide' : '⚠️ Destinataire non reconnu — SMS doit mentionner Ronald LEUMENI NYA (699201466) ou Laeticia NGO (657790272)'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {hasAnalyse && (
          <Btn variant="ghost" onClick={analyzeOCR} disabled={ocrLoading}>
            {ocrLoading ? <Spinner /> : <Icon name="scan" size={16} />}
            {ocrLoading ? 'Analyse IA en cours...' : 'Analyser la preuve avec IA'}
          </Btn>
        )}

        {ocr && (
          <div className="fade-in" style={{ background: '#111B30', border: '1px solid ' + (ocr.destinataire_valide ? '#2ECC8A55' : '#F0C04055'), borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: ocr.destinataire_valide ? '#2ECC8A' : '#F0C040' }}>
              {ocr.destinataire_valide ? '✅ Destinataire valide par IA' : '⚠️ Destinataire non confirme — verification manuelle requise'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[['Montant', fmt(ocr.montant) + ' F'], ['Mode', ocr.mode || '—'], ['Reference', ocr.reference || '—'], ['Expediteur', ocr.expediteur || '—'], ['Recepteur', ocr.recepteur || '—'], ['Confiance', ocr.confiance || '—']].map(([k, v]) => (
                <div key={k}><div style={{ color: '#8A9AC8', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div><div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div></div>
              ))}
            </div>
          </div>
        )}

        <Btn onClick={submit} disabled={loading || !canSubmit} style={{ alignSelf: 'flex-start' }}>
          {loading ? <Spinner /> : <Icon name="send" size={16} color="#fff" />}
          {loading ? 'Envoi...' : 'Envoyer la declaration'}
        </Btn>
      </div>
    </div>
  )
}

// ─── MON COMPTE ───────────────────────────────────────────────────────────────
const MyAccount = ({ membre }) => {
  const [contribs, setContribs]   = useState([])
  const [photoUrl, setPhotoUrl]   = useState(membre ? membre.photo_url : null)
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef()

  const loadContribs = async () => {
    if (!membre || !membre.id) return
    const { data } = await supabase
      .from('contributions')
      .select('*, objectifs(nom)')
      .eq('membre_id', membre.id)
      .order('created_at', { ascending: false })
    setContribs(data || [])
  }

  useEffect(() => {
    loadContribs()
    if (!membre || !membre.id) return
    // Abonnement temps réel — se rafraîchit dès qu'un paiement est validé
    const channel = supabase
      .channel('myaccount-' + membre.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'contributions',
        filter: 'membre_id=eq.' + membre.id
      }, () => { loadContribs() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [membre])

  const handlePhoto = async e => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const path = 'membre_' + membre.id + '.jpg'
      const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type })
      if (!upErr) {
        const { data: ud } = supabase.storage.from('photos').getPublicUrl(path)
        const url = (ud ? ud.publicUrl : '') + '?t=' + Date.now()
        setPhotoUrl(url)
        await supabase.from('membres').update({ photo_url: url }).eq('id', membre.id)
      }
    } catch (_) {}
    setUploading(false)
  }

  const valides   = contribs.filter(c => c.statut === 'Valide')
  const attente   = contribs.filter(c => c.statut !== 'Valide')
  const total     = valides.reduce((s, c) => s + (c.montant || 0), 0)

  // Récapitulatif par type de cotisation
  const recap = {}
  valides.forEach(c => {
    const nom = c.objectifs ? c.objectifs.nom : 'Autre'
    if (!recap[nom]) recap[nom] = { total: 0, count: 0 }
    recap[nom].total += (c.montant || 0)
    recap[nom].count += 1
  })
  const recapList = Object.entries(recap).sort((a, b) => b[1].total - a[1].total)

  // Cotisation mensuelle : à jour si >= 2500 F validés ce mois
  const moisCourant = new Date().toISOString().slice(0, 7) // "2025-03"
  const cotiseMois  = valides.filter(c => c.date && c.date.startsWith(moisCourant) && c.objectifs && c.objectifs.nom === 'Cotisation mensuelle').reduce((s, c) => s + (c.montant || 0), 0)
  const aJour       = cotiseMois >= 2500

  return (
    <div className="page-enter" style={{ padding: '28px 16px', maxWidth: 760 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 20 }}>Mon compte</h2>

      {/* Profil */}
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => photoRef.current.click()}>
            {photoUrl
              ? <img src={photoUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '2px solid #F26522' }} />
              : <div style={{ width: 64, height: 64, background: '#F2652233', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F26522', fontWeight: 700, fontSize: 26, border: '2px dashed #F2652255' }}>{membre && membre.nom ? membre.nom.charAt(0) : '?'}</div>
            }
            <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#F26522', borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? <Spinner /> : <Icon name="upload" size={11} color="#fff" />}
            </div>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{membre ? membre.nom : ''}</div>
            <div style={{ color: '#8A9AC8', fontSize: 13 }}>@{membre ? membre.nom_utilisateur : ''}</div>
            <div style={{ color: '#8A9AC8', fontSize: 13 }}>{membre ? membre.email : ''}</div>
          </div>
          {/* Badge statut cotisation */}
          <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 12, background: aJour ? '#2ECC8A18' : '#E8555518', border: '1px solid ' + (aJour ? '#2ECC8A44' : '#E8555544') }}>
            <div style={{ fontSize: 20 }}>{aJour ? '✅' : '⚠️'}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: aJour ? '#2ECC8A' : '#E85555', marginTop: 4 }}>
              {aJour ? 'A jour' : 'En retard'}
            </div>
            <div style={{ fontSize: 10, color: '#8A9AC8', marginTop: 2 }}>ce mois</div>
          </div>
        </div>

        {/* Stats rapides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <StatCard label="Total valide" value={fmt(total) + ' F'} icon="payments" accent="#2ECC8A" />
          <StatCard label="En attente" value={attente.length} icon="scan" accent="#F0C040" />
          <StatCard label="Total operations" value={contribs.length} icon="target" accent="#F26522" />
        </div>
      </div>

      {/* Récapitulatif par type de cotisation */}
      {recapList.length > 0 && (
        <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>📊 Recapitulatif par type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recapList.map(([nom, data]) => (
              <div key={nom} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#111B30', borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{nom}</div>
                  <div style={{ fontSize: 11, color: '#8A9AC8', marginTop: 2 }}>{data.count} paiement{data.count > 1 ? 's' : ''} valide{data.count > 1 ? 's' : ''}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FF8C4A' }}>{fmt(data.total)} F</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique complet */}
      <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #243060', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Historique complet</h3>
          <span style={{ fontSize: 12, color: '#8A9AC8' }}>{contribs.length} operation{contribs.length > 1 ? 's' : ''}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#111B30' }}>
            {['Type de cotisation', 'Montant', 'Note', 'Date', 'Statut'].map(h =>
              <th key={h} style={{ color: '#8A9AC8', fontSize: 11, textAlign: 'left', padding: '11px 14px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {contribs.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #243060' }}>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>{c.objectifs ? c.objectifs.nom : '—'}</td>
                <td style={{ padding: '11px 14px', color: '#FF8C4A', fontWeight: 600, fontSize: 13 }}>{fmt(c.montant)} F</td>
                <td style={{ padding: '11px 14px', color: '#8A9AC8', fontSize: 12 }}>{c.note || '—'}</td>
                <td style={{ padding: '11px 14px', color: '#8A9AC8', fontSize: 12 }}>{c.date}</td>
                <td style={{ padding: '11px 14px' }}><Badge status={c.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {contribs.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#8A9AC8' }}>Aucune contribution enregistree</div>}
      </div>
    </div>
  )
}

// ─── RAPPORT ─────────────────────────────────────────────────────────────────
const getDernierVendredi = () => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1)
  return d
}

const Report = () => {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const now      = new Date()
  const vendredi = getDernierVendredi()
  const jours    = Math.ceil((vendredi - now) / 86400000)
  const isVend   = vendredi.toDateString() === now.toDateString()

  const generate = async () => {
    setLoading(true)
    const { data: membres } = await supabase.from('membres').select('*, contributions(montant, statut, note, objectifs(nom))')
    const mois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const data = (membres || []).map(m => {
      const valides   = (m.contributions || []).filter(c => c.statut === 'Valide')
      const total     = valides.reduce((s, c) => s + (c.montant || 0), 0)
      const details   = valides.map(c => (c.objectifs ? c.objectifs.nom : '') + ': ' + fmt(c.montant) + ' F' + (c.note ? ' (' + c.note + ')' : '')).join(' | ')
      return { ...m, totalPaye: total, aJour: total >= 2500, details }
    })
    setReport({ membres: data, totalCollecte: data.reduce((s, m) => s + m.totalPaye, 0), totalAttendu: data.length * 2500, mois })
    setLoading(false)
  }

  const envoyerRappels = async () => {
    if (!report) return
    setSending(true)
    for (const m of report.membres) {
      if (!m.email) continue
      const sujet  = encodeURIComponent('Rapport mensuel AWF - ' + report.mois)
      const manque = Math.max(0, 2500 - m.totalPaye)
      const txt    = m.aJour
        ? 'Bonjour ' + m.nom + ',\n\nVous etes a jour pour ' + report.mois + '!\nTotal verse: ' + fmt(m.totalPaye) + ' FCFA\n' + (m.details ? 'Details: ' + m.details + '\n' : '') + '\nMerci.\n\n--- AWF Members\nPowered by Olivier Martial KONO'
        : 'Bonjour ' + m.nom + ',\n\nIl vous manque ' + fmt(manque) + ' FCFA pour ' + report.mois + '.\nDeja verse: ' + fmt(m.totalPaye) + ' FCFA\nRestant: ' + fmt(manque) + ' FCFA\n\nMerci de regulariser.\n\n--- AWF Members\nPowered by Olivier Martial KONO'
      window.open('mailto:' + m.email + '?subject=' + sujet + '&body=' + encodeURIComponent(txt), '_blank')
      await new Promise(r => setTimeout(r, 300))
    }
    setSending(false)
  }

  const jourStr   = jours > 1 ? jours + ' jours' : jours + ' jour'
  const dateStr   = vendredi.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const bannerMsg = isVend ? "Aujourd'hui : dernier vendredi du mois — envoyez les rappels !" : 'Prochain envoi : ' + dateStr + ' (dans ' + jourStr + ')'
  const bBg     = isVend ? '#2ECC8A18' : '#F2652212'
  const bBorder = isVend ? '#2ECC8A44' : '#F2652244'
  const bColor  = isVend ? '#2ECC8A' : '#FF8C4A'

  return (
    <div className="page-enter" style={{ padding: '28px 16px', maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Rapport mensuel</h2>
          <p style={{ color: '#8A9AC8', fontSize: 13, marginTop: 4 }}>Etat financier de l'association</p>
        </div>
        <Btn onClick={generate} disabled={loading}>
          {loading ? <Spinner /> : <Icon name="report" size={16} color="#fff" />}{loading ? 'Generation...' : 'Generer le rapport'}
        </Btn>
      </div>

      <div style={{ background: bBg, border: '1px solid ' + bBorder, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>{isVend ? '📅' : '⏰'}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: bColor }}>{bannerMsg}</div>
          <div style={{ fontSize: 11, color: '#8A9AC8', marginTop: 2 }}>Rappels envoyes par email chaque dernier vendredi du mois</div>
        </div>
      </div>

      {!report && (
        <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, padding: 60, textAlign: 'center', color: '#8A9AC8' }}>
          <Icon name="report" size={40} color="#3A4870" />
          <div style={{ marginTop: 14 }}>Cliquez sur Generer pour calculer la situation de chaque membre</div>
        </div>
      )}

      {report && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="Total collecte" value={fmt(report.totalCollecte) + ' F'} icon="payments" accent="#2ECC8A" />
            <StatCard label="Total attendu"  value={fmt(report.totalAttendu) + ' F'}  icon="target"   accent="#F26522" />
            <StatCard label="Membres a jour" value={report.membres.filter(m => m.aJour).length + '/' + report.membres.length} icon="check" accent="#2ECC8A" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <Btn onClick={envoyerRappels} disabled={sending} variant="ghost">
              {sending ? <Spinner /> : <Icon name="send" size={15} />}
              {sending ? 'Envoi...' : 'Envoyer les rappels (' + report.membres.length + ' membres)'}
            </Btn>
          </div>
          <div style={{ background: '#172040', border: '1px solid #243060', borderRadius: 16, overflow: 'auto' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #243060' }}><span style={{ fontWeight: 600, fontSize: 15 }}>Etat par membre — {report.mois}</span></div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead><tr style={{ background: '#111B30' }}>
                {['Membre', 'Paye', 'Attendu', 'Solde', 'Details', 'Statut'].map(h => <th key={h} style={{ color: '#8A9AC8', fontSize: 11, textAlign: 'left', padding: '11px 14px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {report.membres.map(m => (
                  <tr key={m.id} style={{ borderTop: '1px solid #243060' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 500, fontSize: 13 }}>{m.nom}</td>
                    <td style={{ padding: '12px 14px', color: '#FF8C4A', fontWeight: 600, fontSize: 13 }}>{fmt(m.totalPaye)} F</td>
                    <td style={{ padding: '12px 14px', color: '#8A9AC8', fontSize: 13 }}>2 500 F</td>
                    <td style={{ padding: '12px 14px', color: m.aJour ? '#2ECC8A' : '#E85555', fontWeight: 600, fontSize: 13 }}>{m.aJour ? 'Solde' : fmt(2500 - m.totalPaye) + ' F restants'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#8A9AC8', maxWidth: 260 }}>{m.details || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><Badge status={m.aJour ? 'Actif' : 'Inactif'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(null)
  const [membre, setMembre]     = useState(null)
  const [page, setPage]         = useState('dashboard')
  const [checking, setChecking] = useState(true)
  const [sidebarOpen, setSide]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data ? data.session : null
      if (session) {
        const { data: m } = await supabase.from('membres').select('*').eq('email', session.user.email).maybeSingle()
        setUser(session.user); setMembre(m)
        setPage(m && m.role === 'membre' ? 'myaccount' : 'dashboard')
      }
      setChecking(false)
    })
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); setMembre(null) }
    })
  }, [])

  const handleAuth   = (u, m) => { setUser(u); setMembre(m); setPage(m && m.role === 'membre' ? 'myaccount' : 'dashboard') }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setMembre(null); setPage('dashboard') }
  const goTo         = p => { setPage(p); setSide(false) }

  const TITLES = { dashboard: 'Tableau de bord', members: 'Membres', payments: 'Contributions', declare: 'Declarer un paiement', myaccount: 'Mon compte', report: 'Rapport mensuel' }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0D1420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{css}</style>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.jpg" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 16, borderRadius: 12 }} alt="logo" />
        <div style={{ color: '#8A9AC8' }}>Chargement...</div>
      </div>
    </div>
  )

  if (!user) return <AuthPage onAuth={handleAuth} />

  const PAGES = {
    dashboard: <Dashboard />,
    members:   <Members />,
    payments:  <Contributions />,
    declare:   <Declare membreId={membre ? membre.id : null} />,
    myaccount: <MyAccount membre={membre} />,
    report:    <Report />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1420' }}>
      <style>{css}</style>
      <Sidebar page={page} setPage={goTo} membre={membre} onLogout={handleLogout} mobileOpen={sidebarOpen} onMobileClose={() => setSide(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, background: '#111B30', borderBottom: '1px solid #243060', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
          <button onClick={() => setSide(true)} style={{ background: '#172040', border: '1px solid #243060', borderRadius: 10, width: 40, height: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <div style={{ width: 18, height: 2, background: '#F26522', borderRadius: 2 }} />
            <div style={{ width: 14, height: 2, background: '#8A9AC8', borderRadius: 2 }} />
            <div style={{ width: 18, height: 2, background: '#F26522', borderRadius: 2 }} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{TITLES[page] || 'AWF Members'}</span>
          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', background: '#F26522' }}>
            <img src="/logo.jpg" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="logo" />
          </div>
        </div>
        <main key={page} className="page-enter" style={{ flex: 1, overflowY: 'auto' }}>
          {PAGES[page] || PAGES.dashboard}
        </main>
        <div style={{ textAlign: 'center', padding: '10px 16px', borderTop: '1px solid #243060', background: '#111B30', flexShrink: 0, fontSize: 11, color: '#3A4870' }}>
          Powered by <span style={{ color: '#F26522', fontWeight: 700 }}>Olivier Martial KONO</span> · AWF's Members © 2025
        </div>
      </div>
    </div>
  )
}
