'use strict';
const DB_NAME='my-learning-journal', STORE='entries', DB_VERSION=1;
let db, entries=[], deferredInstallPrompt=null, client=null, currentUser=null;
let cloudReady=false;
const DEFAULT_CATEGORIES=['Technology','Programming','Networking','Cybersecurity','Personal Development','Business','Other'];
const CATEGORY_KEY='my-learning-journal-custom-categories';
let customCategories=[];
function loadCategories(){try{const stored=JSON.parse(localStorage.getItem(CATEGORY_KEY)||'[]');customCategories=Array.isArray(stored)?stored.filter(c=>typeof c==='string'&&c.trim()&&c.length<=100).slice(0,200):[]}catch{customCategories=[]}}
async function saveCategories(){if(!currentUser)throw new Error('Please sign in.');const {error}=await client.from('journal_categories').upsert(customCategories.map(name=>({user_id:currentUser.id,name})),{onConflict:'user_id,name'});if(error)throw error;}
function allCategories(){return [...new Set([...DEFAULT_CATEGORIES,...customCategories,...entries.map(e=>e.category)])].sort((a,b)=>a.localeCompare(b))}
function updateCategoryOptions(selected){const select=$('category');select.innerHTML=allCategories().map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')+'<option value="__new__">＋ Add new category…</option>';select.value=selected&&allCategories().includes(selected)?selected:'Technology'}
async function addCategory(){const input=prompt('New category name:');if(input===null)return false;const name=input.trim().replace(/\s+/g,' ');if(!name||name.length>100){showToast('Category must be 1–100 characters.');return false}const existing=allCategories().find(c=>c.toLowerCase()===name.toLowerCase());if(existing){updateCategoryOptions(existing);showToast('Category already exists.');return true}if(customCategories.length>=200){showToast('Category limit reached.');return false}customCategories.push(name);try{await saveCategories()}catch{showToast('Could not save category to the cloud.');customCategories.pop();return false}updateCategoryOptions(name);showToast('Category added.');return true}

const $=id=>document.getElementById(id);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const showToast=msg=>{const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),3300)};
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function transaction(mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const store=tx.objectStore(STORE);let result;try{result=fn(store)}catch(e){tx.abort();reject(e);return}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Transaction aborted'))})}
function getAll(){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function cloudList(table,columns='*'){
  let rows=[];let start=0;
  while(true){const {data,error}=await client.from(table).select(columns).range(start,start+499);if(error)throw error;rows.push(...data);if(data.length<500)break;start+=500;if(start>50000)throw new Error('Too many records to load.');}
  return rows;
}
async function refresh(){if(!currentUser)return;const [stored,cats]=await Promise.all([cloudList('journal_entries','data'),cloudList('journal_categories','name')]);entries=stored.map(row=>row.data);customCategories=cats.map(row=>row.name);render();updateCategoryOptions();$('storageStatus').textContent='● Synced to cloud';}
function render(){const cats=[...new Set(entries.map(e=>e.category))].sort();const previous=$('categoryFilter').value;$('categoryFilter').innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');$('categoryFilter').value=cats.includes(previous)?previous:'';
$('totalCount').textContent=entries.length;$('daysCount').textContent=new Set(entries.map(e=>e.date)).size;$('categoriesCount').textContent=cats.length;$('latestDate').textContent=entries.length?[...entries].sort((a,b)=>b.date.localeCompare(a.date))[0].date:'—';renderList()}
function renderList(){const q=$('searchInput').value.toLowerCase().trim(),cat=$('categoryFilter').value,sort=$('sortFilter').value;let filtered=entries.filter(e=>(!cat||e.category===cat)&&[e.topic,e.notes,e.category,...e.tags].join(' ').toLowerCase().includes(q));filtered.sort((a,b)=>sort==='title'?a.topic.localeCompare(b.topic):sort==='oldest'?a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt):b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));$('entryList').innerHTML=filtered.length?filtered.map(e=>`<article class="entry"><div class="entry-top"><span class="pill">${escapeHTML(e.category)}</span><span class="date">${escapeHTML(e.date)}</span></div><h3>${escapeHTML(e.topic)}</h3><p>${escapeHTML(e.notes)}</p>${e.tags.length?`<div class="tags">${e.tags.map(t=>`<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>`:''}<div class="entry-actions"><button class="text-btn" data-action="edit" data-id="${escapeHTML(e.id)}">Edit</button><button class="text-btn danger" data-action="delete" data-id="${escapeHTML(e.id)}">Delete</button></div></article>`).join(''):`<div class="empty"><div class="empty-icon">📚</div><h3>${entries.length?'No matching entries':'Your learning story starts here'}</h3><p>${entries.length?'Try a different search or filter.':'Add your first learning entry to start building your knowledge library.'}</p><button class="btn btn-primary" id="emptyAdd">＋ Add an entry</button></div>`;const add=$('emptyAdd');if(add)add.addEventListener('click',()=>openEntry())}
function openEntry(entry){updateCategoryOptions(entry?.category);$('entryForm').reset();$('entryId').value=entry?.id||'';$('modalTitle').textContent=entry?'Edit learning entry':'New learning entry';$('topic').value=entry?.topic||'';$('entryDate').value=entry?.date||today();$('category').value=entry?.category||'Technology';$('notes').value=entry?.notes||'';$('tags').value=entry?.tags.join(', ')||'';$('entryDialog').showModal();$('topic').focus()}
async function saveEntry(ev){ev.preventDefault();const id=$('entryId').value,old=entries.find(e=>e.id===id);const entry={id:id||uid(),topic:$('topic').value.trim(),date:$('entryDate').value,category:$('category').value,notes:$('notes').value.trim(),tags:[...new Set($('tags').value.split(',').map(t=>t.trim()).filter(Boolean))].slice(0,30),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};if(!entry.topic||!entry.notes||entry.category==='__new__'||!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))return showToast('Please complete the required fields.');try{const {error}=await client.from('journal_entries').upsert({id:entry.id,user_id:currentUser.id,data:entry,updated_at:entry.updatedAt},{onConflict:'user_id,id'});if(error)throw error;$('entryDialog').close();await refresh();showToast(old?'Entry updated and synced.':'Entry saved and synced.')}catch(e){showToast('Cloud save failed. Check your connection and sign-in.')}}
async function deleteEntry(id){if(!confirm('Delete this entry permanently?'))return;try{const {error}=await client.from('journal_entries').delete().eq('id',id).eq('user_id',currentUser.id);if(error)throw error;await refresh();showToast('Entry deleted.')}catch(e){showToast('Cloud delete failed. Check your connection.')}}
function exportJSON(){const payload={app:'My Learning Journal',schemaVersion:1,exportedAt:new Date().toISOString(),categories:customCategories,entries};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`my-learning-journal-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('JSON backup downloaded. Store it somewhere safe.')}
function validateImport(raw){if(!raw||raw.app!=='My Learning Journal'||raw.schemaVersion!==1||!Array.isArray(raw.entries))throw new Error('Not a supported My Learning Journal backup.');if(raw.entries.length>50000)throw new Error('Backup has too many entries.');const ids=new Set();return raw.entries.map(e=>{if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.topic!=='string'||!e.topic.trim()||typeof e.notes!=='string'||!e.notes.trim()||typeof e.category!=='string'||!e.category.trim()||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Array.isArray(e.tags)||!e.tags.every(t=>typeof t==='string')||typeof e.createdAt!=='string'||typeof e.updatedAt!=='string')throw new Error('Backup contains an invalid entry.');ids.add(e.id);return{id:e.id.slice(0,150),topic:e.topic.slice(0,140),notes:e.notes.slice(0,100000),category:e.category.slice(0,100),date:e.date,tags:e.tags.slice(0,30).map(t=>t.slice(0,80)),createdAt:e.createdAt,updatedAt:e.updatedAt}})}
async function importJSON(file){
 if(!file)return;
 if(file.size>25*1024*1024){showToast('Backup file is too large (25 MB max).');return;}
 try{
  const raw=JSON.parse(await file.text());const incoming=validateImport(raw);
  const importedCategories=raw.categories===undefined?[]:raw.categories;
  if(!Array.isArray(importedCategories)||importedCategories.length>200||!importedCategories.every(c=>typeof c==='string'&&c.trim()&&c.length<=100))throw new Error('Backup contains invalid categories.');
  if(!confirm(`Import ${incoming.length} entries to your private cloud account? Existing cloud entries with the same IDs will NOT be overwritten. This will not delete any existing entries.`))return;
  const existingIds=new Set(entries.map(e=>e.id));const newEntries=incoming.filter(e=>!existingIds.has(e.id));
  for(let i=0;i<newEntries.length;i+=100){const rows=newEntries.slice(i,i+100).map(e=>({id:e.id,user_id:currentUser.id,data:e,updated_at:e.updatedAt}));const {error}=await client.from('journal_entries').upsert(rows,{onConflict:'user_id,id'});if(error)throw error;}
  const already=new Set(customCategories);const newCats=importedCategories.filter(name=>!already.has(name));
  if(newCats.length){const {error}=await client.from('journal_categories').upsert(newCats.map(name=>({user_id:currentUser.id,name})),{onConflict:'user_id,name'});if(error)throw error;}
  await refresh();showToast(`Imported ${newEntries.length} new entries. ${incoming.length-newEntries.length} duplicates skipped.`);
 }catch(err){showToast(err instanceof SyntaxError?'This is not valid JSON.':err.message||'Could not import backup.')}finally{$('importFile').value=''}
}
async function migrateLocal(){
 try{
  const local=await getAll();
  if(!local.length){showToast('No old browser entries found here. Use Import JSON if you have a backup.');return;}
  if(!confirm(`Found ${local.length} old journal entries in this browser. Copy missing entries to your secure cloud? Your old local entries will NOT be deleted.`))return;
  const existingIds=new Set(entries.map(e=>e.id));const incoming=validateImport({app:'My Learning Journal',schemaVersion:1,entries:local});const missing=incoming.filter(e=>!existingIds.has(e.id));
  for(let i=0;i<missing.length;i+=100){const rows=missing.slice(i,i+100).map(e=>({id:e.id,user_id:currentUser.id,data:e,updated_at:e.updatedAt}));const {error}=await client.from('journal_entries').upsert(rows,{onConflict:'user_id,id'});if(error)throw error;}
  const oldCategories=JSON.parse(localStorage.getItem(CATEGORY_KEY)||'[]');const newCategories=oldCategories.filter(n=>typeof n==='string'&&n.trim()&&!customCategories.includes(n));if(newCategories.length){const {error}=await client.from('journal_categories').upsert(newCategories.map(name=>({user_id:currentUser.id,name})),{onConflict:'user_id,name'});if(error)throw error;}
  await refresh();showToast(`Copied ${missing.length} entries; ${incoming.length-missing.length} already existed.`);
 }catch(err){showToast('Could not migrate: '+(err.message||'unknown error'));}
}
function showAuth(message=''){$('authScreen').hidden=false;$('appRoot').hidden=true;$('storageStatus').textContent='● Sign in required';$('authMessage').textContent=message;}
function showApp(){$('authScreen').hidden=true;$('appRoot').hidden=false;$('signedInEmail').textContent=currentUser.email||'Signed in';}
async function onSession(session){
 currentUser=session?.user||null;
 if(!currentUser){entries=[];customCategories=[];showAuth();return;}
 showApp();try{await refresh()}catch(err){$('storageStatus').textContent='● Sync failed';showToast('Cloud connection failed: '+err.message);}
}
async function initAuth(){
 const config=window.JOURNAL_CONFIG||{};
 if(!config.supabaseUrl?.startsWith('https://')||!config.supabaseAnonKey||config.supabaseAnonKey.startsWith('PASTE_')){
  showAuth('Setup needed: edit config.js with your Supabase project URL and publishable / anon key. See SETUP.md.');$('authForm').hidden=true;return;
 }
 if(!window.supabase?.createClient){showAuth('Could not load the login library. Check your internet connection.');$('authForm').hidden=true;return;}
 client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 $('authForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value;
  $('authSubmit').disabled=true;$('authMessage').textContent='Signing in…';
  try{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;$('authMessage').textContent='';}
  catch(e){$('authMessage').textContent=e.message||'Could not sign in.';}
  finally{$('authSubmit').disabled=false;}
 });
 $('signOutBtn').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error)showToast('Sign-out failed: '+error.message);});
 client.auth.onAuthStateChange((_event,session)=>{void onSession(session)});
 const {data,error}=await client.auth.getSession();if(error){showAuth('Could not validate session: '+error.message);return;}await onSession(data.session);
}
async function init(){
 showAuth();
 $('category').addEventListener('change',async()=>{if($('category').value==='__new__'){const previous=$('category').dataset.previous||'Technology';if(!await addCategory())updateCategoryOptions(previous)}$('category').dataset.previous=$('category').value});
 try{db=await openDB()}catch(e){$('migrateBtn').disabled=true;}
 $('newEntryBtn').addEventListener('click',()=>openEntry());
 $('entryForm').addEventListener('submit',saveEntry);
 $('closeDialog').addEventListener('click',()=>$('entryDialog').close());
 $('cancelDialog').addEventListener('click',()=>$('entryDialog').close());
 $('entryDialog').addEventListener('click',e=>{if(e.target===$('entryDialog'))$('entryDialog').close()});
 $('searchInput').addEventListener('input',renderList);$('categoryFilter').addEventListener('change',renderList);$('sortFilter').addEventListener('change',renderList);
 $('entryList').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const item=entries.find(x=>x.id===b.dataset.id);if(!item)return;if(b.dataset.action==='edit')openEntry(item);else deleteEntry(item.id)});
 $('exportBtn').addEventListener('click',exportJSON);
 $('importBtn').addEventListener('click',()=>$('importFile').click());
 $('importFile').addEventListener('change',e=>importJSON(e.target.files[0]));
 $('migrateBtn').addEventListener('click',migrateLocal);
 await initAuth();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)refresh().catch(()=>{$('storageStatus').textContent='● Sync failed';});});
 window.addEventListener('online',()=>{if(currentUser)refresh().catch(()=>{});});
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn').hidden=false});$('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').hidden=true});window.addEventListener('appinstalled',()=>{$('installBtn').hidden=true;showToast('App installed!')});if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));init();
