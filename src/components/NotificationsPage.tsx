import React, { useState } from 'react';
import { Bell, BellRing, Clock, Music2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type {
  AppPersistedState,
  DailyPrayerTimes,
  MuazzinId,
  WaqtKey,
} from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { MUAZZIN_OPTIONS } from '../utils/notifications';
import { needsIOSInstallForNotifications } from '../utils/pwa';
import { formatTime12h } from '../utils/calculations';
import { formatNum, t, WAQT_LABELS } from '../utils/i18n';
import { PageHeader } from './PageHeader';
import { IOSRow, IOSSection, IOSSwitch } from './IOSSettingsPrimitives';
import { SpacedTime } from './SpacedTime';

const WAQT_ORDER: WaqtKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const HADITH_FREQUENCIES = [
  { minutes: 60, en: 'Every 1 hour', bn: 'প্রতি ১ ঘণ্টা পরপর' },
  { minutes: 240, en: 'Every 4 hours', bn: 'প্রতি ৪ ঘণ্টা পরপর' },
  { minutes: 720, en: 'Twice daily (12h)', bn: 'দিনে ২ বার (১২ ঘণ্টা)' },
  { minutes: 1440, en: 'Once daily (24h)', bn: 'দিনে ১ বার (২৪ ঘণ্টা)' },
];

interface NotificationsPageProps {
  state: AppPersistedState;
  prayerTimes: DailyPrayerTimes;
  isAzanPlaying: boolean;
  onRequestPermissions: () => Promise<NotificationPermission | 'unsupported'>;
  onTriggerTestAzan: () => void;
  onStopAzan: () => void;
  onTriggerTestHadith: () => void;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  state,
  prayerTimes,
  isAzanPlaying,
  onRequestPermissions,
  onTriggerTestAzan,
  onStopAzan,
  onTriggerTestHadith,
  onUpdateState,
  onNavigate,
}) => {
  const lang = state.language;
  const notif = state.notifications;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const browserPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const handlePermissionClick = async () => {
    const res = await onRequestPermissions();
    if (res === 'granted') {
      setStatusMessage(
        t(
          lang,
          'Notifications & Azan audio permission enabled.',
          'নোটিফিকেশন ও আজান অডিও অনুমতি সক্রিয় হয়েছে।'
        )
      );
    } else if (res === 'denied') {
      setStatusMessage(
        t(
          lang,
          'Browser notifications blocked. In-app Azan alerts & audio will still work.',
          'ব্রাউজার নোটিফিকেশন ব্লক করা; তবে অ্যাপের ভেতরে আজান অ্যালার্ট ও অডিও চলবে।'
        )
      );
    } else if (res === 'unsupported') {
      setStatusMessage(
        t(
          lang,
          'Audio permission unlocked. Browser push notifications are unsupported here.',
          'অডিও অনুমতি সক্রিয় হয়েছে (এই ব্রাউজারে সিস্টেম পুশ নেই)।'
        )
      );
    }
  };

  const toggleWaqtAlert = (waqt: WaqtKey) => {
    onUpdateState((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        azanWaqtAlerts: {
          ...prev.notifications.azanWaqtAlerts,
          [waqt]: !prev.notifications.azanWaqtAlerts[waqt],
        },
      },
    }));
  };

  const permissionStatusText =
    browserPermission === 'granted'
      ? t(lang, 'Allowed', 'অনুমোদিত')
      : browserPermission === 'denied'
      ? t(lang, 'In-App Only', 'শুধু অ্যাপে চালু')
      : browserPermission === 'unsupported'
      ? t(lang, 'In-App Ready', 'প্রস্তুত')
      : t(lang, 'Not Requested', 'অনুমতি বাকি');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        lang={lang}
        title={t(lang, 'Azan Alarm & Notifications', 'আজান অ্যালার্ম ও নোটিফিকেশন')}
        subtitle={t(
          lang,
          'Configure 5-Waqt prayer time Azan audio alerts and daily Hadith notifications.',
          '৫ ওয়াক্ত নামাজের আজান অ্যালার্ম এবং দৈনিক সহীহ হাদীস নোটিফিকেশন সেট করুন।'
        )}
        onNavigate={onNavigate}
      />

      {needsIOSInstallForNotifications() && (
        <div
          role="note"
          data-testid="ios-install-hint"
          className="rounded-2xl border border-amber-300/60 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 px-4 py-3 text-[13px] leading-relaxed text-amber-900 dark:text-amber-200"
        >
          {t(
            lang,
            'On iPhone, notifications only work after you install Noor: tap Share, then "Add to Home Screen", and open Noor from the Home Screen icon.',
            'আইফোনে নোটিফিকেশন পেতে Noor ইনস্টল করতে হবে: Share চাপুন, তারপর "Add to Home Screen" নির্বাচন করে হোম স্ক্রিনের আইকন থেকে অ্যাপটি খুলুন।'
          )}
        </div>
      )}

      {/* iOS Grouped Permission & Quick Actions */}
      <IOSSection
        title={t(lang, 'Permissions & Quick Test', 'অনুমতি ও টেস্ট')}
        footer={statusMessage ?? undefined}
      >
        <IOSRow
          icon={<BellRing className="w-4 h-4" />}
          iconBg="bg-[#FF3B30]"
          title={t(lang, 'Allow Notifications & Audio', 'নোটিফিকেশন ও অডিও অনুমতি')}
          subtitle={t(lang, 'Tap to enable system alerts and unlock Azan playback', 'সিস্টেম অ্যালার্ট ও আজান অডিও চালু করতে ট্যাপ করুন')}
          value={permissionStatusText}
          chevron
          onClick={handlePermissionClick}
          testId="enable-notifications-btn"
        />
        <IOSRow
          icon={<Volume2 className="w-4 h-4" />}
          iconBg="bg-[#34C759]"
          title={t(lang, 'Test Azan Alarm', 'টেস্ট আজান বাজান')}
          subtitle={t(lang, 'Preview selected Muazzin voice & in-app alert banner', 'নির্বাচিত মুয়াজ্জিনের আজান ও অ্যালার্ট পরীক্ষা করুন')}
          chevron
          onClick={onTriggerTestAzan}
          testId="test-azan-btn"
        />
        {isAzanPlaying && (
          <IOSRow
            icon={<VolumeX className="w-4 h-4" />}
            iconBg="bg-amber-500"
            title={t(lang, 'Mute / Stop Azan Now', 'আজান বন্ধ করুন')}
            destructive
            chevron
            onClick={onStopAzan}
            testId="stop-azan-btn"
          />
        )}
      </IOSSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 5-Waqt Prayer Switches */}
        <IOSSection
          title={t(lang, '5-Waqt Azan Alerts', '৫ ওয়াক্ত নামাজের অ্যালার্ট')}
          footer={t(
            lang,
            'Alerts trigger automatically at the exact prayer minute while Noor is active.',
            'অ্যাপ খোলা থাকলে প্রতিটি ওয়াক্তের সঠিক সময়ে স্বয়ংক্রিয়ভাবে অ্যালার্ট বাজবে।'
          )}
        >
          {WAQT_ORDER.map((waqt) => {
            const enabled = notif.azanWaqtAlerts[waqt];
            return (
              <IOSRow
                key={waqt}
                icon={<Clock className="w-4 h-4" />}
                iconBg={enabled ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}
                title={WAQT_LABELS[waqt][lang]}
                subtitle={<SpacedTime value={formatTime12h(prayerTimes[waqt])} lang={lang} />}
                rightElement={
                  <IOSSwitch
                    checked={enabled}
                    onChange={() => toggleWaqtAlert(waqt)}
                    ariaLabel={`Toggle ${WAQT_LABELS[waqt].en} Azan alert`}
                    testId={`waqt-alert-toggle-${waqt}`}
                  />
                }
              />
            );
          })}

          <IOSRow
            icon={<Volume2 className="w-4 h-4" />}
            iconBg="bg-[#007AFF]"
            title={t(lang, 'Auto-Play Azan Audio', 'স্বয়ংক্রিয় আজান অডিও')}
            subtitle={t(
              lang,
              'Plays the selected Muazzin\'s recorded Azan (one voice at a time)',
              'নির্বাচিত মুয়াজ্জিনের রেকর্ড করা আজান বাজবে (একবারে একটি কণ্ঠ)'
            )}
            rightElement={
              <IOSSwitch
                checked={notif.playAzanAudio}
                onChange={(next) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, playAzanAudio: next },
                  }))
                }
                ariaLabel="Toggle automatic Azan audio playback"
              />
            }
          />
        </IOSSection>

        {/* Muazzin Voice Picker + Daily Hadith */}
        <div className="space-y-6">
          <IOSSection title={t(lang, 'Muazzin / Tone', 'মুয়াজ্জিন ও ধ্বনি নির্বাচন')}>
            {MUAZZIN_OPTIONS.map((m) => (
              <IOSRow
                key={m.id}
                icon={<Music2 className="w-4 h-4" />}
                iconBg="bg-amber-500"
                title={lang === 'bn' ? m.nameBn : m.nameEn}
                selected={notif.muazzin === m.id}
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, muazzin: m.id as MuazzinId },
                  }))
                }
              />
            ))}
          </IOSSection>

          <IOSSection
            title={t(lang, 'Daily Hadith Alerts', 'দৈনিক হাদীস নোটিফিকেশন')}
            footer={t(
              lang,
              'Receive authentic Hadith reminders periodically. Tapping opens the Hadith page.',
              'নির্ধারিত সময় পরপর সহীহ হাদীস নোটিফিকেশন পাবেন; ট্যাপ করলেই হাদীস পেজ ওপেন হবে।'
            )}
          >
            <IOSRow
              icon={<Sparkles className="w-4 h-4" />}
              iconBg="bg-[#5856D6]"
              title={t(lang, 'Periodic Hadith Reminders', 'নিয়মিত হাদীস অ্যালার্ট')}
              rightElement={
                <IOSSwitch
                  checked={notif.dailyHadithAlerts}
                  onChange={(next) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        dailyHadithAlerts: next,
                        lastHadithSentAt:
                          prev.notifications.lastHadithSentAt ?? new Date().toISOString(),
                      },
                    }))
                  }
                  ariaLabel="Toggle periodic daily Hadith notifications"
                  testId="daily-hadith-toggle"
                />
              }
            />

            {HADITH_FREQUENCIES.map((freq) => (
              <IOSRow
                key={freq.minutes}
                title={lang === 'bn' ? freq.bn : freq.en}
                selected={notif.hadithIntervalMinutes === freq.minutes}
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, hadithIntervalMinutes: freq.minutes },
                  }))
                }
              />
            ))}

            <IOSRow
              icon={<Bell className="w-4 h-4" />}
              iconBg="bg-emerald-500"
              title={t(lang, 'Send Test Hadith Notification', 'টেস্ট হাদীস নোটিফিকেশন পাঠান')}
              chevron
              onClick={onTriggerTestHadith}
              testId="test-hadith-notif-btn"
            />
          </IOSSection>
        </div>
      </div>
    </div>
  );
};
