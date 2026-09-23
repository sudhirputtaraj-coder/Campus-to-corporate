import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {authOrigin,callbackDestination} from '@/lib/auth/redirect-origin';
export async function GET(request:Request){
  const url=new URL(request.url);
  let origin:string;
  try{origin=authOrigin(process.env.NEXT_PUBLIC_APP_URL,url.origin,process.env.NODE_ENV==='production');}
  catch{return new Response('The site URL is not configured correctly. Contact the platform administrator.',{status:503});}
  const code=url.searchParams.get('code');
  if(code&&!url.searchParams.has('error')){
    try{const client=await createClient();const {error}=await client.auth.exchangeCodeForSession(code);
      if(!error)return NextResponse.redirect(new URL(callbackDestination(url.searchParams.get('next')),origin));
    }catch{/* Show a safe recovery page without disclosing the code or error details. */}
  }
  return NextResponse.redirect(new URL('/auth/error',origin));
}
