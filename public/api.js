export async function api(action,{method='GET',data,id}={}) {
  const params=new URLSearchParams({action});if(id)params.set('id',id);
  let response;
  try{response=await fetch('/api/index?'+params,{method,credentials:'same-origin',cache:'no-store',headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?JSON.stringify(data||{}):undefined});}
  catch{throw Object.assign(new Error('Cannot connect. Check your internet connection and try again.'),{status:0});}
  const body=await response.json().catch(()=>({error:'The API could not be reached. Deploy the entire project, including api/, rather than only public/.'}));
  if(!response.ok)throw Object.assign(new Error(body.error||'Request failed.'),{status:response.status,errors:body.errors||{}});
  return body;
}
