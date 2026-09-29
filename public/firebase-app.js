// Firebase integration for Central Service Point. Runs only when firebase-config.js has an apiKey.
const V="https://www.gstatic.com/firebasejs/10.12.2/";
if(window.CSP_CONFIG&&window.CSP_CONFIG.apiKey){
const {initializeApp}=await import(V+"firebase-app.js");
const {getFirestore,collection,query,where,getDocs,setDoc,addDoc,updateDoc,deleteDoc,doc,orderBy,serverTimestamp}=await import(V+"firebase-firestore.js");
const {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged}=await import(V+"firebase-auth.js");
const app=initializeApp(window.CSP_CONFIG),db=getFirestore(app),auth=getAuth(app);
const strip=o=>JSON.parse(JSON.stringify(o));

// Public data: only approved + published contractors
try{const s=await getDocs(query(collection(db,"contractors"),where("approved","==",true),where("published","==",true)));
C=s.docs.map(d=>({...d.data(),fs:true}));R()}catch(e){console.error("Load failed",e)}

// Submissions (create-only for the public)
window.cspSync=async()=>{
 for(const x of Q.filter(q=>!q.synced)){x.synced=true;
  try{await addDoc(collection(db,"quotationRequests"),{...strip({...x,synced:undefined}),createdAt:serverTimestamp()})}catch(e){x.synced=false;console.error(e)}}
 for(const c of C.filter(c=>!c.fs&&!c.approved)){c.fs=true;
  try{await setDoc(doc(db,"contractors",c.id),{...strip({...c,fs:undefined}),createdAt:serverTimestamp()})}catch(e){c.fs=false;console.error(e)}}
};
window.cspMsg=d=>addDoc(collection(db,"messages"),{...d,createdAt:serverTimestamp()}).catch(console.error);
window.done=(t,p)=>{if(/ready/.test(t)){t="Message received";p="Thank you. Central Service Point has received your message and will be in touch."}document.querySelector("#main").innerHTML=`<section class="sec"><div class="w" style="max-width:640px;text-align:center"><div style="font-size:3rem">✅</div><h1>${t}</h1><p>${p}</p><a class="btn o" href="#/">Back to Home</a></div></section>`;scrollTo(0,0)};
window.success=q=>`<section class="sec"><div class="w" style="max-width:640px;text-align:center"><div style="font-size:3rem">✅</div><h1>Request Received Successfully</h1><p>Thank you. Your quotation request has been received by Central Service Point.</p><p>We will review your request and assist with the next steps. Central Service Point manages the next communication; a quotation is not sent automatically.</p><p>Reference Number:<br><b style="font-size:1.4rem">${esc(q.get("ref"))}</b></p><a class="btn o" href="#/">Back to Home</a></div></section>`;

// Admin (Firebase Auth + Firestore rules enforce access)
onAuthStateChanged(auth,()=>{if(location.hash.startsWith("#/admin"))R()});
window.admin=()=>`<section class="sec"><div class="w"><h1>Admin Dashboard</h1><div id="ad"></div></div></section>`;
window.adminBind=()=>{const ad=document.getElementById("ad");
 if(!auth.currentUser){ad.innerHTML=`<form id="lg" class="card" style="max-width:420px"><label for="ae">Email</label><input id="ae" type="email" required><label for="ap">Password</label><input id="ap" type="password" required><div class="err" id="ar" role="alert"></div><button class="btn" style="margin-top:10px">Sign in</button></form>`;
  document.getElementById("lg").onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,document.getElementById("ae").value,document.getElementById("ap").value)}catch(x){document.getElementById("ar").textContent="Sign-in failed."}};return}
 draw(ad)};
const FLD=[["name","Business name"],["cat","Main category","sel"],["services","Services (comma separated)"],["phone","Phone"],["wa","WhatsApp (e.g. 27821234567)"],["email","Email"],["web","Website (https://…)"],["address","Physical address"],["city","City / town"],["prov","Province","prov"],["areas","Service areas (comma separated)"],["hours","Operating hours"],["years","Years of experience"],["logo","Logo image URL"],["cover","Cover image URL"],["certs","Certifications (comma separated)"],["facebook","Facebook URL"],["instagram","Instagram URL"],["desc","Description","area"],["gallery","Gallery image URLs (one per line)","area"]];
function editor(c,ad){c=c||{};const val=k=>["services","areas","certs"].includes(k)?(c[k]||[]).join(", "):k==="gallery"?(c.gallery||[]).join("\n"):(c[k]??"");
 openM(`<h2>${c.id?"Edit":"Add"} contractor</h2><form id="ef"><div class="fg">${FLD.map(([k,l,t])=>`<div class="${t==="area"?"fw":""}"><label for="f-${k}">${l}</label>${t==="area"?`<textarea id="f-${k}" rows="3">${esc(val(k))}</textarea>`:t?`<select id="f-${k}"><option value="">Select…</option>${opts(t==="prov"?PROV:CATS.map(x=>x[0]),c[k])}</select>`:`<input id="f-${k}" value="${esc(val(k))}">`}</div>`).join("")}
 <div><label for="f-status">Status</label><select id="f-status">${opts(["Draft","Pending","Approved","Suspended"],c.status||"Draft")}</select></div>
 <div class="fw fl">${["approved","published","featured"].map(k=>`<label class="ck"><input type="checkbox" id="f-${k}" ${c[k]?"checked":""}>${k[0].toUpperCase()+k.slice(1)}</label>`).join("")}</div>
 <div class="fw fl"><button class="btn">Save</button><button type="button" class="btn o" data-x>Cancel</button></div></div></form>`);
 document.getElementById("ef").onsubmit=async e=>{e.preventDefault();const g=k=>document.getElementById("f-"+k),L=k=>g(k).value.split(k==="gallery"?"\n":",").map(x=>x.trim()).filter(Boolean),name=g("name").value.trim();if(!name)return;
  const id=c.id||"CSP-"+String(Date.now()).slice(-8),d={id,slug:c.slug||name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name,...Object.fromEntries(["cat","phone","wa","email","web","address","city","prov","hours","logo","cover","facebook","instagram","desc"].map(k=>[k,g(k).value.trim()])),years:+g("years").value||0,services:L("services"),areas:L("areas"),certs:L("certs"),gallery:L("gallery"),status:g("status").value,approved:g("approved").checked,published:g("published").checked,featured:g("featured").checked,created:c.created||Date.now(),updatedAt:Date.now()};
  try{await setDoc(doc(db,"contractors",id),d,{merge:true});closeM();draw(ad)}catch(x){alert("Save failed: check admin rules.")}}}
