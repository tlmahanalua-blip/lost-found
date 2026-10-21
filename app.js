import { CATEGORIES, LOCATIONS, TODAY, loadState, persist, filterItems, createReport, createClaim, markReturned, flagItem, safePhoto } from './model.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const drawings = {
  bag:'<path d="M68 62c-2-48 64-48 64 0" fill="none" stroke="#7c6d52" stroke-width="9"/><path d="M53 58h94l10 106q-57 14-114 0z" fill="#d7bd89"/><path d="M61 66h78l8 91q-47 10-94 0z" fill="#e7d5ae"/><path d="M73 56v34m54-34v34" stroke="#b3996b" stroke-width="7" stroke-linecap="round"/><path d="M72 114q16-26 30 0q14-26 28 0q0 18-29 34q-29-16-29-34" fill="#607a4d"/><path d="M59 157q42 8 82 0" fill="none" stroke="#c8af7e" stroke-width="2"/>',
  keys:'<g transform="rotate(-22 100 100)"><circle cx="103" cy="57" r="29" fill="none" stroke="#8f9b9e" stroke-width="7"/><path d="M94 81v69l-13 11v-18H69v-14h12V80" fill="#c1c8c9" stroke="#9da6a8" stroke-width="2"/><path d="M119 78v70l11 10v-18h12v-13h-13V76" fill="#d5bb73" stroke="#a99359" stroke-width="2"/><rect x="80" y="32" width="41" height="55" rx="13" fill="#5584a0"/><circle cx="100" cy="44" r="5" fill="#dbe8ed"/><path d="M90 64h20" stroke="#a2c5d7" stroke-width="3" stroke-linecap="round"/></g>',
  headphones:'<path d="M49 108V81a51 51 0 01102 0v27" fill="none" stroke="#303e3c" stroke-width="16"/><path d="M49 80a51 51 0 01102 0" fill="none" stroke="#66736b" stroke-width="7"/><g transform="rotate(8 54 126)"><rect x="31" y="90" width="34" height="69" rx="14" fill="#303e3c"/><rect x="51" y="94" width="16" height="62" rx="8" fill="#5f6f65"/></g><g transform="rotate(-8 146 126)"><rect x="135" y="90" width="34" height="69" rx="14" fill="#303e3c"/><rect x="133" y="94" width="16" height="62" rx="8" fill="#5f6f65"/></g>',
  notebook:'<g transform="rotate(-10 100 100)"><rect x="51" y="29" width="100" height="141" rx="7" fill="#557d62"/><rect x="61" y="34" width="86" height="131" rx="3" fill="#77967c"/><path d="M64 35v131" stroke="#b0c5a6" stroke-width="2"/><g stroke="#d6d8c1" stroke-width="4" stroke-linecap="round"><path d="M48 44h14m-14 18h14m-14 18h14m-14 18h14m-14 18h14m-14 18h14m-14 18h14"/></g><rect x="83" y="60" width="47" height="30" rx="2" fill="#e2e6cc"/><path d="M91 72h31m-25 7h19" stroke="#839475" stroke-width="2"/><path d="M132 36v128" stroke="#405f47" stroke-width="4"/></g>',
  bottle:'<rect x="77" y="27" width="46" height="18" rx="5" fill="#5c6765"/><path d="M81 44v14c0 9-15 13-15 26v77q0 14 34 14t34-14V84c0-13-15-17-15-26V44z" fill="#a9b2b0"/><path d="M77 81v76q0 8 11 10V76" fill="#d8dfdb"/><path d="M123 79v80" stroke="#85938e" stroke-width="4" stroke-linecap="round"/><rect x="82" y="104" width="37" height="34" rx="6" fill="#e5cf9b"/><path d="M89 126l10-13 11 13z" fill="#7b9160"/>',
  hoodie:'<path d="M73 56q-7-38 27-38t27 38l21 11 28 70-22 10-17-41 5 63H58l5-63-17 41-22-10 28-70z" fill="#9b9b9f"/><path d="M74 56q26 22 52 0q-4-32-26-32T74 56" fill="#c7c7c8"/><path d="M84 51q16-18 32 0q-5 24-16 24T84 51" fill="#757980"/><path d="M87 72v30m26-30v30" stroke="#e6e3df" stroke-width="3" stroke-linecap="round"/><path d="M79 122h42l10 28H69z" fill="#b8b7b9"/><path d="M62 165h76" stroke="#85868b" stroke-width="7"/>',
  card:'<g transform="rotate(-12 100 100)"><rect x="32" y="55" width="136" height="88" rx="9" fill="#e7ecec" stroke="#a7b8bc" stroke-width="2"/><path d="M32 64q0-9 9-9h118q9 0 9 9v13H32" fill="#4d7588"/><rect x="47" y="90" width="31" height="36" rx="3" fill="#becfd2"/><circle cx="63" cy="100" r="6" fill="#8faab1"/><path d="M53 120v-5a10 10 0 0120 0v5" fill="#8faab1"/><path d="M93 97h55m-55 12h39m-39 12h46" stroke="#aabcc0" stroke-width="4" stroke-linecap="round"/></g>',
  charger:'<path d="M68 89q-34-11-24-42q10-23 31-10t2 41q-9 16 14 28l22 11q39 13 36 41q-2 20-25 10" fill="none" stroke="#9aa6a2" stroke-width="5" stroke-linecap="round"/><g transform="rotate(-13 105 96)"><rect x="79" y="59" width="61" height="62" rx="11" fill="#e0e4de" stroke="#adb9b2" stroke-width="2"/><path d="M96 46v13m26-13v13" stroke="#9aa5a0" stroke-width="6"/><path d="M99 73h22m-22 6h14" stroke="#a6b3ab" stroke-width="2"/></g><rect x="109" y="158" width="19" height="11" rx="3" fill="#687c6f"/>'
};
function illustration(icon) { return `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">${drawings[icon] || drawings.bag}</svg>`; }
function visual(item) { const photo=safePhoto(item.photo); return photo?`<img src="${photo}" alt="Photo of ${esc(item.title)}">`:illustration(item.icon); }
const pin='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 6c0 4-5 8-5 8S3 10 3 6a5 5 0 0110 0z"/><circle cx="8" cy="6" r="1.6"/></svg>';
const dateLabel = date => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(date+'T12:00:00'));
let storage;
try { storage=window.localStorage; } catch { storage={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}}; }
let state = loadState(storage), mine=false, photoData='', photoBusy=false, toastTimer, activeItemId=null;
function save(next) {
  try { persist(storage,next); state=next; updateMyCount(); return true; }
  catch { toast('Could not save. Browser storage may be full or disabled. Try a smaller photo.'); return false; }
}
function toast(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; toastTimer=setTimeout(()=>$('toast').hidden=true,7000); }
function fillOptions(id,list) { list.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;$(id).append(option);}); }
for(const id of ['category','report-category']) fillOptions(id,CATEGORIES);
for(const id of ['location','report-location']) fillOptions(id,LOCATIONS);
$('date').value=TODAY; $('date').max=TODAY;
$('hero-bag').innerHTML=illustration('bag'); $('guide-keys').innerHTML=illustration('keys');
function updateMyCount(){ $('my-count').textContent=state.myIds.length; }
function render() {
  const items=filterItems(state.items,{query:$('search').value,category:$('category').value,location:$('location').value,status:$('status').value,mine,myIds:state.myIds});
  $('list-title').textContent=mine?'Your good deeds, all in one place.':'Your things might be here.';
  $('list-subtitle').textContent=mine?'Reports you added in this browser. Use the filters to find one.':'Browse recent finds or narrow down your search.';
  $('result-count').textContent=`${items.length} ${items.length===1?'item':'items'} ${mine?'in your reports':'on the noticeboard'}`;
  $('items-grid').innerHTML=items.map(item=>`<button class="item-card" data-item="${esc(item.id)}" aria-label="View ${esc(item.title)}, ${esc(item.location)}, ${item.status==='returned'?'returned':'available to claim'}"><div class="item-visual tone-${esc(item.tone || 'sage')}">${visual(item)}${item.sample?'<span class="sample-tag">SAMPLE</span>':''}</div><div class="card-body"><div class="card-meta"><span class="status-pill ${item.status==='returned'?'returned':''}">${item.status==='returned'?'RETURNED':'FOUND'}</span><span class="card-date">${dateLabel(item.date)}</span></div><h3>${esc(item.title)}</h3><div class="card-location">${pin}${esc(item.location)}</div><div class="card-bottom"><span>${esc(item.category)}</span><span aria-hidden="true">↗</span></div></div></button>`).join('');
  $('empty-state').hidden=items.length>0;
  if(mine && !state.myIds.length) $('empty-state').innerHTML='<div aria-hidden="true">＋</div><h3>Your first good deed starts here.</h3><p>You haven’t added a report in this browser yet.</p><button class="button light" id="first-report">Report a found item</button>';
  else $('empty-state').innerHTML='<div aria-hidden="true">⌕</div><h3>No items found yet.</h3><p>Try fewer words or a different category and location.</p><button class="button light" id="empty-reset">Clear search & filters</button>';
}
function clearFilters(){ $('search').value='';$('category').value='';$('location').value='';$('status').value='available';render(); }
function setTab(name) {
  for(const key of ['browse','report']){const selected=key===name;$(key+'-panel').hidden=!selected;$(key+'-tab').setAttribute('aria-selected',String(selected));$(key+'-tab').tabIndex=selected?0:-1;$(key+'-tab').classList.toggle('active',selected);}
}
// Navigation keeps an unfinished report in place, so students can return to it.
function goTab(name,scroll=false){setTab(name);if(scroll)document.querySelector('.workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
$('browse-tab').addEventListener('click',()=>{mine=false;render();goTab('browse');});
$('report-tab').addEventListener('click',()=>goTab('report'));
document.querySelector('.workspace-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const name=event.key==='Home'?'browse':event.key==='End'?'report':$('browse-tab').getAttribute('aria-selected')==='true'?'report':'browse';goTab(name);$(name+'-tab').focus();});
for(const id of ['header-report','hero-report']) $(id).addEventListener('click',()=>goTab('report',true));
$('hero-find').addEventListener('click',()=>{mine=false;render();goTab('browse',true);$('search').focus({preventScroll:true});});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();mine=false;clearFilters();goTab('browse');window.scrollTo({top:0,behavior:'smooth'});});
$('cancel-report').addEventListener('click',()=>{mine=false;render();goTab('browse');$('browse-tab').focus();});
$('my-btn').addEventListener('click',()=>{mine=true;clearFilters();$('status').value='';render();goTab('browse',true);});
$('clear-filters').addEventListener('click',clearFilters);
$('results-reset').addEventListener('click',clearFilters);
$('search').addEventListener('input',render);
$('search-form').addEventListener('submit',event=>{event.preventDefault();render();});
for(const id of ['category','location','status']) $(id).addEventListener('change',render);
$('empty-state').addEventListener('click',event=>{if(event.target.closest('#empty-reset'))clearFilters();if(event.target.closest('#first-report'))goTab('report');});
$('items-grid').addEventListener('click',event=>{const card=event.target.closest('[data-item]');if(card)openItem(card.dataset.item);});
for(const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}
function openItem(id){
  const item=state.items.find(i=>i.id===id); if(!item)return; activeItemId=id;
  const flagged=state.flags.includes(id);
  $('detail-content').innerHTML=`<div class="dialog-visual tone-${esc(item.tone || 'sage')}">${visual(item)}</div><div class="dialog-body"><div class="eyebrow">${item.sample?'DEMONSTRATION LISTING':'YOUR LOCAL REPORT'}</div><h2 id="detail-title">${esc(item.title)}</h2><span class="status-pill ${item.status==='returned'?'returned':''}">${item.status==='returned'?'RETURNED TO OWNER':'AVAILABLE TO CLAIM'}</span><dl class="detail-facts"><div><dt>Found at</dt><dd>${esc(item.location)}</dd></div><div><dt>Date found</dt><dd>${dateLabel(item.date)} ${item.date.slice(0,4)}</dd></div><div><dt>Category</dt><dd>${esc(item.category)}</dd></div><div><dt>Handover</dt><dd>${item.handover==='Campus staff'?'With campus staff':'Kept safely by finder'}</dd></div></dl><p class="dialog-description">${esc(item.description)}</p><div class="detail-actions" style="margin-top:22px">${item.status==='available'?'<button class="button" id="claim-btn">This might be mine <span aria-hidden="true">→</span></button>':'<span class="dialog-description">This item has found its way home.</span>'}<button class="clear-link" id="flag-btn">${flagged?'Flag saved (demo)':'Report this listing'}</button></div><p class="dialog-hint">Confirm one identifying detail before arranging a safe return.</p><div id="claim-area"></div></div>`;
  if(item.status==='available') $('claim-btn').addEventListener('click',showClaim);
  $('flag-btn').addEventListener('click',()=>{if(save(flagItem(state,id))){$('flag-btn').textContent='Flag saved (demo)';toast('Listing flagged in this browser’s coordinator demo.');}});
  if(!$('detail-dialog').open)$('detail-dialog').showModal();
}
function showClaim(){
  $('claim-btn').disabled=true;
  $('claim-area').innerHTML='<form class="claim-form" id="claim-form" novalidate><h3>Help confirm it’s yours</h3><p>Demo only. No email or claim is sent to anyone.</p><label for="proof">A detail only the owner would know *</label><textarea id="proof" rows="3" maxlength="400" required placeholder="e.g. Brand, engraving or something inside the bag" aria-describedby="proof-error"></textarea><small class="field-error" id="proof-error"></small><label for="claim-email">Your university email *</label><input id="claim-email" type="email" required maxlength="150" placeholder="Your university email" aria-describedby="email-error"><small class="field-error" id="email-error"></small><div class="form-actions"><button type="button" class="button light" id="claim-cancel">Cancel</button><button type="submit" class="button">Save demo claim</button></div></form>';
  $('proof').focus();
  $('claim-cancel').addEventListener('click',()=>{$('claim-area').innerHTML='';$('claim-btn').disabled=false;$('claim-btn').focus();});
  $('claim-form').addEventListener('submit',event=>{
    event.preventDefault();
    const result=createClaim(state,activeItemId,{proof:$('proof').value,email:$('claim-email').value});
    for(const key of ['proof','email']){const input=$(key==='email'?'claim-email':'proof');$(key+'-error').textContent=result.errors?.[key] || '';input.setAttribute('aria-invalid',String(!!result.errors?.[key]));}
    if(result.errors){if(result.errors.item)toast(result.errors.item);else $(result.errors.proof?'proof':'claim-email').focus();return;}
    if(save(result.state)){$('claim-area').innerHTML='<div class="success-box" tabindex="-1" id="claim-success"><strong>Demo claim saved ✓</strong>Your details are saved in this browser’s coordinator view. No message was sent. A real service would let staff verify the claim before sharing collection instructions.</div>';$('claim-success').focus();}
  });
}
function clearReportErrors(){for(const key of ['title','category','location','date','description','handover','consent','photo'])$(key+'-error').textContent='';$('report-errors').hidden=true;for(const field of $('report-form').querySelectorAll('[aria-invalid]'))field.removeAttribute('aria-invalid');}
function showReportErrors(errors){
  clearReportErrors(); const fieldIds={title:'title',category:'report-category',location:'report-location',date:'date',description:'description',handover:'handover',consent:'consent',photo:'photo'};
  $('report-errors').textContent='Please check the highlighted fields before adding your item.';$('report-errors').hidden=false;
  for(const [key,message] of Object.entries(errors)){if($(key+'-error'))$(key+'-error').textContent=message;if($(fieldIds[key]))$(fieldIds[key]).setAttribute('aria-invalid','true');}
  const first=fieldIds[Object.keys(errors)[0]]; if(first)$(first).focus();
}
$('description').addEventListener('input',()=>$('description-count').textContent=`${$('description').value.length} / 600`);
function removePhoto(){photoData='';$('photo').value='';$('photo-preview').hidden=true;$('photo-preview').innerHTML='';$('remove-photo').hidden=true;$('photo-error').textContent='';$('photo').removeAttribute('aria-invalid');}
$('remove-photo').addEventListener('click',removePhoto);
$('photo').addEventListener('change',async()=>{
  photoData='';$('photo-preview').hidden=true;$('remove-photo').hidden=true;$('photo-error').textContent='';$('photo').removeAttribute('aria-invalid');
  const file=$('photo').files[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){$('photo-error').textContent='Choose a JPG, PNG or WebP image under 2 MB.';$('photo').setAttribute('aria-invalid','true');$('photo').value='';return;}
  photoBusy=true;$('submit-report').disabled=true;$('photo').disabled=true;
  let url;
  try{
    url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas'),scale=Math.min(1,800/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);photoData=canvas.toDataURL('image/jpeg',.75);
    $('photo-preview').innerHTML=`<img src="${photoData}" alt="Preview of your found-item photo">`;$('photo-preview').hidden=false;$('remove-photo').hidden=false;
  }catch{$('photo-error').textContent='This image could not be opened. Choose another photo.';$('photo').value='';}
  finally{if(url)URL.revokeObjectURL(url);photoBusy=false;$('submit-report').disabled=false;$('photo').disabled=false;}
});
$('report-form').addEventListener('submit',event=>{
  event.preventDefault();if(photoBusy)return;
  const data={title:$('title').value,category:$('report-category').value,location:$('report-location').value,date:$('date').value,description:$('description').value,handover:$('handover').value,consent:$('consent').checked,photo:photoData};
  const result=createReport(state,data,crypto.randomUUID());
  if(result.errors){showReportErrors(result.errors);return;}
  if(!save(result.state))return;
  clearReportErrors();$('report-form').reset();$('date').value=TODAY;$('description-count').textContent='0 / 600';removePhoto();mine=false;clearFilters();goTab('browse',true);openItem(result.item.id);toast('Found item added ✓ You can find it in My reports.');
});
const howContent=`<div class="info-body"><div class="eyebrow">A SMALL ACT OF CAMPUS KINDNESS</div><h2 id="info-title">From lost to found.</h2><p>One place to look, one simple way to help.</p><ol><li><strong>Lost something?</strong> Search the noticeboard. Filter by category or the place you last saw it.</li><li><strong>Recognise it?</strong> Open a card to check the photo, date and description. Choose “This might be mine” and describe a detail only the owner would know.</li><li><strong>Found something?</strong> Add a short report, with a photo if you have one. Keep personal information out of the post.</li><li><strong>Give it back safely.</strong> In the planned service, campus staff would check the claim and help arrange collection.</li></ol><div class="note-block">This Stage 1 prototype uses sample listings. Reports, claims and flags are stored only in this browser. Claims do not send emails, and the coordinator view is a simulation.</div><button class="button" id="how-start" style="margin-top:22px">Search the noticeboard <span aria-hidden="true">→</span></button></div>`;
$('how-btn').addEventListener('click',()=>{$('info-content').innerHTML=howContent;$('info-dialog').showModal();$('how-start').addEventListener('click',()=>{$('info-dialog').close();mine=false;render();goTab('browse',true);$('search').focus({preventScroll:true});});});
$('project-btn').addEventListener('click',()=>{
  $('info-content').innerHTML=`<div class="info-body"><div class="eyebrow">AITU · ICT PROJECT STAGE 1</div><h2 id="info-title">Designed around students.</h2><p>Team: Alua, Arailym and Adiya. This interactive interface supports the project’s two key tasks and its planned user groups.</p><div class="info-stats"><div><b>102</b><span>Student Survey responses</span></div><div><b>54</b><span>Chose search as the most useful feature</span></div><div><b>36</b><span>Do not know where to report an item</span></div></div><p style="margin-top:15px;font-size:11px">Survey export, 4–5 October 2026. 71 respondents have lost an item; 68 have found one. 90 selected “Definitely yes” or “Probably yes” to using this service (88.2%). One additional response was conditional.</p><h3>Two user groups</h3><ul><li><strong>Students:</strong> find their belongings, post found items and provide identifying details for a claim.</li><li><strong>Campus coordinator:</strong> review flagged listings and demo claims, and mark an item as returned.</li></ul><h3>Prototype scope</h3><table class="scope-table"><thead><tr><th>Included here</th><th>Planned / outside this prototype</th></tr></thead><tbody><tr><td>Search, categories, campus locations and status filters</td><td>Automatic matching and notifications</td></tr><tr><td>Item details, photo upload, found-item form and My reports</td><td>Shared database and university sign-in</td></tr><tr><td>Local claim, flag and coordinator demonstrations</td><td>Real messaging, identity checks and physical delivery</td></tr></tbody></table><h3>Part D: screen annotations</h3><ul><li><strong>Find my item:</strong> recognition rather than recall (visible photos and categories); user control and freedom (filters, reset and closing details).</li><li><strong>Report a found item:</strong> error prevention (required fields and date validation); visibility of system status (field errors and save confirmation).</li><li><strong>Accessibility:</strong> labelled controls, keyboard tabs, visible focus, native modal focus handling and a responsive layout for a 360 px phone. Form controls and main actions have at least 44 px touch targets.</li></ul><h3>Proposed success checks</h3><ul><li>Find a sample item using a keyword and location filter.</li><li>Complete a valid found-item report, then reopen it from My reports.</li><li>Use both screens at 360 px width without horizontal page scrolling.</li></ul><div class="note-block">Stage 1 asks for a concept, requirements and architecture. This optional prototype demonstrates the interface. Sites provides private cloud hosting; the planned shared data service and campus authentication belong to Stage 2.</div><button class="button light" id="project-coordinator" style="margin-top:20px">Open coordinator demo <span aria-hidden="true">→</span></button></div>`;
  $('info-dialog').showModal();$('project-coordinator').addEventListener('click',()=>{$('info-dialog').close();openCoordinator();});
});
function openCoordinator(){
  $('coordinator-content').innerHTML=`<div class="info-body"><div class="eyebrow">LOCAL SIMULATION · NO STAFF ACCOUNT</div><h2 id="coordinator-title">Coordinator desk.</h2><p>Review this browser’s reports and claims. In the planned service, only authorised campus staff could use this screen.</p><h3>Demo claims (${state.claims.length})</h3>${state.claims.length?state.claims.map(claim=>`<div class="coordinator-claim"><strong>${esc(state.items.find(i=>i.id===claim.itemId)?.title || 'Item')}</strong><p>${esc(claim.proof)}</p><p>Contact: ${esc(claim.email)}</p></div>`).join(''):'<p class="dialog-description">No claims yet. Open an available item and save a demo claim.</p>'}<h3>Flagged listings (${state.flags.length})</h3>${state.flags.length?state.flags.map(id=>`<p class="coordinator-claim">${esc(state.items.find(i=>i.id===id)?.title || 'Unknown item')} · flagged for review</p>`).join(''):'<p class="dialog-description">No listings flagged in this browser.</p>'}<h3>Item handovers</h3>${state.items.map(item=>`<div class="coordinator-row"><div><strong>${esc(item.title)}</strong><p>${esc(item.location)} · ${item.status==='returned'?'Returned':'Available'}${item.sample?' · Sample':''}</p></div>${item.status==='available'?`<button class="button light" data-return="${esc(item.id)}">Mark returned</button>`:'<span class="status-pill returned">RETURNED</span>'}</div>`).join('')}<div class="note-block">This changes only your local demonstration. A real service would verify ownership before confirming a handover.</div></div>`;
  if(!$('coordinator-dialog').open)$('coordinator-dialog').showModal();
}
$('coordinator-btn').addEventListener('click',openCoordinator);
$('coordinator-content').addEventListener('click',event=>{const button=event.target.closest('[data-return]');if(button && save(markReturned(state,button.dataset.return))){openCoordinator();render();toast('Item marked as returned in this browser.');}});
updateMyCount();render();
