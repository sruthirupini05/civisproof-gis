import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, User, ShieldAlert } from 'lucide-react';
import { authAPI } from '../services/api.js';
import { useAuthStore } from '../store/useStore.js';

export default function LoginPage() {
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('inspector1');
  const [password, setPassword] = useState('inspect123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(username, password);
      setAuth(data.user, data.token);
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow">
            <Lock size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">{t('app.name')}</h1>
          <p className="text-xs text-slate-500 mt-1">Authorized Field Staff & Inspector Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <User size={13} className="inline mr-1 text-slate-400" />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <Lock size={13} className="inline mr-1 text-slate-400" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#15294a] disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'Logging in...' : t('nav.login')}
          </button>
        </form>

        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
          <p className="font-semibold text-slate-800 mb-1.5">Pre-configured demo logins:</p>
          <div className="space-y-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setUsername('inspector1');
                setPassword('inspect123');
              }}
              className="w-full text-left hover:text-[#1e3a5f] hover:underline"
            >
              • inspector1 / inspect123 (Field Inspector)
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin123');
              }}
              className="w-full text-left hover:text-[#1e3a5f] hover:underline"
            >
              • admin / admin123 (Full Management & QR Admin)
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('field1');
                setPassword('field123');
              }}
              className="w-full text-left hover:text-[#1e3a5f] hover:underline"
            >
              • field1 / field123 (Field Staff)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