async function draw(ad){ad.innerHTML="Loading…";
 try{const [cs,qs]=await Promise.all([getDocs(collection(db,"contractors")),getDocs(query(collection(db,"quotationRequests"),orderBy("createdAt","desc")))]);
 const cl=cs.docs.map(d=>d.data()),ql=qs.docs.map(d=>({_id:d.id,...d.data()}));
 ad.innerHTML=`<p class="fl"><button class="btn o sm" id="so">Sign out</button><button class="btn sm" id="adn">+ Add contractor</button><button class="btn o sm" id="sd">Load sample contractors</button></p><h2>Contractors</h2><div class="tbl card"><table><tr><th>ID</th><th>Business</th><th>Status</th><th>Actions</th></tr>${cl.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.name)}<br><small class="mut">${esc(c.city)}</small></td><td>${c.approved?"Approved":esc(c.status)}${c.published?" • Published":" • Unpublished"}${c.featured?" • ★":""}</td><td class="fl">${[["ap",c.approved?"Unapprove":"Approve"],["pu",c.published?"Unpublish":"Publish"],["fe",c.featured?"Unfeature":"Feature"],["su",c.status==="Suspended"?"Reinstate":"Suspend"],["ed","Edit"],["de","Delete"]].map(b=>`<button class="btn o sm" data-a="${b[0]}" data-i="${esc(c.id)}">${b[1]}</button>`).join("")}</td></tr>`).join("")}</table></div>
 <h2 style="margin-top:28px">Quotation Requests</h2>${ql.length?`<div class="tbl card"><table><tr><th>Ref</th><th>Customer</th><th>Contractor</th><th>Request</th><th>Status & Notes</th></tr>${ql.map(x=>`<tr><td>${esc(x.ref)}</td><td>${esc(x.name)}<br>${esc(x.phone)}<br>${esc(x.email)}</td><td>${esc(x.contractorName)}<br><small>${esc(x.contractorId)}</small></td><td>${esc(x.service)} — ${esc(x.ploc)}<br><small>${esc(x.desc)}</small></td><td><select data-s="${x._id}" aria-label="Status">${opts(STAT,x.status)}</select><textarea data-n="${x._id}" rows="2" placeholder="Admin notes" style="margin-top:6px">${esc(x.notes||"")}</textarea></td></tr>`).join("")}</table></div>`:'<p class="mut">No requests yet.</p>'}`;
 ad.querySelector("#so").onclick=()=>signOut(auth);
 ad.querySelector("#adn").onclick=()=>editor(null,ad);ad.querySelector("#sd").onclick=async()=>{for(const c of SEED)await setDoc(doc(db,"contractors",c.id),strip({...c,createdAt:Date.now()}));draw(ad)};
 ad.querySelectorAll("[data-a]").forEach(b=>b.onclick=async()=>{const c=cl.find(x=>x.id===b.dataset.i),a=b.dataset.a,r=doc(db,"contractors",c.id);if(a==="ed")return editor(c,ad);
  if(a==="ap")await updateDoc(r,{approved:!c.approved,status:c.approved?"Draft":"Approved"});else if(a==="pu")await updateDoc(r,{published:!c.published});else if(a==="fe")await updateDoc(r,{featured:!c.featured});
  else if(a==="su")await updateDoc(r,{status:c.status==="Suspended"?"Approved":"Suspended"});else if(confirm("Delete "+c.name+"?"))await deleteDoc(r);draw(ad)});
 ad.querySelectorAll("[data-s]").forEach(s=>s.onchange=()=>updateDoc(doc(db,"quotationRequests",s.dataset.s),{status:s.value}));
 ad.querySelectorAll("[data-n]").forEach(s=>s.onchange=()=>updateDoc(doc(db,"quotationRequests",s.dataset.n),{notes:s.value}));
 }catch(e){ad.innerHTML=`<p class="err">Could not load admin data. Check that this account is listed as admin in firestore.rules.</p>`;console.error(e)}}
if(location.hash.startsWith("#/admin"))R();
}
