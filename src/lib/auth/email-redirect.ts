import 'server-only';
import {headers} from 'next/headers';
import {authOrigin} from './redirect-origin';
export async function emailCallback(next:'/login'|'/reset-password'|'/admin/account'){
  const h=await headers();
  const origin=authOrigin(process.env.NEXT_PUBLIC_APP_URL,h.get('origin'),process.env.NODE_ENV==='production');
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
