import { CATEGORIES, LOCATIONS, TODAY, filterItems, validateReport, formatEventDate } from './model.js';
import {renderItemVisual} from './media.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
const visual=renderItemVisual;

const {api}=await import('./api.js');
const pin='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 6c0 4-5 8-5 8S3 10 3 6a5 5 0 0110 0z"/><circle cx="8" cy="6" r="1.6"/></svg>';
const dateLabel=formatEventDate;
let categoryNames=[...CATEGORIES],user=null,items=[],mine=false,photoData='',photoBusy=false,toastTimer,authMode='login',afterAuth=null,activeItemId=null,detailTicket=0;
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,7000);}
function errorToast(error){toast(error.message||'Please try again.');}
function options(id,values){for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value;$(id).append(option);}}
for(const id of ['category','report-category'])options(id,CATEGORIES);
for(const id of ['location','report-location'])options(id,LOCATIONS);
$('date').value=TODAY;$('date').max=TODAY;$('hero-bag').innerHTML=illustration('bag');updateGuidePhoto();
function updateGuidePhoto(){
  $('guide-photo').innerHTML=visual({id:'draft',title:'your item',photo:photoData});
  $('guide-photo-caption').textContent=photoData?'Your photo preview':'Add a photo to preview your item.';
}
function updateAccount(){
  $('guest-actions').hidden=!!user;$('user-actions').hidden=!user;
  $('account-label').textContent=user?`Hi, ${user.name}. ${user.isAdmin?'Coordinator account.':'Your campus account is ready.'}`:'Sign in to post items and view contact details.';
  $('my-count').textContent=user?items.filter(i=>i.userId===user.id).length:0;
  $('report-login-note').hidden=!!user;
  $('coordinator-btn').innerHTML=(user?.isAdmin?'Coordinator desk':'Manage reports')+' <span aria-hidden="true">↗</span>';
  if(user){if(!$('contact-name').value)$('contact-name').value=user.name;if(!$('contact-email').value)$('contact-email').value=user.email;}
}
function render(){
  const shown=filterItems(items,{query:$('search').value,category:$('category').value,location:$('location').value,reportType:$('status').value,mine,myIds:user?items.filter(i=>i.userId===user.id).map(i=>i.id):[]});
  $('list-title').textContent=mine?'Your good deeds, all in one place.':'Your things might be here.';
  $('list-subtitle').textContent=mine?'Reports saved to your account.':'Browse recent finds or narrow down your search.';
  $('result-count').textContent=`${shown.length} ${shown.length===1?'item':'items'} ${mine?'in your reports':'on the noticeboard'}`;
  const previousIds=new Set(Array.from($('items-grid').children,card=>card.dataset.item));
  $('items-grid').innerHTML=shown.map(item=>`<button class="item-card${previousIds.has(String(item.id))?'':' item-enter'}" data-item="${esc(item.id)}" aria-label="View ${esc(item.title)}, ${esc(item.location)}"><div class="item-visual tone-${esc(item.tone||'sage')}">${visual(item)}${item.sample?'<span class="sample-tag">SAMPLE</span>':''}</div><div class="card-body"><div class="card-meta"><span class="status-pill ${item.reportType==='lost'?'lost':''}">${item.reportType==='lost'?'LOST':'FOUND'}</span><span class="card-date">${dateLabel(item.date)}</span></div><h3>${esc(item.title)}</h3><div class="card-location">${pin}${esc(item.location)}</div><div class="card-bottom"><span>${esc(item.category)}${item.status==='returned'?' · Returned':''}</span><span aria-hidden="true">↗</span></div></div></button>`).join('');
  $('empty-state').hidden=shown.length>0;
  $('empty-state').innerHTML=mine&&!items.some(i=>i.userId===user?.id)?'<div aria-hidden="true">＋</div><h3>No reports in your account yet.</h3><p>Lost or found something? Add a report to the noticeboard.</p><button class="button light" id="first-report">Report an item</button>':'<div aria-hidden="true">⌕</div><h3>No matching items yet.</h3><p>Try fewer words or another location. New reports appear here.</p><button class="button light" id="empty-reset">Clear search & filters</button>';
  updateAccount();
}
async function refresh(){const result=await api('items');items=result.items;render();}
async function boot(){
  $('connection-badge').textContent='CONNECTING';$('connection-message').textContent='Loading the shared campus noticeboard…';$('retry-btn').hidden=true;
  try{const [account,board,categoryData]=await Promise.all([api('session'),api('items'),api('categories')]);categoryNames=categoryData.categories.map(c=>c.name);for(const id of ['category','report-category']){const select=$(id);while(select.options.length>1)select.remove(1);options(id,categoryNames);}user=account.user;items=board.items;render();$('connection-badge').textContent='CONNECTED';$('connection-message').textContent='Shared campus noticeboard. Photos and reports are saved; contact details are shown after sign-in.';}
  catch(error){$('connection-badge').textContent='OFFLINE';$('connection-message').textContent=error.message;$('retry-btn').hidden=false;$('result-count').textContent='Could not load listings.';}
}
$('retry-btn').addEventListener('click',boot);
function goTab(name,scroll=false){for(const key of ['browse','report']){const selected=key===name;$(key+'-panel').hidden=!selected;$(key+'-tab').setAttribute('aria-selected',String(selected));$(key+'-tab').tabIndex=selected?0:-1;$(key+'-tab').classList.toggle('active',selected);}if(scroll)document.querySelector('.workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function clearFilters(){for(const id of ['search','category','location'])$(id).value='';$('status').value='';render();}
$('browse-tab').addEventListener('click',()=>{mine=false;render();goTab('browse');});$('report-tab').addEventListener('click',()=>goTab('report'));
document.querySelector('.workspace-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const name=event.key==='Home'?'browse':event.key==='End'?'report':$('browse-tab').getAttribute('aria-selected')==='true'?'report':'browse';goTab(name);$(name+'-tab').focus();});
for(const id of ['header-report','hero-report'])$(id).addEventListener('click',()=>goTab('report',true));
$('hero-find').addEventListener('click',()=>{mine=false;render();goTab('browse',true);$('search').focus({preventScroll:true});});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();mine=false;clearFilters();goTab('browse');window.scrollTo({top:0,behavior:'auto'});});
$('cancel-report').addEventListener('click',()=>{mine=false;render();goTab('browse');$('browse-tab').focus();});
$('my-btn').addEventListener('click',()=>{if(!user){openAuth('login',()=>{$('my-btn').click();});return;}mine=true;clearFilters();$('status').value='';render();goTab('browse',true);});
for(const id of ['clear-filters','results-reset'])$(id).addEventListener('click',clearFilters);
$('search').addEventListener('input',render);$('search-form').addEventListener('submit',event=>{event.preventDefault();render();});
for(const id of ['category','location','status'])$(id).addEventListener('change',render);
$('empty-state').addEventListener('click',event=>{if(event.target.closest('#empty-reset'))clearFilters();if(event.target.closest('#first-report'))goTab('report');});
$('items-grid').addEventListener('click',event=>{const card=event.target.closest('[data-item]');if(card)openItem(card.dataset.item);});
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});}

