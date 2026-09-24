'use client';

import PasswordInput from '@/components/password-input';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { signup } from '@/lib/auth/actions';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

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

    setLoading(true);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('full_name', fullName);

    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setMessage(
      result?.message || 'Registration successful. Please check your email to confirm your account.'
    );
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-sm font-semibold">Campus-to-Corporate</span>

          <h1 className="text-2xl font-bold text-slate-900">
            Create your individual account
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Join independently from any college. No college affiliation is required.
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full name
            </label>

            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>

            <PasswordInput

              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm password
            </label>

            <PasswordInput

              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create free account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">Account creation is free. See the current programme offer for free enrolment or paid access. <Link href="/programme" className="text-blue-700 underline">View programme details</Link></p>
        <p className="mt-3 text-center text-sm text-slate-600">Joining through a participating college? Use the account provided by your college or contact its administrator.</p>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}


