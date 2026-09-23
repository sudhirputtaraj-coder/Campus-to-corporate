export function authOrigin(configured:string|undefined,requestOrigin:string|null,production:boolean):string {
  const parse=(value:string)=>{const u=new URL(value);if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Invalid site URL');return u;};
  const local=(u:URL)=>['localhost','127.0.0.1','[::1]'].includes(u.hostname)&&['http:','https:'].includes(u.protocol);
  if(!production&&requestOrigin){try{const u=parse(requestOrigin);if(local(u))return u.origin;}catch{/* Use configured URL below. */}}
  if(!configured)throw Error('Configure NEXT_PUBLIC_APP_URL before sending account emails.');
  const u=parse(configured);
  if(production?(u.protocol!=='https:'||local(u)):(!local(u)&&u.protocol!=='https:'))throw Error('Configure a valid site URL. Production requires HTTPS.');
  return u.origin;
}
export function callbackDestination(next:string|null){return next==='/reset-password'?next:next==='/admin/account'?next:'/login';}
