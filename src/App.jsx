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
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes pageEnter { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:translateX(0); } }
  .spin { animation: spin 1s linear infinite; display:inline-flex; }
  .fade-in { animation: fadeIn 0.3s ease; }
  .page-transition { animation: pageEnter 0.28s cubic-bezier(.4,0,.2,1); }
  .sidebar-open { animation: slideInLeft 0.28s cubic-bezier(.4,0,.2,1); }
  .sidebar-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:99; backdrop-filter:blur(2px); }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${t.accent} !important; }
  @media (max-width: 768px) { .desktop-sidebar { display: none !important; } }
  @media (min-width: 769px) { .mobile-topbar { display: none !important; } .mobile-sidebar { display: none !important; } }
`

// ─── CONSTANTES AWF ──────────────────────────────────────────────────────────
const OBJECTIFS_AWF = [
  { nom: 'Cotisation mensuelle',              montant: 2500  },
  { nom: 'Secours',                           montant: 5000  },
  { nom: 'Main levée',                        montant: 2500  },
  { nom: 'On reçoit une équipe',              montant: 5000  },
  { nom: 'On est reçu par une équipe',        montant: 2500  },
  { nom: 'Avance sur cotisation',             montant: 0     },
  { nom: 'Cotisation évènement heureux',      montant: 2500  },
  { nom: 'Cotisation évènement malheureux',   montant: 5000  },
  { nom: 'Sanction',                          montant: 0     },
  { nom: 'Aide',                              montant: 0     },
]

// Numéros et noms valides pour preuve de paiement
// Numéros exacts des destinataires autorisés (toutes formes possibles)
const NUMS_VALIDES = [
  '699201466',   // Ronald LEUMENI NYA
  '657790272',   // Laeticia NGO (+237 6 57 79 02 72)
]
const NOMS_VALIDES = [
  'ronald leumeni', 'leumeni nya', 'ronald', 'leumeni',
  'laeticia ngo', 'ngo laeticia', 'laeticia',
]

const detectOperateur = (num = '') => {
  const n = num.replace(/[\s+\-().]/g, '').replace(/^237/, '')
  if (/^(69|655|656|657|658|659)/.test(n)) return 'Orange Money'
  if (/^(67|650|651|652|653)/.test(n))     return 'MTN MoMo'
  return null
}

const validerPreuve = (texte = '') => {
  // Nettoyer le texte : enlever espaces, tirets, +, points, parenthèses, indicatif 237
  const stripped = texte.toLowerCase()
    .replace(/\+237/g, '')      // retirer indicatif cameroun
    .replace(/237/g, '')        // retirer indicatif sans +
    .replace(/[\s\-+.() ]/g, '') // retirer séparateurs
  const hasNum  = NUMS_VALIDES.some(n => stripped.includes(n))
  const hasName = NOMS_VALIDES.some(n => texte.toLowerCase().includes(n))
  return { ok: hasNum || hasName, hasNum, hasName }
}

// Email simple via mailto (pas de clé nécessaire)
const notifierEmail = (email, nom, montant, objectif) => {
  const sujet = encodeURIComponent(`✅ Paiement validé — AWF's Members`)
  const corps = encodeURIComponent(
    `Bonjour ${nom},\n\nVotre paiement de ${montant.toLocaleString()} FCFA pour "${objectif}" a été validé avec succès.\n\nMerci pour votre contribution.\n\n— AWF's Members\nPowered by Olivier Martial KONO`
  )
  window.open(`mailto:${email}?subject=${sujet}&body=${corps}`, '_blank')
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
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
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

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
  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  )
}

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
      <input
        type={isPassword && show ? 'text' : type}
        value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', paddingRight: isPassword ? 42 : 14, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14 }}
        {...props}
      />
      {isPassword && (
        <span onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: t.textMuted }}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
        </span>
      )}
    </div>
  )
}

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

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
const AuthPage = ({ onAuth }) => {
  const [mode, setMode] = useState('login') // login | register
  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>{css}</style>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: t.accent, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 30 }}><img src="/logo.jpg" style={{width:58,height:58,objectFit:'contain',borderRadius:14}} /></div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>AWF's Members</h1>
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 6 }}>Gestion des cotisations & contributions</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: t.surface, borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {[['login', 'Connexion'], ['register', 'Inscription']].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: mode === m ? t.card : 'transparent', color: mode === m ? t.text : t.textMuted, fontWeight: mode === m ? 600 : 400, fontSize: 14, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
        {mode === 'login' ? <LoginForm onAuth={onAuth} /> : <RegisterForm onAuth={onAuth} setMode={setMode} />}
      </div>
    </div>
  )
}

const LoginForm = ({ onAuth }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) return setError('Remplissez tous les champs')
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : err.message); setLoading(false); return }
    // Fetch member profile
    const { data: membre } = await supabase.from('membres').select('*').eq('email', email).single()
    onAuth(data.user, membre)
    setLoading(false)
  }

  return (
    <div className="fade-in" style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" />
        </Field>
        <Field label="Mot de passe">
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </Field>
        {error && <div style={{ color: t.red, fontSize: 13, padding: '8px 12px', background: `${t.red}11`, borderRadius: 8 }}>{error}</div>}
        <Btn onClick={handleLogin} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <span className="spin"><Icon name="loader" size={16} color="#fff" /></span> : null}
          {loading ? 'Connexion...' : 'Se connecter'}
        </Btn>
      </div>
    </div>
  )
}

