import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleDot,
  Download,
  Edit3,
  Flame,
  Globe,
  LogIn,
  LogOut,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import type { AppPersistedState, AvatarId } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import {
  AVATAR_OPTIONS,
  authenticateUserAccount,
  calculatePrayerStreak,
  createUserAccount,
  getActiveDisplayIdentity,
  hashCredential,
  validateAccountFields,
} from '../utils/accounts';
import { formatNum, t } from '../utils/i18n';
import { PageHeader } from './PageHeader';
import { NoorLogo, UserAvatarBadge } from './NoorLogo';
import { IOSRow, IOSSection, IOSSegmented, IOSSwitch } from './IOSSettingsPrimitives';

interface ProfilePageProps {
  state: AppPersistedState;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onExportJson: () => void;
  onImportJson: (raw: string) => { ok: boolean; error?: string };
  onResetData: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  state,
  onUpdateState,
  onExportJson,
  onImportJson,
  onResetData,
  onNavigate,
}) => {
  const lang = state.language;
  const identity = useMemo(() => getActiveDisplayIdentity(state.profile), [state.profile]);
  const streak = useMemo(
    () => calculatePrayerStreak(state.prayerChecklist),
    [state.prayerChecklist]
  );

  // Auth form states
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [avatarInput, setAvatarInput] = useState<AvatarId>(identity.avatarId);
  const [authFeedback, setAuthFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Profile Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(identity.displayName);
  const [editAvatar, setEditAvatar] = useState<AvatarId>(identity.avatarId);

  // Backup & Reset state
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    const valid = validateAccountFields({
      name: nameInput,
      emailOrUsername: emailInput,
      pin: pinInput,
    });
    if (!valid.ok) {
      const messages = {
        name: t(lang, 'Please enter your name (at least 2 characters).', 'আপনার নাম লিখুন (কমপক্ষে ২ অক্ষর)।'),
        identifier: t(lang, 'Enter a valid email or username (min 3 chars).', 'সঠিক ইমেইল বা ইউজারনেম লিখুন।'),
        pin: t(lang, 'PIN / Password must be at least 4 characters.', 'পিন বা পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।'),
      };
      setAuthFeedback({ ok: false, msg: messages[valid.errorKey] });
      return;
    }

    const res = createUserAccount(state.profile, {
      name: nameInput,
      emailOrUsername: emailInput,
      pin: pinInput,
      avatarId: avatarInput,
    });

    if (!res.ok) {
      setAuthFeedback({
        ok: false,
        msg: t(
          lang,
          'An account with this email/username already exists. Try signing in.',
          'এই ইমেইল বা ইউজারনেমে অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে সাইন ইন করুন।'
        ),
      });
      return;
    }

    onUpdateState({ profile: res.profile });
    setEditName(res.account.name);
    setEditAvatar(res.account.avatarId);
    setNameInput('');
    setEmailInput('');
    setPinInput('');
    setAuthFeedback({
      ok: true,
      msg: t(
        lang,
        'Account created! Your bookmarks, Tasbih count, and Prayer logs are now linked.',
        'অ্যাকাউন্ট তৈরি হয়েছে! আপনার সব বুকমার্ক, তাসবীহ ও নামাজের হিসাব সংযুক্ত হয়েছে।'
      ),
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    const res = authenticateUserAccount(state.profile, emailInput, pinInput);
    if (!res.ok) {
      setAuthFeedback({
        ok: false,
        msg:
          res.error === 'not_found'
            ? t(lang, 'Account not found on this device.', 'এই ডিভাইসে অ্যাকাউন্টটি পাওয়া যায়নি।')
            : t(lang, 'Incorrect PIN or Password.', 'পিন বা পাসওয়ার্ড সঠিক নয়।'),
      });
      return;
    }
    onUpdateState({ profile: res.profile });
    setEditName(res.account.name);
    setEditAvatar(res.account.avatarId);
    setEmailInput('');
    setPinInput('');
    setAuthFeedback({
      ok: true,
      msg: t(lang, `Welcome back, ${res.account.name}!`, `স্বাগতম, ${res.account.name}!`),
    });
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = editName.trim();
    if (cleaned.length < 2) return;

    onUpdateState((prev) => {
      if (identity.account) {
        return {
          ...prev,
          profile: {
            ...prev.profile,
            accounts: prev.profile.accounts.map((acc) =>
              acc.id === identity.account!.id
                ? {
                    ...acc,
                    name: cleaned,
                    avatarId: editAvatar,
                    updatedAt: new Date().toISOString(),
                  }
                : acc
            ),
          },
        };
      }
      return {
        ...prev,
        profile: {
          ...prev.profile,
          guestName: cleaned,
          guestAvatarId: editAvatar,
        },
      };
    });
    setEditing(false);
  };

  const handleSignOut = () => {
    onUpdateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        activeAccountId: null,
      },
    }));
    setAuthFeedback({
      ok: true,
      msg: t(lang, 'Signed out to local Guest mode.', 'গেস্ট মোডে সাইন আউট হয়েছে।'),
    });
  };

  const handleSwitchAccount = (accountId: string) => {
    const target = state.profile.accounts.find((a) => a.id === accountId);
    if (!target) return;
    onUpdateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        activeAccountId: target.id,
      },
    }));
    setEditName(target.name);
    setEditAvatar(target.avatarId);
  };

  const handleQuickDemoPinReset = (accountId: string, newPin: string) => {
    if (newPin.trim().length < 4) return;
    onUpdateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        accounts: prev.profile.accounts.map((a) =>
          a.id === accountId ? { ...a, pinHash: hashCredential(newPin) } : a
        ),
      },
    }));
  };
  void handleQuickDemoPinReset;

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportJson(text);
      if (res.ok) {
        setImportFeedback({
          ok: true,
          msg: t(lang, 'Account & app data restored successfully.', 'অ্যাকাউন্ট ও অ্যাপ ডেটা সফলভাবে রিস্টোর হয়েছে।'),
        });
      } else {
        setImportFeedback({
          ok: false,
          msg: res.error ?? t(lang, 'Invalid backup JSON file.', 'অবৈধ ব্যাকআপ ফাইল।'),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const ayahsReadDisplay = Math.max(
    state.ayahsReadCount,
    state.lastRead ? state.lastRead.ayahNumber : 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Profile & Settings', 'প্রোফাইল ও সেটিংস')}
        subtitle={t(
          lang,
          'Manage appearance, language, spiritual streaks, local accounts, and backups.',
          'থিম, ভাষা, নামাজের স্ট্রিক, অ্যাকাউন্ট এবং অফলাইন ব্যাকআপ পরিচালনা করুন।'
        )}
        onNavigate={onNavigate}
      />

      {/* Profile Dashboard Hero */}
      <section className="rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatarBadge avatarId={identity.avatarId} size="lg" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {identity.isAuthenticated
                  ? t(lang, 'Signed-In Local Profile', 'নিবন্ধিত প্রোফাইল')
                  : t(lang, 'Guest Mode · Offline Linked', 'গেস্ট প্রোফাইল · অফলাইন')}
              </p>
              <h2
                className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate"
                data-testid="profile-greeting"
              >
                {t(
                  lang,
                  `Assalamu Alaikum, ${identity.displayName}`,
                  `আসসালামু আলাইকুম, ${identity.displayName}`
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{identity.handle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditName(identity.displayName);
                setEditAvatar(identity.avatarId);
                setEditing((v) => !v);
              }}
              data-testid="edit-profile-btn"
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 hover:border-emerald-500/45 text-xs font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {t(lang, 'Edit Profile', 'প্রোফাইল এডিট')}
            </button>

            {identity.isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                data-testid="signout-btn"
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 hover:border-amber-500/45 text-xs font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t(lang, 'Sign Out', 'সাইন আউট')}
              </button>
            )}
          </div>
        </div>

        {/* Inline Profile Editor */}
        {editing && (
          <form
            onSubmit={handleSaveProfileEdit}
            className="pt-4 border-t border-black/[0.07] dark:border-white/10 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-profile-name" className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                  {t(lang, 'Display Name', 'প্রদর্শিত নাম')}
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                  {t(lang, 'Choose Avatar', 'অ্যাভাটার পছন্দ করুন')}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditAvatar(av.id)}
                      aria-label={lang === 'bn' ? av.labelBn : av.labelEn}
                      className={`p-1 rounded-full border transition-colors ${
                        editAvatar === av.id
                          ? 'border-emerald-500 bg-emerald-500/15'
                          : 'border-stone-200/80 dark:border-white/10 bg-[#F4F1EA] dark:bg-black hover:border-stone-300 dark:hover:border-white/30'
                      }`}
                    >
                      <UserAvatarBadge avatarId={av.id} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs"
              >
                {t(lang, 'Save Changes', 'পরিবর্তন সংরক্ষণ করুন')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400"
              >
                {t(lang, 'Cancel', 'বাতিল')}
              </button>
            </div>
          </form>
        )}

        {/* Spiritual Activity Metrics */}
        <div className="pt-4 border-t border-stone-200/70 dark:border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{t(lang, 'Prayer Streak', 'নামাজের স্ট্রিক')}</span>
              <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono-num">
              {formatNum(lang, streak.activeDaysStreak)} {t(lang, 'days', 'দিন')}
            </p>
            <p className="text-[11px] text-zinc-500">
              {formatNum(lang, streak.totalWaqtLogged)} {t(lang, 'total Waqts logged', 'মোট ওয়াক্ত আদায়')}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{t(lang, 'Ayahs Read', 'পঠিত আয়াত')}</span>
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono-num">
              {formatNum(lang, ayahsReadDisplay)}
            </p>
            <p className="text-[11px] text-zinc-500">
              {formatNum(lang, state.quranBookmarks.length)} {t(lang, 'Quran bookmarks', 'কুরআন বুকমার্ক')}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{t(lang, 'Total Tasbih', 'মোট তাসবীহ')}</span>
              <CircleDot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono-num">
              {formatNum(lang, state.tasbihLifetimeTotal)}
            </p>
            <p className="text-[11px] text-zinc-500">
              {formatNum(lang, state.hadithBookmarks.length)} {t(lang, 'saved Hadiths', 'সংরক্ষিত হাদীস')}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{t(lang, 'Seerah Quiz Best', 'কুইজ সেরা স্কোর')}</span>
              <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono-num">
              {formatNum(lang, state.quizBestScore)} / {formatNum(lang, 8)}
            </p>
            <p className="text-[11px] text-zinc-500">
              {streak.fullFiveStreak > 0
                ? `${formatNum(lang, streak.fullFiveStreak)}d 5-Waqt badge`
                : t(lang, 'Log 5/5 today to earn badge', 'ব্যাজ পেতে আজ ৫ ওয়াক্ত পূর্ণ করুন')}
            </p>
          </div>
        </div>
      </section>

      {/* Native iOS Inset Grouped App Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <IOSSection
          title={t(lang, 'Appearance & Language', 'থিম ও ভাষা')}
          footer={t(
            lang,
            'Light uses soft iOS tones, AMOLED Dark uses true black, and Fancy is a royal velvet & gold theme.',
            'লাইট মোডে আরামদায়ক সাদা, AMOLED ডার্কে গভীর কালো এবং ফ্যান্সি মোডে রয়্যাল ভেলভেট ও সোনালি থিম ব্যবহৃত হয়।'
          )}
        >
          <div className="px-4 py-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-[7px] flex items-center justify-center text-white shrink-0 ${
                  state.theme === 'fancy'
                    ? 'bg-fuchsia-800'
                    : state.theme === 'dark'
                    ? 'bg-indigo-600'
                    : 'bg-amber-500'
                }`}
              >
                {state.theme === 'fancy' ? (
                  <Sparkles className="w-4 h-4" />
                ) : state.theme === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-zinc-900 dark:text-white">
                  {t(lang, 'Theme', 'থিম')}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {state.theme === 'fancy'
                    ? t(lang, 'Royal Velvet & Gold Active', 'রয়্যাল ভেলভেট ও গোল্ড সক্রিয়')
                    : state.theme === 'dark'
                    ? t(lang, 'AMOLED Pure Black Active', 'AMOLED ডার্ক থিম সক্রিয়')
                    : t(lang, 'Light iOS Theme Active', 'লাইট থিম সক্রিয়')}
                </p>
              </div>
            </div>
            <IOSSegmented
              value={state.theme}
              onChange={(theme) => onUpdateState({ theme })}
              ariaLabel={t(lang, 'Choose theme', 'থিম বেছে নিন')}
              testId="profile-theme-segmented"
              options={[
                { value: 'light', label: t(lang, 'Light', 'লাইট') },
                { value: 'dark', label: t(lang, 'AMOLED', 'ডার্ক') },
                { value: 'fancy', label: t(lang, 'Fancy', 'ফ্যান্সি') },
              ]}
            />
          </div>
          <IOSRow
            icon={<Globe className="w-4 h-4" />}
            iconBg="bg-[#007AFF]"
            title={t(lang, 'Bengali Language (বাংলা)', 'বাংলা ভাষা (Bengali)')}
            subtitle={t(lang, 'Switch interface & numerals between English and বাংলা', 'ইংরেজি ও বাংলা ভাষা পরিবর্তন করুন')}
            rightElement={
              <IOSSwitch
                checked={lang === 'bn'}
                onChange={(isBn) => onUpdateState({ language: isBn ? 'bn' : 'en' })}
                ariaLabel="Toggle Bengali Language"
                testId="profile-language-switch"
              />
            }
          />
          <IOSRow
            icon={<Bell className="w-4 h-4" />}
            iconBg="bg-[#FF3B30]"
            title={t(lang, 'Azan & Hadith Notifications', 'আজান ও হাদীস নোটিফিকেশন')}
            chevron
            onClick={() => onNavigate('notifications')}
          />
        </IOSSection>

        <IOSSection title={t(lang, 'Quran & Reading Defaults', 'কুরআন ও পঠন সেটিংস')}>
          <IOSRow
            icon={<BookOpen className="w-4 h-4" />}
            iconBg="bg-[#34C759]"
            title={t(lang, 'Color-Coded Tajweed', 'তাজবিদ কালার')}
            rightElement={
              <IOSSwitch
                checked={state.tajweedEnabled}
                onChange={(next) => onUpdateState({ tajweedEnabled: next })}
                ariaLabel="Toggle Color-Coded Tajweed"
              />
            }
          />
          <IOSRow
            icon={<Flame className="w-4 h-4" />}
            iconBg="bg-[#FF9500]"
            title={t(lang, 'Tasbih Haptic Vibration', 'তাসবীহ ভাইব্রেশন')}
            rightElement={
              <IOSSwitch
                checked={state.tasbihHaptic}
                onChange={(next) => onUpdateState({ tasbihHaptic: next })}
                ariaLabel="Toggle Tasbih Haptic Vibration"
              />
            }
          />
        </IOSSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Account Creation & Local Multi-Account Switcher */}
        <section className="lg:col-span-7 rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                {t(lang, 'Create Account or Sign In', 'নতুন অ্যাকাউন্ট বা সাইন ইন')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  lang,
                  'Offline-first local accounts — your existing bookmarks, Tasbih & Prayer logs link automatically.',
                  'অফলাইন অ্যাকাউন্ট সিস্টেম — আপনার বর্তমান বুকমার্ক, তাসবীহ ও নামাজ লগ স্বয়ংক্রিয়ভাবে যুক্ত থাকবে।'
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                  authTab === 'register'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t(lang, 'Create Account', 'অ্যাকাউন্ট খুলুন')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                  authTab === 'login'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                {t(lang, 'Sign In', 'সাইন ইন')}
              </button>
            </div>
          </div>

          <form
            onSubmit={authTab === 'register' ? handleRegister : handleLogin}
            className="space-y-4"
          >
            {authTab === 'register' && (
              <div className="space-y-1.5">
                <label htmlFor="auth-name" className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'Full Name', 'পূর্ণ নাম')}
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t(lang, 'e.g. Sayed Tahmid Sajid', 'যেমন: সায়েদ তাহমিদ সাজিদ')}
                  required
                  className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="auth-identifier" className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'Email or Username', 'ইমেইল বা ইউজারনেম')}
                </label>
                <input
                  id="auth-identifier"
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="auth-pin" className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'PIN or Password (min 4 chars)', 'পিন বা পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)')}
                </label>
                <input
                  id="auth-pin"
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  required
                  minLength={4}
                  className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {authTab === 'register' && (
              <div className="space-y-2">
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'Select Profile Avatar', 'প্রোফাইল অ্যাভাটার বাছুন')}
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatarInput(av.id)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs inline-flex items-center gap-2 transition-colors ${
                        avatarInput === av.id
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'border-stone-200/80 dark:border-white/10 bg-[#F4F1EA] dark:bg-black text-zinc-600 dark:text-zinc-400 hover:border-stone-300 dark:hover:border-white/25'
                      }`}
                    >
                      <UserAvatarBadge avatarId={av.id} size="sm" />
                      <span>{lang === 'bn' ? av.labelBn : av.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {authFeedback && (
              <p
                className={`text-xs font-medium ${
                  authFeedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {authFeedback.msg}
              </p>
            )}

            <button
              type="submit"
              data-testid="auth-submit-btn"
              className="w-full sm:w-auto px-6 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
            >
              {authTab === 'register'
                ? t(lang, 'Create & Link Profile', 'অ্যাকাউন্ট তৈরি ও সংযুক্ত করুন')
                : t(lang, 'Sign In', 'সাইন ইন করুন')}
            </button>
          </form>

          {/* Saved Accounts Switcher */}
          {state.profile.accounts.length > 0 && (
            <div className="pt-4 border-t border-black/[0.07] dark:border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>{t(lang, 'Saved Profiles on This Device', 'এই ডিভাইসে সংরক্ষিত অ্যাকাউন্ট')}</span>
              </div>
              <div className="divide-y divide-black/[0.07] dark:divide-white/10">
                {state.profile.accounts.map((acc) => {
                  const isCurrent = state.profile.activeAccountId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatarBadge avatarId={acc.avatarId} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{acc.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{acc.emailOrUsername}</p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t(lang, 'Active', 'সক্রিয়')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchAccount(acc.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 hover:border-emerald-500/45 text-xs text-zinc-800 dark:text-zinc-200 shrink-0"
                        >
                          {t(lang, 'Switch', 'সুইচ করুন')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Integrated JSON Transfer Backup & About Credit */}
        <section className="lg:col-span-5 space-y-5">
          <div className="rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                {t(lang, 'Device Transfer & JSON Backup', 'ডেটা ট্রান্সফার ও JSON ব্যাকআপ')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t(
                  lang,
                  'Export your entire profile, bookmarks, Tasbih history, and Prayer logs as a portable JSON file.',
                  'অন্য ডিভাইসে নিতে আপনার প্রোফাইল, বুকমার্ক, তাসবীহ ও নামাজ লগ JSON ফাইলে ডাউনলোড করুন।'
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={onExportJson}
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t(lang, 'Export Account Backup (JSON)', 'অ্যাকাউন্ট ব্যাকআপ এক্সপোর্ট (JSON)')}
              </button>

              <label className="h-11 px-4 rounded-xl bg-[#F4F1EA] dark:bg-black hover:bg-stone-200/70 dark:hover:bg-white/5 border border-stone-200/80 dark:border-white/15 text-zinc-800 dark:text-zinc-100 font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t(lang, 'Restore Backup (JSON)', 'ব্যাকআপ ইমপোর্ট করুন (JSON)')}</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="sr-only"
                />
              </label>
            </div>

            {importFeedback && (
              <p
                className={`text-xs font-medium ${
                  importFeedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {importFeedback.msg}
              </p>
            )}

            <div className="pt-4 border-t border-black/[0.07] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                {t(lang, 'Reset local storage data', 'লোকাল ডেটা রিসেট')}
              </span>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t(lang, 'Reset Data', 'রিসেট করুন')}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setConfirmReset(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold"
                  >
                    {t(lang, 'Confirm', 'নিশ্চিত')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-xs"
                  >
                    {t(lang, 'Cancel', 'বাতিল')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* App Branding & Developer Credit Card */}
          <div className="rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-5 flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
            <NoorLogo size={42} glow />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Noor · All-Rounder Islamic Companion
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Developed &amp; Crafted by{' '}
                <span className="text-amber-700 dark:text-amber-300 font-medium">Sayed Tahmid Sajid</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
