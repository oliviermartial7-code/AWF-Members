// App.jsx — version nettoyée
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js' // vérifiez que ce fichier exporte bien un client supabase

// THEME (inchangé)
const t = {
  bg: '#0D1420', surface: '#111B30', card: '#172040', border: '#243060',
  accent: '#F26522', accentLight: '#FF8C4A', green: '#2ECC8A',
  red: '#E85555', yellow: '#F0C040', text: '#EAF0FF',
  textMuted: '#8A9AC8', textDim: '#3A4870',
}

const css = `
  /* ... (la même CSS que dans votre fichier original) ... */
`

// CONSTANTES
const OBJECTIFS_AWF = [
  { nom: 'Cotisation mensuelle', montant: 2500 },
  { nom: 'Secours', montant: 5000 },
  { nom: 'Main levée', montant: 2500 },
  { nom: "On reçoit une équipe", montant: 5000 },
  { nom: "On est reçu par une équipe", montant: 2500 },
  { nom: "Avance sur cotisation", montant: 0 },
  { nom: "Cotisation évènement heureux", montant: 2500 },
  { nom: "Cotisation évènement malheureux", montant: 5000 },
  { nom: "Sanction", montant: 0 },
  { nom: "Aide", montant: 0 },
]

const NUMS_VALIDES = ['699201466', '657790272']
const NOMS_VALIDES = ['ronald leumeni', 'leumeni nya', 'ronald', 'leumeni', 'laeticia ngo', 'ngo laeticia', 'laeticia']

const detectOperateur = (num = '') => {
  const n = num.replace(/[\s+\-().]/g, '').replace(/^237/, '')
  if (/^(69|655|656|657|658|659)/.test(n)) return 'Orange Money'
  if (/^(67|650|651|652|653)/.test(n)) return 'MTN MoMo'
  return null
}

const validerPreuve = (texte = '') => {
  const stripped = texte.toLowerCase()
    .replace(/\+237/g, '')
    .replace(/237/g, '')
    .replace(/[\s\-+.()]/g, '')
  const hasNum = NUMS_VALIDES.some(n => stripped.includes(n))
  const hasName = NOMS_VALIDES.some(n => texte.toLowerCase().includes(n))
  return { ok: hasNum || hasName, hasNum, hasName }
}

const notifierEmail = (email, nom, montant, objectif) => {
  const sujet = encodeURIComponent(`✅ Paiement validé — AWF's Members`)
  const corps = encodeURIComponent(
    `Bonjour ${nom},\n\nVotre paiement de ${Number(montant).toLocaleString()} FCFA pour "${objectif}" a été validé.\n\nMerci.\n\n— AWF's Members`
  )
  window.open(`mailto:${email}?subject=${sujet}&body=${corps}`, '_blank')
}

/* ------------------ petits composants (Icon/Badge/Btn/Input/Field/StatCard) ------------------ */
/* Copiez ici vos composants Icon, Badge, Btn, Field, Input, StatCard (inchangés ou lég. simplifiés) */
/* Pour gagner de la place, on suppose que vous copiez exactement vos composants actuels. */
/* ... (Icon, Badge, Btn, Field, Input, StatCard) ... */

/* ------------------ AUTH: Login / Register ------------------ */
const LoginForm = ({ onAuth }) => {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false), [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Remplissez tous les champs'); return }
    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      const { data: membre } = await supabase.from('membres').select('*').eq('email', email).single().catch(() => ({ data: null }))
      onAuth(data.user, membre)
    } catch (e) {
      setError(e.message?.includes('Invalid login credentials') ? 'Email ou mot de passe incorrect' : (e.message || 'Erreur'))
    } finally { setLoading(false) }
  }

  return (
    <div className="fade-in" style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: 28 }}>
      {/* ... UI identique ... */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Mot de passe"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} /></Field>
        {error && <div style={{ color: t.red }}>{error}</div>}
        <Btn onClick={handleLogin} disabled={loading} style={{ width: '100%' }}>{loading ? 'Connexion...' : 'Se connecter'}</Btn>
      </div>
    </div>
  )
}