const RegisterForm = ({ onAuth, setMode }) => {
  const [form, setForm]       = useState({ nom: '', telephone: '', email: '', nom_utilisateur: '', password: '', confirm: '' })
  const [photo, setPhoto]     = useState(null)   // fichier
  const [photoPreview, setPhotoPreview] = useState(null) // URL preview
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const photoRef = useRef()
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]; if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRegister = async () => {
    if (!form.nom || !form.email || !form.password || !form.nom_utilisateur)
      return setError('Tous les champs marqués * sont obligatoires')
    if (form.password !== form.confirm)
      return setError('Les mots de passe ne correspondent pas')
    if (form.password.length < 6)
      return setError('Le mot de passe doit contenir au moins 6 caractères')

    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (err) { setError(err.message); setLoading(false); return }

    // Upload photo si fournie
    let photo_url = null
    if (photo) {
      try {
        const tmpId = Date.now()
        const { error: upErr } = await supabase.storage
          .from('photos')
          .upload(`reg_${tmpId}.jpg`, photo, { upsert: true, contentType: photo.type })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(`reg_${tmpId}.jpg`)
          photo_url = urlData?.publicUrl
        }
      } catch {}
    }

    const { error: err2 } = await supabase.from('membres').insert({
      nom: form.nom,
      telephone: form.telephone,
      email: form.email,
      nom_utilisateur: form.nom_utilisateur,
      statut: 'Actif',
      role: 'membre',
      photo_url,
    })
    if (err2) { setError(err2.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  if (success) return (
    <div className="fade-in" style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Inscription réussie !</h3>
      <p style={{ color: t.textMuted, fontSize: 14, marginBottom: 20 }}>Vérifiez votre email pour confirmer votre compte, puis connectez-vous.</p>
      <Btn onClick={() => setMode('login')} style={{ margin: '0 auto', justifyContent: 'center' }}>Aller à la connexion</Btn>
    </div>
  )

  return (
    <div className="fade-in" style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Photo optionnelle en haut */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
          <div
            onClick={() => photoRef.current.click()}
            style={{ width: 80, height: 80, borderRadius: 14, cursor: 'pointer', overflow: 'hidden', border: `2px dashed ${photoPreview ? t.accent : t.border}`, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>📷</div>
                  <div style={{ color: t.textDim, fontSize: 10, marginTop: 4 }}>Photo</div>
                </div>
            }
          </div>
          <div style={{ color: t.textDim, fontSize: 11 }}>Photo de profil — facultatif (4×4 ou selfie)</div>
          <input ref={photoRef} type="file" accept="image/*" capture="user" onChange={handlePhotoSelect} style={{ display: 'none' }} />
        </div>

        <Field label="Nom complet *"><Input value={form.nom} onChange={set('nom')} placeholder="Jean Dupont" /></Field>
        <Field label="Téléphone"><Input value={form.telephone} onChange={set('telephone')} placeholder="+237 6 99 00 00 00" /></Field>
        <Field label="Email *"><Input type="email" value={form.email} onChange={set('email')} placeholder="jean@email.com" /></Field>
        <Field label="Nom d'utilisateur *"><Input value={form.nom_utilisateur} onChange={set('nom_utilisateur')} placeholder="jean_dupont" /></Field>
        <Field label="Mot de passe * (min. 6 caractères)"><Input type="password" value={form.password} onChange={set('password')} /></Field>
        <Field label="Confirmer le mot de passe *"><Input type="password" value={form.confirm} onChange={set('confirm')} /></Field>
        {error && <div style={{ color: t.red, fontSize: 13, padding: '8px 12px', background: `${t.red}11`, borderRadius: 8 }}>{error}</div>}
        <Btn onClick={handleRegister} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <span className="spin"><Icon name="loader" size={16} color="#fff" /></span> : <Icon name="user" size={16} color="#fff" />}
          {loading ? 'Inscription...' : "S'inscrire"}
        </Btn>
      </div>
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const SidebarContent = ({ page, setPage, membre, onLogout, onClose }) => {
  const role = membre?.role || 'membre'
  const allItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard', roles: ['admin', 'gestionnaire'] },
    { id: 'members', label: 'Membres', icon: 'members', roles: ['admin', 'gestionnaire'] },
    { id: 'payments', label: 'Contributions', icon: 'payments', roles: ['admin', 'gestionnaire'] },
    { id: 'declare', label: 'Déclarer un paiement', icon: 'add', roles: ['admin', 'gestionnaire', 'membre'] },
    { id: 'myaccount', label: 'Mon compte', icon: 'user', roles: ['membre'] },
    { id: 'report', label: 'Rapport mensuel', icon: 'report', roles: ['admin'] },
  ]
  const items = allItems.filter(i => i.roles.includes(role))

  const handleNav = (id) => { setPage(id); if (onClose) onClose() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header logo */}
      <div style={{ padding: '20px 16px 20px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.jpg" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: t.text }}>AWF's Members</div>
            <div style={{ color: t.textMuted, fontSize: 11, marginTop: 1 }}>{membre?.nom || 'Utilisateur'}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><Badge status={role} /></div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {items.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => handleNav(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              marginBottom: 4,
              background: active ? `${t.accent}28` : 'transparent',
              color: active ? t.accentLight : t.textMuted,
              fontWeight: active ? 600 : 400, fontSize: 14,
              borderLeft: active ? `3px solid ${t.accent}` : '3px solid transparent',
              transition: 'all 0.18s ease',
            }}>
              <Icon name={item.icon} size={18} color={active ? t.accentLight : t.textMuted} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${t.border}` }}>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: t.textMuted, fontSize: 14, width: '100%', marginBottom: 12 }}>
          <Icon name="logout" size={18} color={t.textMuted} /> Déconnexion
        </button>
        <div style={{ textAlign: 'center', fontSize: 10, color: t.textDim, lineHeight: 1.5 }}>
          Powered by<br />
          <span style={{ color: t.accent, fontWeight: 600, fontSize: 11 }}>Olivier Martial KONO</span>
        </div>
      </div>
    </div>
  )
}

const Sidebar = ({ page, setPage, membre, onLogout, mobileOpen, onMobileClose }) => {
  return (
    <>
      {/* ── DESKTOP sidebar (toujours visible) ── */}
      <div className="desktop-sidebar" style={{
        width: 240, background: t.surface, borderRight: `1px solid ${t.border}`,
        minHeight: '100vh', flexShrink: 0, display: 'flex', flexDirection: 'column'
      }}>
        <SidebarContent page={page} setPage={setPage} membre={membre} onLogout={onLogout} />
      </div>

      {/* ── MOBILE drawer flottant ── */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay mobile-sidebar" onClick={onMobileClose} />
          <div className="mobile-sidebar sidebar-open" style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
            background: t.surface, zIndex: 100, display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
          }}>
            {/* Bouton fermer */}
            <button onClick={onMobileClose} style={{
              position: 'absolute', top: 14, right: 14, background: t.card,
              border: `1px solid ${t.border}`, borderRadius: 8, color: t.textMuted,
              width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1
            }}>✕</button>
            <SidebarContent page={page} setPage={setPage} membre={membre} onLogout={onLogout} onClose={onMobileClose} />
          </div>
        </>
      )}
    </>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, attente: 0, membres: 0 })
  const [contributions, setContributions] = useState([])
  const [objectifs, setObjectifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: contribs }, { count: memCount }, { data: objs }] = await Promise.all([
        supabase.from('contributions').select('*, membres(nom), objectifs(nom)').order('created_at', { ascending: false }).limit(6),
        supabase.from('membres').select('*', { count: 'exact', head: true }),
        supabase.from('objectifs').select('*, contributions(montant, statut)'),
      ])
      setContributions(contribs || [])
      setObjectifs(objs || [])
      const total = (contribs || []).filter(c => c.statut === 'Valide' || c.statut === 'Validé').reduce((s, c) => s + c.montant, 0)
      const attente = (contribs || []).filter(c => c.statut === 'En attente' || c.statut === 'A verifier').length
      setStats({ total, attente, membres: memCount || 0 })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 40, color: t.textMuted }}>Chargement...</div>

  return (
    <div className="fade-in" style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Tableau de bord</h2>
        <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>Vue d'ensemble — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total collecté (validé)" value={`${stats.total.toLocaleString()} F`} icon="payments" accent={t.green} />
        <StatCard label="En attente de validation" value={stats.attente} icon="scan" accent={t.yellow} />
        <StatCard label="Membres enregistrés" value={stats.membres} icon="members" accent={t.accent} />
      </div>

      {/* Objectifs progress */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Avancement par objectif</h3>
        {objectifs.filter(o => o.montant_cible > 0).map(obj => {
          const total = (obj.contributions || []).filter(c => c.statut === 'Valide' || c.statut === 'Validé').reduce((s, c) => s + c.montant, 0)
          const pct = Math.min(100, obj.montant_cible > 0 ? Math.round((total / obj.montant_cible) * 100) : 0)
          return (
            <div key={obj.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{obj.nom}</span>
                <span style={{ color: t.textMuted, fontSize: 12 }}>{total.toLocaleString()} / {obj.montant_cible.toLocaleString()} F — {pct}%</span>
              </div>
              <div style={{ height: 6, background: t.border, borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? t.green : t.accent, borderRadius: 3 }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Dernières contributions</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.surface }}>
              {['Membre', 'Objectif', 'Montant', 'Statut'].map(h => (
                <th key={h} style={{ color: t.textMuted, fontSize: 11, textAlign: 'left', padding: '12px 16px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contributions.map(c => (
              <tr key={c.id} style={{ borderTop: `1px solid ${t.border}` }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{c.membres?.nom || '—'}</td>
                <td style={{ padding: '12px 16px', color: t.textMuted, fontSize: 13 }}>{c.objectifs?.nom || '—'}</td>
                <td style={{ padding: '12px 16px', color: t.accentLight, fontSize: 13, fontWeight: 600 }}>{c.montant?.toLocaleString()} F</td>
                <td style={{ padding: '12px 16px' }}><Badge status={c.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MEMBERS PAGE ─────────────────────────────────────────────────────────────
const Members = () => {
  const [membres, setMembres] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase.from('membres').select('*').order('created_at', { ascending: false })
    setMembres(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleStatut = async (id, current) => {
    const next = current === 'Actif' ? 'Inactif' : 'Actif'
    await supabase.from('membres').update({ statut: next }).eq('id', id)
    load()
  }

  const setRole = async (id, role) => {
    await supabase.from('membres').update({ role }).eq('id', id)
    load()
  }

  if (loading) return <div style={{ padding: 40, color: t.textMuted }}>Chargement...</div>

  return (
    <div className="fade-in" style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Membres</h2>
        <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>{membres.length} membres enregistrés</p>
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.surface }}>
              {['Membre', 'Contact', 'Rôle', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ color: t.textMuted, fontSize: 11, textAlign: 'left', padding: '14px 16px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {membres.map(m => (
              <tr key={m.id} style={{ borderTop: `1px solid ${t.border}` }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: `${t.accent}33`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent, fontWeight: 700 }}>
                      {m.nom?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{m.nom}</div>
                      <div style={{ color: t.textMuted, fontSize: 11 }}>@{m.nom_utilisateur}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: t.textMuted, fontSize: 12 }}>
                  <div>{m.email}</div>
                  <div>{m.telephone}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <select value={m.role} onChange={e => setRole(m.id, e.target.value)} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 12, padding: '4px 8px' }}>
                    <option value="membre">membre</option>
                    <option value="gestionnaire">gestionnaire</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td style={{ padding: '14px 16px' }}><Badge status={m.statut} /></td>
                <td style={{ padding: '14px 16px' }}>
                  <button onClick={() => toggleStatut(m.id, m.statut)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.textMuted, fontSize: 12, cursor: 'pointer' }}>
                    {m.statut === 'Actif' ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── CONTRIBUTIONS PAGE ───────────────────────────────────────────────────────
const Contributions = () => {
  const [contribs, setContribs] = useState([])
  const [filter, setFilter] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    const { data } = await supabase
      .from('contributions')
      .select('*, membres(nom, email), objectifs(nom)')
      .order('created_at', { ascending: false })
    setContribs(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const validate = async (c) => {
    await supabase.from('contributions').update({ statut: 'Valide' }).eq('id', c.id)
    // Notifier le membre par email
    if (c.membres?.email) {
      notifierEmail(c.membres.email, c.membres.nom, c.montant, c.objectifs?.nom || 'contribution')
    }
    load()
  }

  const filtered = filter === 'Tous' ? contribs : contribs.filter(c => c.statut === filter || c.statut === filter.replace('é','e'))

  if (loading) return <div style={{ padding: 40, color: t.textMuted }}>Chargement...</div>

  return (
    <div className="fade-in" style={{ padding: '24px 16px', maxWidth: 1050 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700 }}>Contributions</h2>
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>{contribs.length} transactions</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Tous', 'Valide', 'En attente', 'A verifier'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '7px 13px', background: filter === s ? t.accent : 'transparent', border: `1px solid ${filter === s ? t.accent : t.border}`, borderRadius: 8, color: filter === s ? '#fff' : t.textMuted, fontSize: 12, fontWeight: filter === s ? 600 : 400, cursor: 'pointer' }}>
              {s === 'Valide' ? 'Validé' : s === 'A verifier' ? 'À vérifier' : s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
        {/* Vue mobile: cartes */}
        <div style={{ display: 'none' }} className="mobile-cards">
          {filtered.map(c => (
            <div key={c.id} style={{ padding: 16, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{c.membres?.nom}</span>
                <Badge status={c.statut} />
              </div>
              <div style={{ color: t.textMuted, fontSize: 12 }}>{c.objectifs?.nom} • {c.montant?.toLocaleString()} F • {c.date}</div>
              {c.note && <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>📝 {c.note}</div>}
              {c.preuve_texte && <div style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>💬 {c.preuve_texte.slice(0,80)}…</div>}
              {c.statut !== 'Valide' && c.statut !== 'Validé' && (
                <Btn variant="success" onClick={() => validate(c)} style={{ marginTop: 10, padding: '5px 12px', fontSize: 12 }}>
                  <Icon name="check" size={13} color={t.green} /> Valider + envoyer email
                </Btn>
              )}
            </div>
          ))}
        </div>

        {/* Vue desktop: tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.surface }}>
              {['Membre', 'Objectif', 'Montant', 'Mode', 'Date', 'Notes / Preuve', 'Statut', 'Action'].map(h => (
                <th key={h} style={{ color: t.textMuted, fontSize: 11, textAlign: 'left', padding: '12px 12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <>
                <tr key={c.id} style={{ borderTop: `1px solid ${t.border}`, cursor: c.preuve_texte ? 'pointer' : 'default' }}
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 500 }}>{c.membres?.nom || '—'}</td>
                  <td style={{ padding: '12px 12px', color: t.textMuted, fontSize: 12 }}>{c.objectifs?.nom || '—'}</td>
                  <td style={{ padding: '12px 12px', color: t.accentLight, fontSize: 13, fontWeight: 600 }}>{c.montant?.toLocaleString()} F</td>
                  <td style={{ padding: '12px 12px', color: t.textMuted, fontSize: 12 }}>{c.mode_paiement}</td>
                  <td style={{ padding: '12px 12px', color: t.textMuted, fontSize: 12 }}>{c.date}</td>
                  <td style={{ padding: '12px 12px', fontSize: 11, color: t.textMuted, maxWidth: 180 }}>
                    {c.note && <div style={{ marginBottom: 2 }}>📝 {c.note}</div>}
                    {c.preuve_texte && <div style={{ color: t.accent, fontSize: 11 }}>💬 Texte SMS ▾</div>}
                  </td>
                  <td style={{ padding: '12px 12px' }}><Badge status={c.statut} /></td>
                  <td style={{ padding: '12px 12px' }}>
                    {c.statut !== 'Valide' && c.statut !== 'Validé' && (
                      <Btn variant="success" onClick={e => { e.stopPropagation(); validate(c) }} style={{ padding: '5px 10px', fontSize: 11 }}>
                        <Icon name="check" size={12} color={t.green} /> Valider
                      </Btn>
                    )}
                  </td>
                </tr>
                {expanded === c.id && c.preuve_texte && (
                  <tr key={`${c.id}-exp`} style={{ background: `${t.surface}99` }}>
                    <td colSpan={8} style={{ padding: '10px 20px' }}>
                      <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '12px 14px', fontSize: 12, color: t.text, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        💬 Texte SMS fourni :<br/>{c.preuve_texte}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Aucune transaction</div>}
      </div>
    </div>
  )
}

// ─── DECLARE PAGE ─────────────────────────────────────────────────────────────
const Declare = ({ membreId }) => {
  const [membres, setMembres]       = useState([])
  const [form, setForm]             = useState({
    membre_id: membreId || '', objectif_nom: '', montant: '',
    date: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', note: ''
  })
  const [preuveMode, setPreuveMode] = useState('image') // 'image' | 'texte'
  const [image, setImage]           = useState(null)
  const [imageB64, setImageB64]     = useState(null)
  const [preuveTexte, setPreuveTexte] = useState('')
  const [ocr, setOcr]               = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [validationPreuve, setValidationPreuve] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [sent, setSent]             = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('membres').select('id, nom').then(({ data }) => setMembres(data || []))
  }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    setImage(URL.createObjectURL(file))
    setOcr(null); setValidationPreuve(null)
    const reader = new FileReader()
    reader.onload = ev => setImageB64(ev.target.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  // Vérifier texte SMS en temps réel
  const handleTexteChange = (val) => {
    setPreuveTexte(val)
    if (val.length > 10) {
      const result = validerPreuve(val)
      setValidationPreuve(result)
      // Détecter opérateur
      const numMatch = val.match(/\b(6[579]\d{7}|6[50-3]\d{7})\b/)
      if (numMatch) {
        const op = detectOperateur(numMatch[0])
        if (op) setForm(f => ({ ...f, mode_paiement: op }))
      }
    }
  }

  const analyzeOCR = async () => {
    if (preuveMode === 'image' && !imageB64) return
    if (preuveMode === 'texte' && !preuveTexte) return
    setOcrLoading(true)
    try {
      let messages
      if (preuveMode === 'image') {
        messages = [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
          { type: 'text', text: `Analyse cette capture de paiement Mobile Money camerounais.
Vérifie si le destinataire contient "Ronald LEUMENI NYA" (699201466) ou "NGO Laeticia" / "Laeticia NGO" (657790272 / +237657790272).
Retourne UNIQUEMENT du JSON sans markdown:
{"montant": nombre|null, "devise": "FCFA", "reference": string|null, "expediteur": string|null, "recepteur": string|null, "numero_recepteur": string|null, "date": string|null, "mode": "Orange Money"|"MTN MoMo"|"Cash"|"Autre", "destinataire_valide": true|false, "confiance": "haute"|"moyenne"|"faible"}` }
        ]}]
      } else {
        messages = [{ role: 'user', content:
          `Analyse ce message SMS de confirmation de paiement Mobile Money camerounais:\n\n${preuveTexte}\n\n` +
          `Vérifie si le destinataire contient "Ronald LEUMENI NYA" (699201466) ou "NGO Laeticia" / "Laeticia NGO" (657790272).\n` +
          `Retourne UNIQUEMENT du JSON sans markdown:\n{"montant": nombre|null, "devise": "FCFA", "reference": string|null, "expediteur": string|null, "recepteur": string|null, "numero_recepteur": string|null, "date": string|null, "mode": "Orange Money"|"MTN MoMo"|"Cash"|"Autre", "destinataire_valide": true|false, "confiance": "haute"|"moyenne"|"faible"}`
        }]
      }

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages })
      })
      const data = await resp.json()
      const text = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(text)
      setOcr(parsed)

      // Valider preuve (double vérification)
      const textToCheck = preuveMode === 'texte' ? preuveTexte : (parsed.recepteur || '') + ' ' + (parsed.numero_recepteur || '')
      const v = validerPreuve(textToCheck)
      setValidationPreuve({ ok: v.ok || parsed.destinataire_valide })

      if (parsed.montant && !form.montant) setForm(f => ({ ...f, montant: String(parsed.montant), mode_paiement: parsed.mode || 'Mobile Money' }))
      if (parsed.mode) setForm(f => ({ ...f, mode_paiement: parsed.mode }))
    } catch { setOcr({ confiance: 'faible', destinataire_valide: false }) }
    setOcrLoading(false)
  }

  const submit = async () => {
    if (!form.membre_id || !form.objectif_nom || !form.montant) return
    setLoading(true)

    const montant     = Number(form.montant)
    const ocrMontant  = ocr?.montant
    const coherent    = !ocrMontant || Math.abs(montant - ocrMontant) < 10
    const preuveOk    = validationPreuve?.ok

    // Statut selon preuve
    let statut = 'En attente'
    if (preuveMode === 'image' && imageB64) {
      statut = (coherent && preuveOk) ? 'Valide' : 'A verifier'
    } else if (preuveMode === 'texte' && preuveTexte) {
      statut = preuveOk ? 'Valide' : 'A verifier'
    }

    // Chercher ou créer l'objectif
    let { data: obj } = await supabase.from('objectifs').select('id').eq('nom', form.objectif_nom).single()
    if (!obj) {
      const montantCible = OBJECTIFS_AWF.find(o => o.nom === form.objectif_nom)?.montant || 0
      const { data: newObj } = await supabase.from('objectifs').insert({ nom: form.objectif_nom, montant_cible: montantCible, est_fixe: montantCible > 0 }).select('id').single()
      obj = newObj
    }

    await supabase.from('contributions').insert({
      membre_id:     form.membre_id,
      objectif_id:   obj?.id,
      montant,
      date:          form.date,
      mode_paiement: form.mode_paiement,
      statut,
      note:          form.note,
      preuve_texte:  preuveMode === 'texte' ? preuveTexte : null,
    })

    setLoading(false); setSent(true)
    setTimeout(() => {
      setSent(false)
      setForm({ membre_id: membreId || '', objectif_nom: '', montant: '', date: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', note: '' })
      setImage(null); setImageB64(null); setPreuveTexte(''); setOcr(null); setValidationPreuve(null)
    }, 3000)
  }

  if (sent) return (
    <div className="fade-in" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 70, height: 70, background: `${t.green}22`, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon name="check" size={32} color={t.green} />
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Déclaration envoyée !</h3>
      <p style={{ color: t.textMuted, marginTop: 8 }}>Votre paiement a été enregistré.</p>
    </div>
  )

  const objActuel = OBJECTIFS_AWF.find(o => o.nom === form.objectif_nom)

  return (
    <div className="fade-in" style={{ padding: '24px 16px', maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700 }}>Déclarer un paiement</h2>
        <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>Enregistrez votre contribution avec preuve</p>
      </div>

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Membre + Objectif */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Membre *">
            <select value={form.membre_id} onChange={e => setForm({...form, membre_id: e.target.value})}
              style={{ width:'100%', padding:'11px 14px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:14 }}>
              <option value="">Sélectionner...</option>
              {membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </Field>
          <Field label="Type de cotisation *">
            <select value={form.objectif_nom} onChange={e => {
              const obj = OBJECTIFS_AWF.find(o => o.nom === e.target.value)
              setForm({...form, objectif_nom: e.target.value, montant: obj?.montant > 0 ? String(obj.montant) : form.montant})
            }} style={{ width:'100%', padding:'11px 14px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:14 }}>
              <option value="">Sélectionner...</option>
              {OBJECTIFS_AWF.map(o => <option key={o.nom} value={o.nom}>{o.nom}{o.montant > 0 ? ` — ${o.montant.toLocaleString()} F` : ''}</option>)}
            </select>
          </Field>
        </div>

        {/* Montant + Date + Mode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Montant (FCFA) *">
            <Input type="number" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
              placeholder={objActuel?.montant > 0 ? objActuel.montant : '5000'} />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </Field>
          <Field label="Opérateur">
            <select value={form.mode_paiement} onChange={e => setForm({...form, mode_paiement: e.target.value})}
              style={{ width:'100%', padding:'11px 14px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:14 }}>
              <option>Mobile Money</option><option>Orange Money</option><option>MTN MoMo</option><option>Cash</option>
            </select>
          </Field>
        </div>

        {/* Note */}
        <Field label="Note / Détails (optionnel)">
          <Input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Ex: cotisation mars 2025, match vs ABC..." />
        </Field>

        {/* Choix du mode de preuve */}
        <div>
          <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Preuve de paiement</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['image', '📷 Capture d\'écran'], ['texte', '💬 Texte SMS']].map(([m, l]) => (
              <button key={m} onClick={() => setPreuveMode(m)} style={{
                padding: '8px 16px', borderRadius: 10, border: `1px solid ${preuveMode === m ? t.accent : t.border}`,
                background: preuveMode === m ? `${t.accent}22` : 'transparent',
                color: preuveMode === m ? t.accentLight : t.textMuted, fontSize: 13, cursor: 'pointer', fontWeight: preuveMode === m ? 600 : 400
              }}>{l}</button>
            ))}
          </div>

          {/* Mode image */}
          {preuveMode === 'image' && (
            <>
              <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${image ? t.accent : t.border}`, borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: image ? `${t.accent}08` : 'transparent' }}>
                {image ? (
                  <>
                    <img src={image} alt="preuve" style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ color: t.accent, fontSize: 12 }}>Image chargée — cliquez pour changer</div>
                  </>
                ) : (
                  <>
                    <Icon name="upload" size={24} color={t.textDim} />
                    <div style={{ color: t.textMuted, fontSize: 13, marginTop: 8 }}>Glissez ou cliquez pour uploader la capture</div>
                    <div style={{ color: t.textDim, fontSize: 11, marginTop: 4 }}>Destinataire : Ronald LEUMENI NYA (699201466) ou Laeticia NGO (657790272)</div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </>
          )}

          {/* Mode texte */}
          {preuveMode === 'texte' && (
            <>
              <textarea value={preuveTexte} onChange={e => handleTexteChange(e.target.value)}
                placeholder={`Collez ici le texte du SMS de confirmation.\nEx: Vous avez envoye 5000 FCFA a Ronald LEUMENI NYA (699201466). Ref: TXN123456`}
                rows={5} style={{ width: '100%', padding: '11px 14px', background: t.surface, border: `1px solid ${validationPreuve ? (validationPreuve.ok ? t.green : t.red) : t.border}`, borderRadius: 8, color: t.text, fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
              {preuveTexte.length > 10 && validationPreuve && (
                <div className="fade-in" style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: validationPreuve.ok ? `${t.green}15` : `${t.red}15`, border: `1px solid ${validationPreuve.ok ? t.green : t.red}33` }}>
                  <span style={{ color: validationPreuve.ok ? t.green : t.red, fontSize: 13 }}>
                    {validationPreuve.ok ? '✅ Destinataire reconnu — preuve valide' : '⚠️ Destinataire non reconnu — le SMS doit mentionner Ronald LEUMENI NYA (699201466) ou Laeticia NGO (657790272 / +237 6 57 79 02 72)'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bouton analyse IA */}
        {((preuveMode === 'image' && imageB64) || (preuveMode === 'texte' && preuveTexte.length > 20)) && (
          <Btn variant="ghost" onClick={analyzeOCR} disabled={ocrLoading}>
            {ocrLoading ? <span className="spin"><Icon name="loader" size={16} /></span> : <Icon name="scan" size={16} />}
            {ocrLoading ? 'Analyse IA en cours...' : '🔍 Analyser la preuve avec l\'IA'}
          </Btn>
        )}

        {/* Résultat OCR */}
        {ocr && (
          <div className="fade-in" style={{ background: t.surface, border: `1px solid ${ocr.destinataire_valide ? t.green : t.yellow}55`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: ocr.destinataire_valide ? t.green : t.yellow }}>
              {ocr.destinataire_valide ? '✅ Destinataire validé par l\'IA' : '⚠️ Destinataire non confirmé — vérification manuelle requise'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                ['Montant', ocr.montant ? `${ocr.montant?.toLocaleString()} F` : '—'],
                ['Mode', ocr.mode || '—'],
                ['Référence', ocr.reference || '—'],
                ['Expéditeur', ocr.expediteur || '—'],
                ['Récepteur', ocr.recepteur || '—'],
                ['Confiance', ocr.confiance || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ color: t.textMuted, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Btn onClick={submit} disabled={loading || !form.membre_id || !form.objectif_nom || !form.montant} style={{ alignSelf: 'flex-start' }}>
          {loading ? <span className="spin"><Icon name="loader" size={16} color="#fff" /></span> : <Icon name="send" size={16} color="#fff" />}
          {loading ? 'Envoi...' : 'Envoyer la déclaration'}
        </Btn>
      </div>
    </div>
  )
}
  const [membres, setMembres] = useState([])
  const [objectifs, setObjectifs] = useState([])
  const [form, setForm] = useState({ membre_id: membreId || '', objectif_id: '', montant: '', date: new Date().toISOString().split('T')[0], mode_paiement: 'Cash', note: '' })
  const [image, setImage] = useState(null)
  const [imageB64, setImageB64] = useState(null)
  const [ocr, setOcr] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('membres').select('id, nom').then(({ data }) => setMembres(data || []))
    supabase.from('objectifs').select('*').then(({ data }) => setObjectifs(data || []))
  }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    setImage(URL.createObjectURL(file))
    setOcr(null)
    const reader = new FileReader()
    reader.onload = (ev) => setImageB64(ev.target.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const analyzeOCR = async () => {
    if (!imageB64) return
    setOcrLoading(true)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 800,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
            { type: 'text', text: 'Analyse cette capture SMS ou preuve de paiement. Retourne uniquement du JSON sans markdown: {"montant": nombre|null, "devise": "FCFA", "reference": string|null, "expediteur": string|null, "date": string|null, "mode": "Mobile Money"|"Orange Money"|"MTN MoMo"|"Cash"|"Autre", "confiance": "haute"|"moyenne"|"faible"}' }
          ]}]
        })
      })
      const data = await resp.json()
      const text = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setOcr(parsed)
      if (parsed.montant && !form.montant) setForm(f => ({ ...f, montant: String(parsed.montant), mode_paiement: parsed.mode || 'Mobile Money' }))
    } catch { setOcr({ confiance: 'faible', mode: 'Autre' }) }
    setOcrLoading(false)
  }

  const submit = async () => {
    if (!form.membre_id || !form.objectif_id || !form.montant) return
    setLoading(true)
    const montant = Number(form.montant)
    const ocrMontant = ocr?.montant
    const coherent = !ocrMontant || Math.abs(montant - ocrMontant) < 10
    const statut = image ? (coherent ? 'Valide' : 'A verifier') : 'En attente'

    await supabase.from('contributions').insert({
      membre_id: form.membre_id,
      objectif_id: form.objectif_id,
      montant, date: form.date,
      mode_paiement: form.mode_paiement,
      statut, note: form.note
    })
    setLoading(false)
    setSent(true)
    setTimeout(() => { setSent(false); setForm({ membre_id: membreId || '', objectif_id: '', montant: '', date: new Date().toISOString().split('T')[0], mode_paiement: 'Cash', note: '' }); setImage(null); setImageB64(null); setOcr(null) }, 3000)
  }

  if (sent) return (
    <div className="fade-in" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 70, height: 70, background: `${t.green}22`, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon name="check" size={32} color={t.green} />
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Déclaration envoyée !</h3>
      <p style={{ color: t.textMuted, marginTop: 8 }}>Votre paiement a été enregistré avec succès.</p>
    </div>
  )

  return (
    <div className="fade-in" style={{ padding: 32, maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Déclarer un paiement</h2>
        <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>Enregistrez votre contribution avec preuve</p>
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Membre *">
            <select value={form.membre_id} onChange={e => setForm({ ...form, membre_id: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14 }}>
              <option value="">Sélectionner...</option>
              {membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </Field>
          <Field label="Objectif *">
            <select value={form.objectif_id} onChange={e => setForm({ ...form, objectif_id: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14 }}>
              <option value="">Sélectionner...</option>
              {objectifs.map(o => <option key={o.id} value={o.id}>{o.nom}{o.montant_cible > 0 ? ` (${o.montant_cible.toLocaleString()} F)` : ' (variable)'}</option>)}
            </select>
          </Field>
          <Field label="Montant (FCFA) *">
            <Input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} placeholder="5000" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Mode de paiement">
            <select value={form.mode_paiement} onChange={e => setForm({ ...form, mode_paiement: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14 }}>
              <option>Cash</option><option>Mobile Money</option><option>Orange Money</option><option>MTN MoMo</option>
            </select>
          </Field>
          <Field label="Note (optionnel)">
            <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Remarque..." />
          </Field>
        </div>

        <Field label="Capture SMS / Preuve de paiement">
          <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${image ? t.accent : t.border}`, borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', background: image ? `${t.accent}08` : 'transparent' }}>
            {image ? (
              <div>
                <img src={image} alt="preuve" style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, marginBottom: 10 }} />
                <div style={{ color: t.accent, fontSize: 13 }}>Image chargée — cliquez pour changer</div>
              </div>
            ) : (
              <div>
                <Icon name="upload" size={26} color={t.textDim} />
                <div style={{ color: t.textMuted, fontSize: 13, marginTop: 8 }}>Glissez ou cliquez pour uploader</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </Field>

        {imageB64 && (
          <Btn variant="ghost" onClick={analyzeOCR} disabled={ocrLoading}>
            {ocrLoading ? <span className="spin"><Icon name="loader" size={16} /></span> : <Icon name="scan" size={16} />}
            {ocrLoading ? 'Analyse IA en cours...' : '🔍 Analyser la capture avec l\'IA'}
          </Btn>
        )}

        {ocr && (
          <div className="fade-in" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.green }}>✅ Résultat de l'analyse IA</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[['Montant', ocr.montant ? `${ocr.montant?.toLocaleString()} F` : '—'], ['Mode', ocr.mode || '—'], ['Référence', ocr.reference || '—'], ['Expéditeur', ocr.expediteur || '—'], ['Date SMS', ocr.date || '—'], ['Confiance', ocr.confiance || '—']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ color: t.textMuted, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Btn onClick={submit} disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? <span className="spin"><Icon name="loader" size={16} color="#fff" /></span> : <Icon name="send" size={16} color="#fff" />}
          {loading ? 'Envoi...' : 'Envoyer la déclaration'}
        </Btn>
      </div>
    </div>
  )
}

// ─── MY ACCOUNT ───────────────────────────────────────────────────────────────
const MyAccount = ({ membre }) => {
  const [contribs, setContribs]   = useState([])
  const [photoUrl, setPhotoUrl]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef()

  useEffect(() => {
    if (membre?.id) {
      supabase.from('contributions').select('*, objectifs(nom)')
        .eq('membre_id', membre.id).order('created_at', { ascending: false })
        .then(({ data }) => setContribs(data || []))
    }
    // Charger photo de profil
    if (membre?.photo_url) setPhotoUrl(membre.photo_url)
    else {
      supabase.storage.from('photos').getPublicUrl(`membre_${membre?.id}.jpg`)
        .then(({ data }) => { if (data?.publicUrl) setPhotoUrl(data.publicUrl + '?t=' + Date.now()) })
    }
  }, [membre])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { error } = await supabase.storage
        .from('photos')
        .upload(`membre_${membre.id}.jpg`, file, { upsert: true, contentType: file.type })
      if (!error) {
        const { data } = supabase.storage.from('photos').getPublicUrl(`membre_${membre.id}.jpg`)
        const url = data.publicUrl + '?t=' + Date.now()
        setPhotoUrl(url)
        await supabase.from('membres').update({ photo_url: url }).eq('id', membre.id)
      }
    } catch {}
    setUploading(false)
  }

  const total = contribs.filter(c => c.statut === 'Valide' || c.statut === 'Validé').reduce((s, c) => s + c.montant, 0)

  return (
    <div className="fade-in" style={{ padding: '24px 16px', maxWidth: 700 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Mon compte</h2>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* Avatar cliquable */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => photoRef.current.click()}>
            {photoUrl ? (
              <img src={photoUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: `2px solid ${t.accent}` }} />
            ) : (
              <div style={{ width: 64, height: 64, background: `${t.accent}33`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent, fontWeight: 700, fontSize: 26, border: `2px dashed ${t.accent}55` }}>
                {membre?.nom?.charAt(0) || '?'}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: -4, right: -4, background: t.accent, borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? <span className="spin" style={{ transform: 'scale(0.6)' }}><Icon name="loader" size={12} color="#fff" /></span> : <Icon name="upload" size={11} color="#fff" />}
            </div>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{membre?.nom}</div>
            <div style={{ color: t.textMuted, fontSize: 13 }}>@{membre?.nom_utilisateur}</div>
            <div style={{ color: t.textMuted, fontSize: 13 }}>{membre?.email}</div>
            <div style={{ color: t.textDim, fontSize: 11, marginTop: 2 }}>Cliquez sur la photo pour changer</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard label="Total versé (validé)" value={`${total.toLocaleString()} F`} icon="payments" accent={t.green} />
          <StatCard label="Contributions" value={contribs.length} icon="target" accent={t.accent} />
        </div>
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Historique de mes contributions</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: t.surface }}>
            {['Objectif', 'Montant', 'Note', 'Date', 'Statut'].map(h =>
              <th key={h} style={{ color: t.textMuted, fontSize: 11, textAlign: 'left', padding: '11px 14px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {contribs.map(c => (
              <tr key={c.id} style={{ borderTop: `1px solid ${t.border}` }}>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>{c.objectifs?.nom}</td>
                <td style={{ padding: '11px 14px', color: t.accentLight, fontWeight: 600, fontSize: 13 }}>{c.montant?.toLocaleString()} F</td>
                <td style={{ padding: '11px 14px', color: t.textMuted, fontSize: 12 }}>{c.note || <span style={{ color: t.textDim }}>—</span>}</td>
                <td style={{ padding: '11px 14px', color: t.textMuted, fontSize: 12 }}>{c.date}</td>
                <td style={{ padding: '11px 14px' }}><Badge status={c.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {contribs.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t.textMuted }}>Aucune contribution enregistrée</div>}
      </div>
    </div>
  )
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
const dernierVendrediDuMois = (annee, mois) => {
  // mois: 0-indexé
  const derJour = new Date(annee, mois + 1, 0)
  const decal = derJour.getDay() === 0 ? 1 : derJour.getDay() >= 5 ? derJour.getDay() - 5 : derJour.getDay() + 2
  derJour.setDate(derJour.getDate() - (derJour.getDay() === 5 ? 0 : derJour.getDay() === 6 ? 1 : derJour.getDay() + 2))
  // Recompute properly
  let d = new Date(annee, mois + 1, 0)
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1)
  return d
}

const Report = () => {
  const [report, setReport]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [sending, setSending]     = useState(false)

  const now       = new Date()
  const vendredi  = dernierVendrediDuMois(now.getFullYear(), now.getMonth())
  const joursAvant = Math.ceil((vendredi - now) / (1000 * 60 * 60 * 24))
  const estAujourdhuiVendredi = vendredi.toDateString() === now.toDateString()

  const generate = async () => {
    setLoading(true)
    const { data: membres } = await supabase
      .from('membres')
      .select('*, contributions(montant, statut, note, objectifs(nom))')
    const mois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const data = membres?.map(m => {
      const valides = (m.contributions || []).filter(c => c.statut === 'Valide' || c.statut === 'Validé')
      const totalPaye = valides.reduce((s, c) => s + c.montant, 0)
      const notes = valides.map(c => c.note).filter(Boolean).join(', ')
      const details = valides.map(c => `${c.objectifs?.nom || '—'}: ${c.montant?.toLocaleString()} F${c.note ? ` (${c.note})` : ''}`).join(' | ')
      return { ...m, totalPaye, aJour: totalPaye >= 2500, notes, details }
    }) || []
    const totalCollecte = data.reduce((s, m) => s + m.totalPaye, 0)
    setReport({ membres: data, totalCollecte, totalAttendu: data.length * 2500, mois })
    setLoading(false)
  }

  const envoyerRappels = async () => {
    if (!report) return
    setSending(true)
    for (const m of report.membres) {
      if (!m.email) continue
      const sujet = encodeURIComponent(`📊 Rapport mensuel AWF — ${report.mois}`)
      const manque = Math.max(0, 2500 - m.totalPaye)
      const corps = encodeURIComponent(
        m.aJour
          ? `Bonjour ${m.nom},\n\n✅ Vous êtes à jour pour ${report.mois} !\nTotal versé : ${m.totalPaye.toLocaleString()} FCFA\n${m.details ? `Détails : ${m.details}` : ''}\n\nMerci pour votre fidélité.\n\n— AWF's Members\nPowered by Olivier Martial KONO`
          : `Bonjour ${m.nom},\n\n⚠️ Il vous manque ${manque.toLocaleString()} FCFA pour ${report.mois}.\nDéjà versé : ${m.totalPaye.toLocaleString()} FCFA\nRestant : ${manque.toLocaleString()} FCFA\n\nMerci de régulariser au plus vite.\n\n— AWF's Members\nPowered by Olivier Martial KONO`
      )
      window.open(`mailto:${m.email}?subject=${sujet}&body=${corps}`, '_blank')
      await new Promise(r => setTimeout(r, 300)) // délai entre ouvertures
    }
    setSending(false)
  }

  return (
    <div className="fade-in" style={{ padding: '24px 16px', maxWidth: 960 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700 }}>Rapport mensuel</h2>
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>État financier de l'association</p>
        </div>
        <Btn onClick={generate} disabled={loading}>
          {loading ? <span className="spin"><Icon name="loader" size={16} color="#fff" /></span> : <Icon name="report" size={16} color="#fff" />}
          {loading ? 'Génération...' : 'Générer le rapport'}
        </Btn>
      </div>

      {/* Rappel dernier vendredi */}
      <div style={{ background: estAujourdhuiVendredi ? `${t.green}18` : `${t.accent}12`, border: `1px solid ${estAujourdhuiVendredi ? t.green : t.accent}44`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>{estAujourdhuiVendredi ? '📅' : '⏰'}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: estAujourdhuiVendredi ? t.green : t.accentLight }}>
            {estAujourdhuiVendredi ? "C'est aujourd'hui le dernier vendredi du mois — envoyez les rappels !" : `Prochain envoi automatique : ${vendredi.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} (dans ${joursAvant} jour${joursAvant > 1 ? 's' : ''})`}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Rappels envoyés par email chaque dernier vendredi du mois</div>
        </div>
      </div>

      {!report && <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 60, textAlign: 'center', color: t.textMuted }}>
        <Icon name="report" size={40} color={t.textDim} />
        <div style={{ marginTop: 14 }}>Cliquez sur "Générer" pour calculer la situation de chaque membre</div>
      </div>}

      {report && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="Total collecté" value={`${report.totalCollecte.toLocaleString()} F`} icon="payments" accent={t.green} />
            <StatCard label="Total attendu" value={`${report.totalAttendu.toLocaleString()} F`} icon="target" accent={t.accent} />
            <StatCard label="Membres à jour" value={`${report.membres.filter(m => m.aJour).length}/${report.membres.length}`} icon="check" accent={t.green} />
          </div>

          {/* Bouton envoi rappels */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <Btn onClick={envoyerRappels} disabled={sending} variant="ghost">
              {sending ? <span className="spin"><Icon name="loader" size={15} /></span> : <Icon name="send" size={15} />}
              {sending ? 'Envoi...' : `Envoyer les rappels (${report.membres.length} membres)`}
            </Btn>
          </div>

          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'auto' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>État par membre — {report.mois}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead><tr style={{ background: t.surface }}>
                {['Membre', 'Payé', 'Attendu', 'Solde', 'Détails & Notes', 'Statut'].map(h =>
                  <th key={h} style={{ color: t.textMuted, fontSize: 11, textAlign: 'left', padding: '11px 14px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {report.membres.map(m => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td style={{ padding: '12px 14px', fontWeight: 500, fontSize: 13 }}>{m.nom}</td>
                    <td style={{ padding: '12px 14px', color: t.accentLight, fontWeight: 600, fontSize: 13 }}>{m.totalPaye.toLocaleString()} F</td>
                    <td style={{ padding: '12px 14px', color: t.textMuted, fontSize: 13 }}>2 500 F</td>
                    <td style={{ padding: '12px 14px', color: m.aJour ? t.green : t.red, fontWeight: 600, fontSize: 13 }}>
                      {m.aJour ? '✓ Soldé' : `${(2500 - m.totalPaye).toLocaleString()} F restants`}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textMuted, maxWidth: 260 }}>
                      {m.details || <span style={{ color: t.textDim }}>—</span>}
                    </td>
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
  const [user, setUser] = useState(null)
  const [membre, setMembre] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [checking, setChecking] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [prevPage, setPrevPage] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: m } = await supabase.from('membres').select('*').eq('email', session.user.email).single()
        setUser(session.user)
        setMembre(m)
        setPage(m?.role === 'membre' ? 'myaccount' : 'dashboard')
      }
      setChecking(false)
    })
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); setMembre(null) }
    })
  }, [])

  const handleAuth = (u, m) => {
    setUser(u); setMembre(m)
    setPage(m?.role === 'membre' ? 'myaccount' : 'dashboard')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null); setMembre(null); setPage('dashboard')
  }

  const handleSetPage = (p) => {
    setPrevPage(page)
    setPage(p)
    setSidebarOpen(false)
  }

  const pageTitles = {
    dashboard: 'Tableau de bord', members: 'Membres',
    payments: 'Contributions', declare: 'Déclarer un paiement',
    myaccount: 'Mon compte', report: 'Rapport mensuel',
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{css}</style>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.jpg" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 16, borderRadius: 12 }} />
        <div style={{ color: t.textMuted }}>Chargement...</div>
      </div>
    </div>
  )

  if (!user) return <AuthPage onAuth={handleAuth} />

  const role = membre?.role || 'membre'
  const pages = {
    dashboard: <Dashboard />,
    members: <Members />,
    payments: <Contributions />,
    declare: <Declare membreId={membre?.id} />,
    myaccount: <MyAccount membre={membre} />,
    report: <Report />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: t.bg }}>
      <style>{css}</style>

      {/* ── SIDEBAR (desktop fixe / mobile drawer) ── */}
      <Sidebar
        page={page} setPage={handleSetPage}
        membre={membre} onLogout={handleLogout}
        mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)}
      />

      {/* ── CONTENU PRINCIPAL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* Barre du haut mobile */}
        <div className="mobile-topbar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 56, background: t.surface,
          borderBottom: `1px solid ${t.border}`, flexShrink: 0, position: 'sticky', top: 0, zIndex: 50
        }}>
          {/* Bouton hamburger */}
          <button onClick={() => setSidebarOpen(true)} style={{
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
            width: 40, height: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5
          }}>
            <div style={{ width: 18, height: 2, background: t.accent, borderRadius: 2 }} />
            <div style={{ width: 14, height: 2, background: t.textMuted, borderRadius: 2 }} />
            <div style={{ width: 18, height: 2, background: t.accent, borderRadius: 2 }} />
          </button>

          {/* Titre page courante */}
          <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>
            {pageTitles[page] || 'AWF Members'}
          </span>

          {/* Logo miniature */}
          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden' }}>
            <img src="/logo.jpg" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Page avec transition */}
        <main key={page} className="page-transition" style={{ flex: 1, overflowY: 'auto' }}>
          {pages[page] || pages.dashboard}
        </main>

        {/* ── FOOTER "Powered by" toujours visible ── */}
        <div style={{
          textAlign: 'center', padding: '10px 16px',
          borderTop: `1px solid ${t.border}`,
          background: t.surface, flexShrink: 0,
          fontSize: 11, color: t.textDim, letterSpacing: 0.3
        }}>
          Powered by{' '}
          <span style={{ color: t.accent, fontWeight: 700 }}>Olivier Martial KONO</span>
          {' '}·{' '}
          <span style={{ color: t.textDim }}>AWF's Members © 2025</span>
        </div>
      </div>
    </div>
  )
}
