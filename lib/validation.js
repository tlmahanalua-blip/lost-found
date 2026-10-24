import { validateReport, validateClaim } from '../public/model.js';
export const emailOK=value=>typeof value==='string' && value.length<=150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const text=value=>typeof value==='string'?value.trim():'';
export function registrationErrors(d) {
  const errors={};
  if(text(d.name).length<2 || text(d.name).length>60)errors.name='Enter your name (2–60 characters).';
  if(!emailOK(d.email))errors.email='Enter a valid email address.';
  if(typeof d.password!=='string' || d.password.length<10 || d.password.length>128)errors.password='Use a password with 10–128 characters.';
  return errors;
}
export function reportData(body,categories) {
  const d={};
  for(const k of ['title','category','location','date','eventTime','description','handover','contactName','contactEmail','contactPhone','contactTelegram'])d[k]=text(body[k]);
  d.reportType=body.reportType===undefined?'found':text(body.reportType);
  d.consent=body.consent===true;d.contactConsent=body.contactConsent===true;
  if(body.photo && typeof body.photo!=='string')return {errors:{photo:'Choose a valid image.'}};
  const errors=validateReport({...d,photo:body.photo || ''},undefined,categories);
  if(!['lost','found'].includes(d.reportType))errors.reportType='Choose Lost or Found.';
  if(d.contactName.length<2 || d.contactName.length>60)errors.contactName='Enter a contact name (2–60 characters).';
  if(!emailOK(d.contactEmail))errors.contactEmail='Enter a valid contact email.';
  if(d.contactPhone && !/^\+?[0-9 ()-]{7,25}$/.test(d.contactPhone))errors.contactPhone='Use 7–25 characters: digits, spaces, +, ( ), or -.';
  if(d.contactTelegram && !/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(d.contactTelegram))errors.contactTelegram='Enter a Telegram username, such as @campus_student.';
  if(!d.contactConsent)errors.contactConsent='Agree to share these contact details with signed-in users.';
  let photo;
  if(body.photo && !errors.photo) {
    const match=body.photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if(!match)errors.photo='Choose a JPG, PNG or WebP image.';
    else {
      const bytes=Buffer.from(match[2],'base64'),mime=match[1];
      const valid=(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||(mime==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(mime==='image/webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');
      if(!valid || bytes.length>900000 || bytes.length<12)errors.photo='Choose a valid image under 900 KB after compression.';
      else photo={mime,bytes};
    }
  }
  return Object.keys(errors).length?{errors}:{data:d,photo};
}
export function claimErrors(d) {return validateClaim({proof:text(d.proof),email:text(d.email)});}