const RegisterForm = ({ onAuth, setMode }) => {
  const [form, setForm] = useState({ nom:'', telephone:'', email:'', nom_utilisateur:'', password:'', confirm:'' })
  const [photo, setPhoto] = useState(null), [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(false)
  const photoRef = useRef()

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setPhoto(file); setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRegister = async () => {
    if (!form.nom || !form.email || !form.password || !form.nom_utilisateur) return setError('Tous les champs marqués * sont obligatoires')
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas')
    if (form.password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères')

    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (err) throw err

      let photo_url = null
      if (photo) {
        try {
          const tmpId = Date.now()
          const up = await supabase.storage.from('photos').upload(`reg_${tmpId}.jpg`, photo, { upsert: true, contentType: photo.type })
          if (!up.error) {
            const urlData = supabase.storage.from('photos').getPublicUrl(`reg_${tmpId}.jpg`)
            photo_url = urlData?.data?.publicUrl || urlData?.publicUrl || null
          }
        } catch {}
      }

      const insert = await supabase.from('membres').insert({
        nom: form.nom, telephone: form.telephone, email: form.email, nom_utilisateur: form.nom_utilisateur,
        statut: 'Actif', role: 'membre', photo_url
      })
      if (insert.error) throw insert.error
      setSuccess(true)
    } catch (e) {
      setError(e.message || 'Erreur inscription')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h3>Inscription réussie !</h3>
      <Btn onClick={() => setMode('login')}>Aller à la connexion</Btn>
    </div>
  )

  return (
    <div style={{ padding: 28 }}>
      {/* ... UI identique, photoRef, champs ... */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ textAlign:'center' }} onClick={() => photoRef.current?.click()}>
          <div style={{ width:80, height:80, borderRadius:14, overflow:'hidden', margin:'0 auto' }}>
            {photoPreview ? <img src={photoPreview} alt="photo" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <div style={{padding:16}}>📷</div>}
          </div>
          <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoSelect} />
        </div>

        <Field label="Nom complet *"><Input value={form.nom} onChange={e => setForm(f=>({...f, nom: e.target.value}))} /></Field>
        <Field label="Téléphone"><Input value={form.telephone} onChange={e => setForm(f=>({...f, telephone: e.target.value}))} /></Field>
        <Field label="Email *"><Input type="email" value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))} /></Field>
        <Field label="Nom d'utilisateur *"><Input value={form.nom_utilisateur} onChange={e => setForm(f=>({...f, nom_utilisateur: e.target.value}))} /></Field>
        <Field label="Mot de passe *"><Input type="password" value={form.password} onChange={e => setForm(f=>({...f, password: e.target.value}))} /></Field>
        <Field label="Confirmer le mot de passe *"><Input type="password" value={form.confirm} onChange={e => setForm(f=>({...f, confirm: e.target.value}))} /></Field>
        {error && <div style={{ color: t.red }}>{error}</div>}
        <Btn onClick={handleRegister} disabled={loading}>{loading ? 'Inscription...' : "S'inscrire"}</Btn>
      </div>
    </div>
  )
}

/* ------------------ SIDEBAR / Layout ------------------ */
/* Reprenez SidebarContent et Sidebar (identiques à votre version mais sans dépendances externes cassées). */

/* ------------------ DASHBOARD / MEMBERS / CONTRIBUTIONS ------------------ */
/* Implémentations similaires à l'original mais nettoyées: gestion des valeurs par défaut pour toLocaleString, checks null, etc. */
/* Pour l'exemple je fournis le composant Contributions et Declare (les plus sensibles) */

