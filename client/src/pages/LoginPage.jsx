import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, User, ShieldAlert, KeyRound, CheckCircle2, UserPlus, ShieldCheck, Key } from 'lucide-react';
import { authenticateLogin, createOfficialCredentials, resetOfficialPassword, OFFICIAL_PASSKEY } from '../services/auth.js';
import { useAuthStore, useLanguageStore } from '../store/useStore.js';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { setAuth } = useAuthStore();
  const { currentLang } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'create' | 'reset'
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
  const [passkey, setPasskey] = useState(OFFICIAL_PASSKEY);

  // Reset password form state
  const [resetUser, setResetUser] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetPasskey, setResetPasskey] = useState(OFFICIAL_PASSKEY);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await authenticateLogin(username, password);
      setAuth(data.user, data.token);
      let redirectPath = location.state?.from;
      if (!redirectPath || redirectPath === '/map' || redirectPath === '/') {
        redirectPath = data.user.role === 'admin' ? '/admin/dashboard' : data.user.role === 'inspector' ? '/dashboard' : '/map';
      }
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
      const res = await createOfficialCredentials(newUsername, newPassword, newRole, passkey);
      setSuccess(
        isTe
          ? `అధికారిక ${newRole.toUpperCase()} ఆధారాలు సురక్షితంగా హ్యాష్ చేయబడి డేటాబేస్‌లో సేవ్ చేయబడ్డాయి!`
          : isHi
          ? `आधिकारिक ${newRole.toUpperCase()} क्रेडेंशियल सुरक्षित रूप से सहेजे गए!`
          : `Official ${newRole.toUpperCase()} credentials registered with secure password hashing!`
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

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resetOfficialPassword(resetUser, resetPass, resetPasskey);
      setSuccess(
        isTe
          ? 'పాస్‌వర్డ్ విజయవంతంగా రీసెట్ చేయబడింది! దయచేసి లాగిన్ అవ్వండి.'
          : isHi
          ? 'पासवर्ड सफलतापूर्वक रीसेट हो गया! कृपया लॉगिन करें।'
          : 'Password successfully reset! You can now log in.'
      );
      setUsername(resetUser);
      setPassword(resetPass);
      setActiveTab('login');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#fffdf9] dark:bg-[#090d16] transition-colors">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-xl border border-amber-200/80 dark:border-stone-800 p-6 sm:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Emblem & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md border-2 border-amber-300 p-1.5">
            <img
              src="/ap-govt-logo.svg"
              alt="Government of Andhra Pradesh"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-black text-[#881337] dark:text-rose-400 tracking-tight">
            {isTe ? 'అధికారిక సిబ్బంది లాగిన్' : isHi ? 'आधिकारिक स्टाफ लॉगिन' : 'Authorized Staff Login'}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {isTe
              ? 'క్షేత్ర తనిఖీ సిబ్బంది మరియు అడ్మిన్ నిర్వాహకులకు మాత్రమే'
              : isHi
              ? 'केवल फील्ड निरीक्षण कर्मचारियों और व्यवस्थापकों के लिए'
              : 'Field Inspectors & Administrators only — normal users restricted'}
          </p>
        </div>

        {/* Tab Switcher: Login | Register | Reset */}
        <div className="grid grid-cols-3 bg-[#fefaf3] dark:bg-stone-800 p-1 rounded-2xl border border-amber-200/80 dark:border-stone-700 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition ${
              activeTab === 'login'
                ? 'bg-[#991b1b] text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            {isTe ? 'లాగిన్' : isHi ? 'लॉगिन' : 'Login'}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setError(''); setSuccess(''); }}
            className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition ${
              activeTab === 'create'
                ? 'bg-[#991b1b] text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            {isTe ? 'ఖాతా నమోదు' : isHi ? 'पंजीकरण' : 'Register'}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('reset'); setError(''); setSuccess(''); }}
            className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition ${
              activeTab === 'reset'
                ? 'bg-[#991b1b] text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            {isTe ? 'రీసెట్' : isHi ? 'रीसेट' : 'Reset'}
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ── TAB 1: LOGIN ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                <User size={13} className="inline mr-1 text-[#991b1b] dark:text-rose-400" />
                {isTe ? 'వినియోగదారు పేరు (Username)' : isHi ? 'उपयोगकर्ता नाम' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. inspector1 or admin"
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white dark:focus:bg-stone-800 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                <Lock size={13} className="inline mr-1 text-[#991b1b] dark:text-rose-400" />
                {isTe ? 'పాస్‌వర్డ్ (Password)' : isHi ? 'पासवर्ड' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white dark:focus:bg-stone-800 transition"
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

        {/* ── TAB 2: CREATE / SET CREDENTIALS (PASSKEY PROTECTED) ── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateCredentials} className="space-y-3">
            {/* Department Passkey Security Notice */}
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-300">
              <span className="font-bold">🔒 Official Security:</span> Authorized personnel only. Requires Department Passkey issued by RMC Pushkaram Control.
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                <Key size={13} className="inline mr-1 text-amber-600" />
                Department Passkey
              </label>
              <input
                type="text"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="AP-RMC-PUSHKAR-2027"
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-300 dark:border-stone-700 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isTe ? 'హోదా / పాత్ర (Role)' : isHi ? 'भूमिका (Role)' : 'Official Role'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('inspector')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    newRole === 'inspector'
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-[#991b1b] dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
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
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-[#991b1b] dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <KeyRound size={14} />
                  <span>{isTe ? 'అడ్మిన్' : isHi ? 'व्यवस्थापक' : 'Admin'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isTe ? 'నూతన యూజర్‌నేమ్ (Username)' : isHi ? 'नया उपयोगकर्ता नाम' : 'New Username'}
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. ghat_inspector_3"
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Password (min 6)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-[#991b1b] hover:opacity-95 text-white rounded-xl py-2.5 text-xs font-extrabold shadow-md active:scale-98 transition disabled:opacity-50 mt-1"
            >
              {loading
                ? (isTe ? 'భద్రపరుస్తోంది…' : 'Saving Hashed Credentials…')
                : (isTe ? 'అధికారిక ఖాతా సృష్టించండి' : 'Register Authorized Account')}
            </button>
          </form>
        )}

        {/* ── TAB 3: RESET PASSWORD ── */}
        {activeTab === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Department Passkey
              </label>
              <input
                type="text"
                value={resetPasskey}
                onChange={(e) => setResetPasskey(e.target.value)}
                placeholder="AP-RMC-PUSHKAR-2027"
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-300 dark:border-stone-700 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Registered Username
              </label>
              <input
                type="text"
                value={resetUser}
                onChange={(e) => setResetUser(e.target.value)}
                placeholder="e.g. inspector1"
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                New Password (min 6 chars)
              </label>
              <input
                type="password"
                value={resetPass}
                onChange={(e) => setResetPass(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#fefaf3] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-[#881337] hover:opacity-95 text-white rounded-xl py-2.5 text-xs font-extrabold shadow-md active:scale-98 transition disabled:opacity-50"
            >
              {loading ? 'Resetting Password…' : 'Reset Official Password'}
            </button>
          </form>
        )}

        {/* Demo Quick Logins Helper */}
        <div className="mt-5 p-3.5 bg-[#fefaf3] dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 rounded-2xl text-xs text-stone-600 dark:text-stone-300">
          <p className="font-bold text-stone-800 dark:text-stone-200 mb-1.5 flex items-center gap-1.5">
            <KeyRound size={13} className="text-[#991b1b] dark:text-rose-400" />
            <span>{isTe ? 'ధృవీకరించబడిన అధికారిక లాగిన్లు:' : isHi ? 'डेमो खाते:' : 'Authorized Official Credentials:'}</span>
          </p>
          <div className="space-y-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setUsername('inspector1');
                setPassword('inspect123');
                setActiveTab('login');
              }}
              className="w-full text-left hover:text-[#991b1b] dark:hover:text-rose-400 hover:underline"
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
              className="w-full text-left hover:text-[#991b1b] dark:hover:text-rose-400 hover:underline"
            >
              • admin / admin123 (GIS & System Admin)
            </button>
          </div>
          <p className="text-[10px] text-stone-400 mt-2">
            Passkey for registration & reset: <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">AP-RMC-PUSHKAR-2027</span>
          </p>
        </div>
      </div>
    </div>
  );
}
