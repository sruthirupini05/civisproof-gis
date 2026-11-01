import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, User, ShieldAlert, KeyRound, CheckCircle2, UserPlus, ShieldCheck } from 'lucide-react';
import { authenticateLogin, createOfficialCredentials } from '../services/auth.js';
import { useAuthStore, useLanguageStore } from '../store/useStore.js';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { setAuth } = useAuthStore();
  const { currentLang } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'create'
  const [username, setUsername] = useState('inspector1');
  const [password, setPassword] = useState('inspect123');
  const [error, setError] = useState(location.state?.error || '');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Create credentials form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState('inspector'); // 'admin' | 'inspector'

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await authenticateLogin(username, password);
      setAuth(data.user, data.token);
      const redirectPath = location.state?.from || '/map';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(
        err.message ||
        (isTe
          ? 'చెల్లని వినియోగదారు పేరు లేదా పాస్‌వర్డ్. దయచేసి తనిఖీ చేయండి.'
          : isHi
          ? 'अमान्य उपयोगकर्ता नाम या पासवर्ड। कृपया जाँच करें।'
          : 'Invalid username or password. Check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCredentials(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(
        isTe
          ? 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు. దయచేసి మళ్ళీ సరిచూసుకోండి.'
          : isHi
          ? 'पासवर्ड मेल नहीं खा रहे हैं। कृपया पुनः प्रयास करें।'
          : 'Passwords do not match. Please verify.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await createOfficialCredentials(newUsername, newPassword, newRole);
      setSuccess(
        isTe
          ? `అధికారిక ${newRole.toUpperCase()} ఆధారాలు డేటాబేస్‌లో విజయవంతంగా సృష్టించబడ్డాయి!`
          : isHi
          ? `आधिकारिक ${newRole.toUpperCase()} क्रेडेंशियल डेटाबेस में सफलतापूर्वक सहेजे गए!`
          : `Official ${newRole.toUpperCase()} credentials successfully saved in database!`
      );
      // Pre-fill login
      setUsername(newUsername);
      setPassword(newPassword);
      setActiveTab('login');
    } catch (err) {
      setError(err.message || 'Failed to create credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#fffdf9]">
      <div className="bg-white rounded-3xl shadow-xl border border-amber-200/80 p-6 sm:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Emblem & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-[#991b1b] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md text-white text-2xl border-2 border-amber-200">
            🛕
          </div>
          <h1 className="text-xl font-black text-[#881337] tracking-tight">
            {isTe ? 'అధికారిక సిబ్బంది లాగిన్' : isHi ? 'आधिकारिक स्टाफ लॉगिन' : 'Authorized Staff Login'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {isTe
              ? 'క్షేత్ర తనిఖీ సిబ్బంది మరియు అడ్మిన్ నిర్వాహకులకు మాత్రమే'
              : isHi
              ? 'केवल फील्ड निरीक्षण कर्मचारियों और व्यवस्थापकों के लिए'
              : 'Field Inspectors & Administrators only — normal users restricted'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#fefaf3] p-1 rounded-2xl border border-amber-200/80 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'login'
                ? 'bg-[#991b1b] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {isTe ? 'లాగిన్ చేయండి' : isHi ? 'लॉगिन करें' : 'Official Login'}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'create'
                ? 'bg-[#991b1b] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {isTe ? 'పాస్‌వర్డ్ సృష్టించండి' : isHi ? 'पासवर्ड बनाएं' : 'Set Credentials'}
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ── TAB 1: LOGIN ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                <User size={13} className="inline mr-1 text-[#991b1b]" />
                {isTe ? 'వినియోగదారు పేరు (Username)' : isHi ? 'उपयोगकर्ता नाम' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. inspector1 or admin"
                className="w-full bg-[#fefaf3] border border-amber-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                <Lock size={13} className="inline mr-1 text-[#991b1b]" />
                {isTe ? 'పాస్‌వర్డ్ (Password)' : isHi ? 'पासवर्ड' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#fefaf3] border border-amber-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white rounded-xl py-3 text-sm font-extrabold shadow-md shadow-red-950/20 active:scale-98 transition disabled:opacity-50"
            >
              {loading
                ? (isTe ? 'ధృవీకరిస్తోంది…' : isHi ? 'प्रमाणीकरण हो रहा है…' : 'Validating login…')
                : (isTe ? 'లాగిన్ చేయండి' : isHi ? 'लॉगिन करें' : 'Login')}
            </button>
          </form>
        )}

        {/* ── TAB 2: CREATE / SET CREDENTIALS ── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateCredentials} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isTe ? 'హోదా / పాత్ర (Role)' : isHi ? 'भूमिका (Role)' : 'Official Role'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('inspector')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    newRole === 'inspector'
                      ? 'bg-amber-100 text-[#991b1b] border-amber-300'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>{isTe ? 'ఇన్‌స్పెక్టర్' : isHi ? 'निरीक्षक' : 'Inspector'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole('admin')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    newRole === 'admin'
                      ? 'bg-amber-100 text-[#991b1b] border-amber-300'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  <KeyRound size={14} />
                  <span>{isTe ? 'అడ్మిన్' : isHi ? 'व्यवस्थापक' : 'Admin'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isTe ? 'నూతన యూజర్‌నేమ్ (Username)' : isHi ? 'नया उपयोगकर्ता नाम' : 'New Username'}
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. myinspector"
                className="w-full bg-[#fefaf3] border border-amber-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isTe ? 'నూతన పాస్‌వర్డ్ (New Password)' : isHi ? 'नया पासवर्ड' : 'New Password (min 6 chars)'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#fefaf3] border border-amber-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isTe ? 'పాస్‌వర్డ్ నిర్ధారించండి' : isHi ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#fefaf3] border border-amber-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-[#991b1b] hover:opacity-95 text-white rounded-xl py-2.5 text-xs font-extrabold shadow-md active:scale-98 transition disabled:opacity-50"
            >
              {loading
                ? (isTe ? 'డేటాబేస్‌లో భద్రపరుస్తోంది…' : isHi ? 'डेटाबेस में सहेज रहा है…' : 'Saving to Database…')
                : (isTe ? 'డేటాబేస్‌లో సేవ్ చేయండి' : isHi ? 'डेटाबेस में सहेजें' : 'Save in Database & Register')}
            </button>
          </form>
        )}

        {/* Demo Quick Logins Helper */}
        <div className="mt-5 p-3.5 bg-[#fefaf3] border border-amber-200/80 rounded-2xl text-xs text-stone-600">
          <p className="font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
            <KeyRound size={13} className="text-[#991b1b]" />
            <span>{isTe ? 'డెమో ఖాతాలు:' : isHi ? 'डेमो खाते:' : 'Pre-configured Official Logins:'}</span>
          </p>
          <div className="space-y-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setUsername('inspector1');
                setPassword('inspect123');
                setActiveTab('login');
              }}
              className="w-full text-left hover:text-[#991b1b] hover:underline"
            >
              • inspector1 / inspect123 (Field Inspector)
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin123');
                setActiveTab('login');
              }}
              className="w-full text-left hover:text-[#991b1b] hover:underline"
            >
              • admin / admin123 (GIS & QR Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