/* CONTRIBUTIONS */
const Contributions = () => {
  const [contribs, setContribs] = useState([]), [filter, setFilter] = useState('Tous'), [loading, setLoading] = useState(true), [expanded, setExpanded] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('contributions')
        .select('*, membres(nom, email), objectifs(nom)')
        .order('created_at', { ascending: false })
      setContribs(data || [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const validate = async (c) => {
    try {
      await supabase.from('contributions').update({ statut: 'Valide' }).eq('id', c.id)
      if (c.membres?.email) notifierEmail(c.membres.email, c.membres.nom, c.montant, c.objectifs?.nom || 'contribution')
      load()
    } catch (e) { console.error(e) }
  }

  const normalizeFilter = s => s.replace('é','e')
  const filtered = filter === 'Tous' ? contribs : contribs.filter(c => normalizeFilter(c.statut) === normalizeFilter(filter))

  if (loading) return <div style={{ padding: 40, color: t.textMuted }}>Chargement...</div>

  return (
    <div style={{ padding: '24px 16px' }}>
      {/* header, filtres ... */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>/* ... */</thead>
          <tbody>
            {filtered.map(c => (
              <React.Fragment key={c.id}>
                <tr onClick={() => setExpanded(expanded===c.id?null:c.id)}>
                  <td>{c.membres?.nom || '—'}</td>
                  <td>{c.objectifs?.nom || '—'}</td>
                  <td style={{ color: t.accentLight }}>{(c.montant || 0).toLocaleString()} F</td>
                  <td>{c.mode_paiement}</td>
                  <td>{c.date}</td>
                  <td>{c.note ? `📝 ${c.note}` : ''}{c.preuve_texte ? '💬 Texte SMS ▾' : ''}</td>
                  <td><Badge status={c.statut} /></td>
                  <td>{(c.statut !== 'Valide' && c.statut !== 'Validé') &&
                    <Btn variant="success" onClick={e => { e.stopPropagation(); validate(c) }}>Valider</Btn>}</td>
                </tr>
                {expanded === c.id && c.preuve_texte && (
                  <tr><td colSpan={8}><pre style={{ whiteSpace:'pre-wrap' }}>{c.preuve_texte}</pre></td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* DECLARE (déclaration de paiement) : normalisée en utilisant objectif_nom */
const Declare = ({ membreId = '' }) => {
  const [membres, setMembres] = useState([]), [form, setForm] = useState({
    membre_id: membreId || '', objectif_nom: '', montant: '', date: new Date().toISOString().split('T')[0],
    mode_paiement: 'Mobile Money', note: ''
  })
  const [preuveMode, setPreuveMode] = useState('image') // image | texte
  const [image, setImage] = useState(null), [imageB64, setImageB64] = useState(null)
  const [preuveTexte, setPreuveTexte] = useState(''), [ocr, setOcr] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false), [validationPreuve, setValidationPreuve] = useState(null)
  const [loading, setLoading] = useState(false), [sent, setSent] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('membres').select('id, nom').then(({ data }) => setMembres(data || []))
  }, [])

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setImage(URL.createObjectURL(file)); setOcr(null); setValidationPreuve(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const res = ev.target.result || ''
      const parts = res.split(',')
      setImageB64(parts[1] || null)
    }
    reader.readAsDataURL(file)
  }

  const handleTexteChange = (val) => {
    setPreuveTexte(val)
    if (val.length > 10) {
      const result = validerPreuve(val)
      setValidationPreuve(result)
      const numMatch = val.match(/\b(6[579]\d{7}|6[50-3]\d{7})\b/)
      if (numMatch) {
        const op = detectOperateur(numMatch[0]); if (op) setForm(f => ({ ...f, mode_paiement: op }))
      }
    } else setValidationPreuve(null)
  }

  // NOTE: la clé ANTHROPIC doit être fournie côté serveur ou via REACT_APP_... à build-time.
  const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY || ''

  const analyzeOCR = async () => {
    if ((preuveMode === 'image' && !imageB64) || (preuveMode === 'texte' && !preuveTexte)) return
    setOcrLoading(true)
    try {
      let body
      if (preuveMode === 'image') {
        body = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
            { type: 'text', text: 'Analyse cette capture de paiement, renvoie JSON...' }
          ]}]
        }
      } else {
        body = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: `Analyse ce texte :\n\n${preuveTexte}\n\nRetourne uniquement JSON` }]
        }
      }

      if (!ANTHROPIC_KEY) {
        // En dev, essayez un mock local ou retournez un message d'avertissement
        console.warn('Aucune clé ANTHROPIC fournie — analyse IA ignorée.')
        setOcr({ confiance: 'faible', destinataire_valide: false })
        setOcrLoading(false)
        return
      }

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANTHROPIC_KEY}`
        },
        body: JSON.stringify(body)
      })
      const data = await resp.json()
      const txt = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(txt || '{}')
      setOcr(parsed)

      // Double validation simple
      const textToCheck = preuveMode === 'texte' ? preuveTexte : ((parsed.recepteur || '') + ' ' + (parsed.numero_recepteur || ''))
      const v = validerPreuve(textToCheck)
      setValidationPreuve({ ok: v.ok || parsed.destinataire_valide })
      if (parsed.montant && !form.montant) setForm(f => ({ ...f, montant: String(parsed.montant), mode_paiement: parsed.mode || f.mode_paiement }))
    } catch (e) {
      console.error(e)
      setOcr({ confiance: 'faible', destinataire_valide: false })
    } finally { setOcrLoading(false) }
  }

  const submit = async () => {
    if (!form.membre_id || !form.objectif_nom || !form.montant) return
    setLoading(true)
    try {
      const montant = Number(form.montant)
      const ocrMontant = ocr?.montant
      const coherent = !ocrMontant || Math.abs(montant - ocrMontant) < 10
      const preuveOk = validationPreuve?.ok

      let statut = 'En attente'
      if (preuveMode === 'image' && imageB64) statut = (coherent && preuveOk) ? 'Valide' : 'A verifier'
      else if (preuveMode === 'texte' && preuveTexte) statut = preuveOk ? 'Valide' : 'A verifier'

      // Chercher ou créer objectif par nom
      let objId = null
      const { data: existing, error: err1 } = await supabase.from('objectifs').select('id, montant_cible').eq('nom', form.objectif_nom).maybeSingle()
      if (existing && existing.id) objId = existing.id
      else {
        const cible = OBJECTIFS_AWF.find(o => o.nom === form.objectif_nom)?.montant || 0
        const { data: newObj, error: err2 } = await supabase.from('objectifs').insert({ nom: form.objectif_nom, montant_cible: cible, est_fixe: cible > 0 }).select('id').single()
        if (newObj && newObj.id) objId = newObj.id
      }

      await supabase.from('contributions').insert({
        membre_id: form.membre_id,
        objectif_id: objId,
        montant,
        date: form.date,
        mode_paiement: form.mode_paiement,
        statut,
        note: form.note,
        preuve_texte: preuveMode === 'texte' ? preuveTexte : null
      })

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setForm({ membre_id: membreId || '', objectif_nom: '', montant: '', date: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', note: '' })
        setImage(null); setImageB64(null); setPreuveTexte(''); setOcr(null); setValidationPreuve(null)
      }, 2000)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de l\'enregistrement')
    } finally { setLoading(false) }
  }

  if (sent) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h3>Déclaration envoyée !</h3>
    </div>
  )

  return (
    <div style={{ padding: '24px 16px', maxWidth: 720 }}>
      <h2>Déclarer un paiement</h2>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, padding: 16, borderRadius: 12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Membre *">
            <select value={form.membre_id} onChange={e => setForm({...form, membre_id: e.target.value})}>
              <option value="">Sélectionner...</option>
              {membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </Field>
          <Field label="Type de cotisation *">
            <select value={form.objectif_nom} onChange={e => setForm({...form, objectif_nom: e.target.value})}>
              <option value="">Sélectionner...</option>
              {OBJECTIFS_AWF.map(o => <option key={o.nom} value={o.nom}>{o.nom}{o.montant>0 ? ` — ${o.montant}` : ''}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:12 }}>
          <Field label="Montant (FCFA) *"><Input type="number" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></Field>
          <Field label="Opérateur">
            <select value={form.mode_paiement} onChange={e => setForm({...form, mode_paiement: e.target.value})}>
              <option>Mobile Money</option><option>Orange Money</option><option>MTN MoMo</option><option>Cash</option>
            </select>
          </Field>
        </div>

        <Field label="Note"><Input value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></Field>

        <div>
          <label>Preuve</label>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setPreuveMode('image')} style={{ border: preuveMode==='image' ? `1px solid ${t.accent}` : `1px solid ${t.border}` }}>Capture</button>
            <button onClick={() => setPreuveMode('texte')} style={{ border: preuveMode==='texte' ? `1px solid ${t.accent}` : `1px solid ${t.border}` }}>Texte SMS</button>
          </div>

          {preuveMode==='image' && (
            <>
              <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${image ? t.accent : t.border}`, padding:12, marginTop:8 }}>
                {image ? <img src={image} alt="preuve" style={{ maxWidth: '100%', maxHeight: 180 }} /> : <div>Cliquer pour uploader une capture</div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
            </>
          )}

          {preuveMode==='texte' && (
            <textarea value={preuveTexte} onChange={e => handleTexteChange(e.target.value)} rows={5} style={{ width:'100%', marginTop:8 }} />
          )}
        </div>

        {((preuveMode==='image' && imageB64) || (preuveMode==='texte' && preuveTexte.length>20)) && (
          <Btn variant="ghost" onClick={analyzeOCR} disabled={ocrLoading}>{ocrLoading ? 'Analyse...' : "Analyser (IA)"}</Btn>
        )}

        {ocr && (
          <div style={{ marginTop:12, padding:10, borderRadius:8, border:`1px solid ${ocr.destinataire_valide ? t.green : t.yellow}` }}>
            <div>{ocr.destinataire_valide ? 'Destinataire validé' : 'Destinataire non confirmé'}</div>
            <div>Montant: {ocr.montant ? `${ocr.montant.toLocaleString()} F` : '—'}</div>
            <div>Référence: {ocr.reference || '—'}</div>
            <div>Confiance: {ocr.confiance || '—'}</div>
          </div>
        )}

        <div style={{ marginTop:12 }}>
          <Btn onClick={submit} disabled={loading || !form.membre_id || !form.objectif_nom || !form.montant}>{loading ? 'Envoi...' : 'Envoyer la déclaration'}</Btn>
        </div>
      </div>
    </div>
  )
}

