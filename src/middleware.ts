import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes
  const publicPaths = ['/', '/login', '/register', '/programme', '/forgot-password', '/reset-password', '/about', '/contact'];
  const isPublic = publicPaths.some(
    (p) => path === p || path.startsWith('/verify/')
  );

  if (!user && !isPublic && !path.startsWith('/_next') && !path.startsWith('/api')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // Role-based route protection (UI only — RLS is real security)
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = profile?.role;

    if (path.startsWith('/admin') && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
    if (path.startsWith('/college') && role !== 'COLLEGE_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
    if (path.startsWith('/trainer') && role !== 'TRAINER' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
    if (path.startsWith('/student') && role !== 'STUDENT' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }

    // Redirect logged-in users away from auth pages
    if (path === '/login' || path === '/register') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
  }

  return supabaseResponse;
}

function getDashboardForRole(role?: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'COLLEGE_ADMIN':
      return '/college/dashboard';
    case 'TRAINER':
      return '/trainer/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    default:
      return '/login';
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
