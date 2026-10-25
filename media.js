import {safePhoto} from './model.js';

const escapeHtml=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function itemPhoto(item) {
  const expected=`/api/index?action=photo&id=${encodeURIComponent(String(item.id))}`;
  return item.photo===expected?expected:safePhoto(item.photo);
}

export function renderItemVisual(item) {
  const photo=itemPhoto(item);
  if(photo)return `<img src="${escapeHtml(photo)}" alt="Photo of ${escapeHtml(item.title)}" loading="lazy" decoding="async">`;
  return '<div class="no-photo"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="6" y="13" width="36" height="27" rx="5"/><path d="m16 13 3-5h10l3 5"/><circle cx="24" cy="26" r="8"/></svg><span>No photo</span></div>';
}
