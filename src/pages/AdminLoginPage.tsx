import { useState, useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { navigate, Link } from '@/router';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/admin/dashboard');
      else setChecking(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    navigate('/admin/dashboard');
  };

  if (checking) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center pt-16 md:pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center pt-16 md:pt-20">
      <div className="w-full max-w-sm px-5">
        <div className="flex items-center justify-center gap-2 text-ink-900">
          <Lock className="h-5 w-5" />
          <h1 className="display-heading text-3xl tracking-wider">ADMIN</h1>
        </div>
        <p className="mt-2 text-center text-xs uppercase tracking-widest text-ink-500">
          VESTO Order Management
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vesto.in"
              className="input-vesto mt-1.5"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-vesto mt-1.5"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs uppercase tracking-widest text-ink-500 hover:text-ink-900">
            Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