function openAuth(mode='login',continuation=null){
  authMode=mode;afterAuth=continuation;
  $('auth-title').textContent=mode==='register'?'Join your campus noticeboard.':'Welcome back.';$('auth-name-wrap').hidden=mode!=='register';$('auth-name').required=mode==='register';
  $('auth-submit').textContent=mode==='register'?'Create account':'Sign in';$('auth-switch').textContent=mode==='register'?'Already registered? Sign in':'New here? Create an account';
  $('auth-password').autocomplete=mode==='register'?'new-password':'current-password';$('auth-password').value='';$('auth-error').hidden=true;
  for(const key of ['name','email','password']){$('auth-'+key+'-error').textContent='';$('auth-'+key).removeAttribute('aria-invalid');}
  if(!$('auth-dialog').open)$('auth-dialog').showModal();
}
$('login-btn').addEventListener('click',()=>openAuth('login'));$('register-btn').addEventListener('click',()=>openAuth('register'));
$('auth-switch').addEventListener('click',()=>openAuth(authMode==='login'?'register':'login',afterAuth));
$('auth-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('auth-submit');button.disabled=true;$('auth-error').hidden=true;
  for(const key of ['name','email','password']){$('auth-'+key+'-error').textContent='';$('auth-'+key).removeAttribute('aria-invalid');}
  try{const result=await api(authMode,{method:'POST',data:{name:$('auth-name').value,email:$('auth-email').value,password:$('auth-password').value}});user=result.user;$('auth-password').value='';$('auth-dialog').close();await refresh();toast(authMode==='register'?'Account created. You are signed in.':'Signed in successfully.');const continuation=afterAuth;afterAuth=null;if(continuation)await continuation();}
  catch(error){$('auth-error').textContent=error.message;$('auth-error').hidden=false;for(const [key,message] of Object.entries(error.errors||{})){if($('auth-'+key+'-error')){$('auth-'+key+'-error').textContent=message;$('auth-'+key).setAttribute('aria-invalid','true');}}}
  finally{button.disabled=false;}
});
$('logout-btn').addEventListener('click',async()=>{try{await api('logout',{method:'POST'});user=null;mine=false;for(const id of ['detail-dialog','coordinator-dialog'])if($(id).open)$(id).close();for(const id of ['contact-name','contact-email','contact-phone','contact-telegram'])$(id).value='';$('contact-consent').checked=false;await refresh();toast('Signed out.');}catch(error){errorToast(error);}});
async function deleteReport(id,title){
  if(!window.confirm(`Delete this report?\n\n${title}\n\nThe report, its photo and saved claims will be permanently removed.`))return false;
  await api('delete',{method:'POST',data:{itemId:id}});
  if(activeItemId===id){++detailTicket;activeItemId=null;if($('detail-dialog').open)$('detail-dialog').close();$('my-btn').focus();}
  items=items.filter(item=>item.id!==id);render();toast('Report deleted.');return true;
}
function contactMarkup(item){
  if(item.sample)return '<div class="contact-box"><strong>Sample listing</strong><p>No real contact person is attached to this example.</p></div>';
  if(!item.contact)return '<div class="contact-box"><strong>Contact the person who posted this</strong><p>Sign in to view their contact name, email, phone or Telegram.</p><button class="button light" id="contact-signin">Sign in to view contacts</button></div>';
  const c=item.contact;
  return `<div class="contact-box"><h3>Contact the ${item.reportType==='lost'?'owner':'finder'}</h3><p class="contact-person">${esc(c.name)}</p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>${c.phone?`<a href="tel:${esc(c.phone.replace(/[^+0-9]/g,''))}">${esc(c.phone)}</a>`:''}${c.telegram?`<a href="https://t.me/${encodeURIComponent(c.telegram)}" target="_blank" rel="noopener noreferrer">Telegram: @${esc(c.telegram)}</a>`:''}<small>Contact details are provided by the poster. Meet on campus and confirm an identifying detail.</small></div>`;
}
async function openItem(id){
  const ticket=++detailTicket;
  try{
    const {item}=await api('item',{id});if(ticket!==detailTicket)return;activeItemId=id;
    $('detail-content').innerHTML=`<div class="dialog-visual tone-${esc(item.tone||'sage')}">${visual(item)}</div><div class="dialog-body"><div class="eyebrow">${item.sample?'SAMPLE LISTING':'CAMPUS NOTICEBOARD'}</div><h2 id="detail-title">${esc(item.title)}</h2><span class="status-pill ${item.reportType==='lost'?'lost':''}">${item.reportType==='lost'?'LOST':'FOUND'}</span><dl class="detail-facts"><div><dt>${item.reportType==='lost'?'Last seen at':'Found at'}</dt><dd>${esc(item.location)}</dd></div><div><dt>${item.reportType==='lost'?'Date lost':'Date found'}</dt><dd>${dateLabel(item.date)} ${item.date.slice(0,4)}${item.eventTime?' · '+esc(item.eventTime):' · Time not specified'}</dd></div><div><dt>Category</dt><dd>${esc(item.category)}</dd></div><div><dt>${item.reportType==='lost'?'Return preference':'Handover'}</dt><dd>${!item.handover?'Not specified':item.reportType==='lost'?(item.handover==='Campus staff'?'Through campus staff':'Arrange with the owner'):(item.handover==='Campus staff'?'With campus staff':'Kept safely by finder')}</dd></div></dl><p class="dialog-description">${esc(item.description)}</p>${item.status==='returned'?'<p class="resolved-note">This item has been returned to its owner.</p>':''}${contactMarkup(item)}<div class="detail-actions" style="margin-top:22px">${item.status==='available'&&!item.sample?item.canManage?'<button class="button" id="owner-return">Mark as returned</button>':item.reportType==='lost'?'<span class="dialog-description">Found it? Contact the owner above.</span>':'<button class="button" id="claim-btn">This might be mine <span aria-hidden="true">→</span></button>':'<span class="dialog-description">'+(item.status==='returned'?'This item has found its way home.':'Example item for the project.')+'</span>'}${item.canManage?'<button class="button light danger" id="delete-report">Delete report</button>':''}<button class="clear-link" id="flag-btn">${item.flagged?'Flag submitted':'Report this listing'}</button></div><div id="claim-area"></div></div>`;
    $('contact-signin')?.addEventListener('click',()=>openAuth('login',()=>openItem(id)));
    $('claim-btn')?.addEventListener('click',()=>{if(!user){openAuth('login',async()=>{await openItem(id);showClaim();});return;}showClaim();});
    $('owner-return')?.addEventListener('click',async event=>{event.target.disabled=true;try{await api('returned',{method:'POST',data:{itemId:id}});await refresh();await openItem(id);toast('Item marked as returned.');}catch(error){event.target.disabled=false;errorToast(error);}});
    $('delete-report')?.addEventListener('click',async event=>{const button=event.target;button.disabled=true;try{await deleteReport(id,item.title);}catch(error){errorToast(error);}finally{button.disabled=false;}});
    $('flag-btn').addEventListener('click',async event=>{if(!user){openAuth('login',()=>openItem(id));return;}const button=event.target;button.disabled=true;try{await api('flag',{method:'POST',data:{itemId:id}});button.textContent='Flag submitted';toast('Listing reported to the coordinator.');}catch(error){errorToast(error);}finally{button.disabled=false;}});
    if(!$('detail-dialog').open)$('detail-dialog').showModal();
  }catch(error){errorToast(error);}
}
function showClaim(){
  if(!$('claim-btn')||!user)return;$('claim-btn').disabled=true;
  $('claim-area').innerHTML=`<form class="claim-form" id="claim-form" novalidate><h3>Help confirm it’s yours</h3><p>Your claim is saved for the finder and coordinator. No email is sent automatically.</p><label for="proof">A detail only the owner would know *</label><textarea id="proof" rows="3" maxlength="400" required placeholder="Brand, engraving or something inside the bag" aria-describedby="proof-error"></textarea><small class="field-error" id="proof-error"></small><p>Reply email: ${esc(user.email)}</p><div id="claim-error" class="error-summary" role="alert" hidden></div><div class="form-actions"><button type="button" class="button light" id="claim-cancel">Cancel</button><button type="submit" class="button" id="claim-submit">Send claim</button></div></form>`;$('proof').focus();
  $('claim-cancel').addEventListener('click',()=>{$('claim-area').innerHTML='';$('claim-btn').disabled=false;$('claim-btn').focus();});
  $('claim-form').addEventListener('submit',async event=>{event.preventDefault();$('claim-submit').disabled=true;try{await api('claim',{method:'POST',data:{itemId:activeItemId,proof:$('proof').value}});$('claim-area').innerHTML='<div class="success-box" tabindex="-1" id="claim-success"><strong>Claim sent ✓</strong>The finder can now read your identifying detail and reply email in Manage reports. You can also use the contact details above to arrange a safe return.</div>';$('claim-success').focus();}catch(error){$('claim-submit').disabled=false;$('claim-error').textContent=error.message;$('claim-error').hidden=false;$('proof-error').textContent=error.errors?.proof||'';}});
}
const reportFields={reportType:'report-type',title:'title',category:'report-category',location:'report-location',date:'date',eventTime:'event-time',description:'description',handover:'handover',consent:'consent',photo:'photo',contactName:'contact-name',contactEmail:'contact-email',contactPhone:'contact-phone',contactTelegram:'contact-telegram',contactConsent:'contact-consent'};
function clearReportErrors(){for(const key of Object.keys(reportFields))$(key+'-error').textContent='';$('report-errors').hidden=true;for(const field of $('report-form').querySelectorAll('[aria-invalid]'))field.removeAttribute('aria-invalid');}
function showReportErrors(errors,message='Please check the highlighted fields.'){
  clearReportErrors();$('report-errors').textContent=message;$('report-errors').hidden=false;
  for(const [key,message] of Object.entries(errors)){if($(key+'-error'))$(key+'-error').textContent=message;if($(reportFields[key]))$(reportFields[key]).setAttribute('aria-invalid','true');}
  const first=reportFields[Object.keys(errors)[0]];if(first)$(first).focus();
}
function updateReportType(){
  const lost=$('report-type').value==='lost';
  $('report-heading').textContent=lost?'Lost something on campus?':'Found something on campus?';
  $('report-intro-title').textContent=lost?'Tell us what you lost':'Tell us what you found';
  $('event-time-label').innerHTML=(lost?'Time lost':'Time found')+' <span>*</span>';
  $('date-label').innerHTML=(lost?'Date lost':'Date found')+' <span>*</span>';
  $('report-location-label').innerHTML=(lost?'Where did you last see it?':'Where did you find it?')+' <span>*</span>';
  $('contact-legend').textContent=lost?'How can the finder contact you?':'Who should the owner contact?';
  $('handover-label').innerHTML=(lost?'Preferred return method':'Safe handover')+' <span>*</span>';
  const choices=$('handover').options;
  choices[0].textContent=lost?'Return through campus staff':'I handed it to campus staff';
  choices[1].textContent=lost?'Contact me to arrange collection':'I will keep it safely until collection';
  $('description').placeholder=lost?'Describe the item and where you last saw it. Keep one identifying detail private.':'Colour, item type and where it was left. Keep one identifying detail private for the owner to confirm.';
}
$('report-type').addEventListener('change',updateReportType);
updateReportType();
$('description').addEventListener('input',()=>$('description-count').textContent=`${$('description').value.length} / 600`);
function removePhoto(){photoData='';updateGuidePhoto();$('photo').value='';$('photo-preview').hidden=true;$('photo-preview').innerHTML='';$('remove-photo').hidden=true;$('photo-error').textContent='';$('photo').removeAttribute('aria-invalid');}
$('remove-photo').addEventListener('click',removePhoto);
$('photo').addEventListener('change',async()=>{
  photoData='';updateGuidePhoto();$('photo-preview').hidden=true;$('remove-photo').hidden=true;$('photo-error').textContent='';$('photo').removeAttribute('aria-invalid');const file=$('photo').files[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){$('photo-error').textContent='Choose a JPG, PNG or WebP image under 2 MB.';$('photo').setAttribute('aria-invalid','true');$('photo').value='';return;}
  photoBusy=true;$('submit-report').disabled=true;$('photo').disabled=true;let url;
  try{url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas'),scale=Math.min(1,800/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const webp=canvas.toDataURL('image/webp',.8);photoData=webp.startsWith('data:image/webp;')?webp:canvas.toDataURL('image/jpeg',.75);updateGuidePhoto();$('photo-preview').innerHTML=`<img src="${photoData}" alt="Preview of your item photo">`;$('photo-preview').hidden=false;$('remove-photo').hidden=false;}
  catch{$('photo-error').textContent='This image could not be opened. Choose another photo.';$('photo').value='';}
  finally{if(url)URL.revokeObjectURL(url);photoBusy=false;$('submit-report').disabled=false;$('photo').disabled=false;}
});
$('report-form').addEventListener('submit',async event=>{
  event.preventDefault();if(photoBusy)return;
  if(!user){openAuth('login',()=>{goTab('report',true);$('submit-report').focus();});return;}
  const data={reportType:$('report-type').value,title:$('title').value,category:$('report-category').value,location:$('report-location').value,date:$('date').value,eventTime:$('event-time').value,description:$('description').value,handover:$('handover').value,consent:$('consent').checked,photo:photoData,contactName:$('contact-name').value,contactEmail:$('contact-email').value,contactPhone:$('contact-phone').value,contactTelegram:$('contact-telegram').value,contactConsent:$('contact-consent').checked};
  const errors=validateReport(data,TODAY,categoryNames);if(!data.eventTime)errors.eventTime='Choose the time the item was lost or found.';if(Object.keys(errors).length){showReportErrors(errors);return;}
  $('submit-report').disabled=true;$('submit-report').textContent='Saving…';
  try{const result=await api('items',{method:'POST',data});clearReportErrors();$('report-form').reset();updateReportType();$('date').value=TODAY;$('description-count').textContent='0 / 600';removePhoto();mine=false;await refresh();clearFilters();goTab('browse',true);await openItem(result.item.id);toast('Report published. Your photo and contacts are saved.');}
  catch(error){if(error.status===401){user=null;updateAccount();openAuth('login');}else showReportErrors(error.errors||{},error.message);}
  finally{$('submit-report').disabled=false;$('submit-report').innerHTML='Publish report <span aria-hidden="true">→</span>';}
});
$('how-btn').addEventListener('click',()=>{$('info-content').innerHTML='<div class="info-body"><div class="eyebrow">A SMALL ACT OF CAMPUS KINDNESS</div><h2 id="info-title">From lost to found.</h2><ol><li><strong>Search:</strong> browse the shared noticeboard and filter by category or campus location.</li><li><strong>Sign in:</strong> create an account to post items, view contacts and make claims.</li><li><strong>Post a report:</strong> choose Lost or Found, then add a description, photo and the contact details you want to share with signed-in users.</li><li><strong>Reconnect:</strong> contact the finder or send an identifying detail. The finder can read claims in Manage reports.</li><li><strong>Confirm the return:</strong> the poster or coordinator marks the listing returned.</li></ol><div class="note-block">Accounts, listings and photos are saved to a shared database. No emails are sent automatically. Account emails and university affiliation are not verified.</div></div>';$('info-dialog').showModal();});
$('project-btn').addEventListener('click',()=>{$('info-content').innerHTML='<div class="info-body"><div class="eyebrow">AITU LOST &amp; FOUND</div><h2 id="info-title">About this service.</h2><p>Find lost items and report things you have found on campus.</p><ul><li>Search by item name, category or location.</li><li>Sign in to post, manage your reports and view contact details.</li><li>Contact the person and confirm the item’s identifying details.</li><li>Arrange collection on campus.</li></ul><div class="note-block">Listings marked <strong>Sample</strong> are coursework examples. Keep personal ID numbers out of descriptions and photos.</div></div>';$('info-dialog').showModal();});
async function openManager(){
  if(!user){openAuth('login',openManager);return;}
  try{const data=await api('manage');$('coordinator-content').innerHTML=`<div class="info-body"><div class="eyebrow">${data.isAdmin?'COORDINATOR':'YOUR ACCOUNT'}</div><h2 id="coordinator-title">${data.isAdmin?'Coordinator desk.':'Manage your reports.'}</h2><p>View claims on ${data.isAdmin?'campus':'your'} listings and confirm completed returns.</p><h3>Claims (${data.claims.length})</h3>${data.claims.length?data.claims.map(c=>`<div class="coordinator-claim"><strong>${esc(c.title)}</strong><p>${esc(c.proof)}</p><p>Reply: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p></div>`).join(''):'<p class="dialog-description">No claims to review yet.</p>'}${data.isAdmin?`<h3>Flagged listings (${data.flags.length})</h3>${data.flags.map(f=>`<p class="coordinator-claim">${esc(f.title)} · ${Number(f.count)} report(s)</p>`).join('')||'<p class="dialog-description">No flagged listings.</p>'}`:''}<h3>Reports</h3>${data.items.map(item=>`<div class="coordinator-row"><div><strong>${esc(item.title)}</strong><p>${esc(item.location)} · ${item.reportType==='lost'?'Lost':'Found'}${item.status==='returned'?' · Returned':''}</p></div><div class="report-row-actions">${item.status==='available'?`<button class="button light" data-return="${esc(item.id)}">Mark returned</button>`:'<span class="status-pill returned">RETURNED</span>'}<button class="button light danger" data-delete="${esc(item.id)}" data-title="${esc(item.title)}">Delete report</button></div></div>`).join('')||'<p class="dialog-description">Your reports will appear here.</p>'}<div class="note-block">Confirm ownership and the physical handover before marking an item returned.</div></div>`;if(!$('coordinator-dialog').open)$('coordinator-dialog').showModal();}catch(error){errorToast(error);}
}
$('coordinator-btn').addEventListener('click',openManager);
$('coordinator-content').addEventListener('click',async event=>{const button=event.target.closest('[data-return],[data-delete]');if(!button)return;button.disabled=true;try{if(button.dataset.delete){if(await deleteReport(button.dataset.delete,button.dataset.title))await openManager();}else{await api('returned',{method:'POST',data:{itemId:button.dataset.return}});await refresh();await openManager();toast('Item marked as returned.');}}catch(error){errorToast(error);}finally{button.disabled=false;}});
await boot();
