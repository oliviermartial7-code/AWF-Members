import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";

const THEME = {
  bg: "#0D1420",
  surface: "#111B30",
  card: "#172040",
  border: "#243060",
  accent: "#F26522",
  green: "#2ECC8A",
  red: "#E85555",
  yellow: "#F0C040",
  text: "#EAF0FF",
  muted: "#8A9AC8"
};

const OBJECTIFS = [
  { nom: "Cotisation mensuelle", montant: 2500 },
  { nom: "Secours", montant: 5000 },
  { nom: "Main levée", montant: 2500 },
  { nom: "On reçoit une équipe", montant: 5000 },
  { nom: "On est reçu par une équipe", montant: 2500 },
  { nom: "Avance sur cotisation", montant: 0 },
  { nom: "Cotisation évènement heureux", montant: 2500 },
  { nom: "Cotisation évènement malheureux", montant: 5000 },
  { nom: "Sanction", montant: 0 },
  { nom: "Aide", montant: 0 }
];

function Login({ onAuth }) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");

  const login=async()=>{
    setError("");

    const {data,error}=await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      setError(error.message);
      return;
    }

    const {data:membre}=await supabase
    .from("membres")
    .select("*")
    .eq("email",email)
    .single();

    onAuth(data.user,membre);
  };

  return(
  <div style={{padding:40}}>
  <h2>Connexion</h2>

  <input
  placeholder="email"
  value={email}
  onChange={e=>setEmail(e.target.value)}
  />

  <input
  type="password"
  placeholder="mot de passe"
  value={password}
  onChange={e=>setPassword(e.target.value)}
  />

  {error && <p style={{color:"red"}}>{error}</p>}

  <button onClick={login}>Connexion</button>

  </div>
  );
}

function Register({setMode}){

const [form,setForm]=useState({
nom:"",
email:"",
telephone:"",
password:""
});

const register=async()=>{

const {data,error}=await supabase.auth.signUp({
email:form.email,
password:form.password
});

if(error){
alert(error.message);
return;
}

await supabase.from("membres").insert({
nom:form.nom,
email:form.email,
telephone:form.telephone
});

alert("Compte créé");
setMode("login");

};

return(

<div style={{padding:40}}>

<h2>Inscription</h2>

<input placeholder="Nom"
onChange={e=>setForm({...form,nom:e.target.value})}
/>

<input placeholder="Email"
onChange={e=>setForm({...form,email:e.target.value})}
/>

<input placeholder="Téléphone"
onChange={e=>setForm({...form,telephone:e.target.value})}
/>

<input type="password"
placeholder="Mot de passe"
onChange={e=>setForm({...form,password:e.target.value})}
/>

<button onClick={register}>Créer compte</button>

</div>

);
}

function Dashboard(){

const [stats,setStats]=useState({
membres:0,
contributions:0
});

useEffect(()=>{

const load=async()=>{

const {data:membres}=await supabase
.from("membres")
.select("*");

const {data:contributions}=await supabase
.from("contributions")
.select("*");

setStats({
membres:membres?.length||0,
contributions:contributions?.length||0
});

};

load();

},[]);

return(

<div style={{padding:30}}>

<h2>Dashboard</h2>

<p>Membres : {stats.membres}</p>
<p>Contributions : {stats.contributions}</p>

</div>

);
}

function Members(){

const [members,setMembers]=useState([]);

useEffect(()=>{

const load=async()=>{

const {data}=await supabase
.from("membres")
.select("*");

setMembers(data||[]);

};

load();

},[]);

return(

<div style={{padding:30}}>

<h2>Membres</h2>

<table>

<thead>
<tr>
<th>Nom</th>
<th>Email</th>
<th>Téléphone</th>
</tr>
</thead>

<tbody>

{members.map(m=>(
<tr key={m.id}>
<td>{m.nom}</td>
<td>{m.email}</td>
<td>{m.telephone}</td>
</tr>
))}

</tbody>

</table>

</div>

);
}

function Contributions(){

const [data,setData]=useState([]);

useEffect(()=>{

const load=async()=>{

const {data}=await supabase
.from("contributions")
.select("*,membres(nom),objectifs(nom)")
.order("created_at",{ascending:false});

setData(data||[]);

};

load();

},[]);

return(

<div style={{padding:30}}>

<h2>Contributions</h2>

<table>

<thead>
<tr>
<th>Membre</th>
<th>Objectif</th>
<th>Montant</th>
<th>Date</th>
</tr>
</thead>

<tbody>

{data.map(c=>(
<tr key={c.id}>
<td>{c.membres?.nom}</td>
<td>{c.objectifs?.nom}</td>
<td>{(c.montant||0).toLocaleString()} FCFA</td>
<td>{c.date}</td>
</tr>
))}

</tbody>

</table>

</div>

);
}

function Declare(){

const [form,setForm]=useState({
membre_id:"",
objectif:"",
montant:"",
date:new Date().toISOString().slice(0,10)
});

const submit=async()=>{

if(!form.membre_id || !form.objectif || !form.montant){
alert("Champs manquants");
return;
}

const {data:obj}=await supabase
.from("objectifs")
.select("id")
.eq("nom",form.objectif)
.single();

let objectifId=obj?.id;

if(!objectifId){

const target=OBJECTIFS.find(o=>o.nom===form.objectif);

const {data:newObj}=await supabase
.from("objectifs")
.insert({
nom:form.objectif,
montant_cible:target?.montant||0
})
.select()
.single();

objectifId=newObj.id;

}

await supabase.from("contributions").insert({

membre_id:form.membre_id,
objectif_id:objectifId,
montant:Number(form.montant),
date:form.date,
statut:"En attente"

});

alert("Paiement déclaré");

};

return(

<div style={{padding:30}}>

<h2>Déclarer paiement</h2>

<select
onChange={e=>setForm({...form,membre_id:e.target.value})}
>
<option>Membre</option>
</select>

<select
onChange={e=>setForm({...form,objectif:e.target.value})}
>
<option>Objectif</option>
{OBJECTIFS.map(o=>(
<option key={o.nom}>{o.nom}</option>
))}
</select>

<input
placeholder="Montant"
type="number"
onChange={e=>setForm({...form,montant:e.target.value})}
/>

<input
type="date"
value={form.date}
onChange={e=>setForm({...form,date:e.target.value})}
/>

<button onClick={submit}>Envoyer</button>

</div>

);
}

export default function App(){

const [user,setUser]=useState(null);
const [membre,setMembre]=useState(null);
const [page,setPage]=useState("dashboard");
const [mode,setMode]=useState("login");

const handleAuth=(u,m)=>{
setUser(u);
setMembre(m);
};

if(!user){

if(mode==="login"){
return <Login onAuth={handleAuth}/>
}

return <Register setMode={setMode}/>

}

return(

<div style={{display:"flex"}}>

<div style={{width:200,background:"#111",color:"#fff",height:"100vh",padding:20}}>

<p onClick={()=>setPage("dashboard")}>Dashboard</p>
<p onClick={()=>setPage("members")}>Membres</p>
<p onClick={()=>setPage("payments")}>Contributions</p>
<p onClick={()=>setPage("declare")}>Déclarer paiement</p>

</div>

<div style={{flex:1}}>

{page==="dashboard" && <Dashboard/>}
{page==="members" && <Members/>}
{page==="payments" && <Contributions/>}
{page==="declare" && <Declare/>}

</div>

</div>

);
}