/* ------------------ APP ROOT ------------------ */
export default function App() {
  const [user, setUser] = useState(null), [membre, setMembre] = useState(null)
  const [page, setPage] = useState('dashboard'), [checking, setChecking] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false), [prevPage, setPrevPage] = useState(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        const { data: m } = await supabase.from('membres').select('*').eq('email', session.user.email).maybeSingle().catch(()=>({data:null}))
        setUser(session.user); setMembre(m)
        setPage(m?.role === 'membre' ? 'myaccount' : 'dashboard')
      }
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); setMembre(null) }
    })
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  const handleAuth = (u,m) => { setUser(u); setMembre(m); setPage(m?.role==='membre' ? 'myaccount' : 'dashboard') }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setMembre(null); setPage('dashboard') }
  const handleSetPage = (p) => { setPrevPage(page); setPage(p); setSidebarOpen(false) }

  if (checking) return <div style={{ minHeight:'100vh', background:t.bg }}><style>{css}</style><div style={{textAlign:'center'}}>Chargement...</div></div>
  if (!user) return <AuthPage onAuth={handleAuth} />

  const pages = {
    dashboard: <div style={{ padding:32 }}> {/* Votre Dashboard */ } </div>,
    members: <div style={{ padding:32 }}> {/* Members */ } </div>,
    payments: <Contributions />,
    declare: <Declare membreId={membre?.id} />,
    myaccount: <div style={{ padding:32 }}>{/* MyAccount */}</div>,
    report: <div style={{ padding:32 }}>{/* Report */}</div>
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:t.bg }}>
      <style>{css}</style>
      {/* Sidebar (votre implémentation) */}
      <div style={{ width:240, background:t.surface }}> {/* SidebarContent... */} </div>

      <main style={{ flex:1 }}>{pages[page] || pages.dashboard}</main>
    </div>
  )
}
