'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsSessionValid(!!session);
    });
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (active) setIsSessionValid(!error && !!user);
    }).catch(() => { if (active) setIsSessionValid(false); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isSessionValid !== true) { setError("Open a valid password reset link first."); return; }
    setLoading(true);
    try {

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage('Password updated successfully. Please sign in with your new password.');
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/login');
    router.refresh();
    } catch {
      setError('The request could not be completed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your new account password below
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">
              {message}
            </div>
          )}

          {isSessionValid === false && (
            <div className="bg-amber-50 text-amber-800 text-sm px-3 py-2 rounded-lg mb-4">
              Invalid or expired password reset link. Please request a new one from the{' '}
              <Link href="/forgot-password" className="underline font-medium">
                forgot password page
              </Link>.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSessionValid !== true || loading}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSessionValid !== true || loading}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={isSessionValid !== true || loading}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Password
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Back to{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}