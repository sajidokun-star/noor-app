import type {
  AvatarId,
  UserAccountRecord,
  UserProfileState,
  WaqtKey,
} from '../types/islamic';
import { formatDateKey } from './calculations';

export const AVATAR_OPTIONS: Array<{
  id: AvatarId;
  labelEn: string;
  labelBn: string;
}> = [
  { id: 'crescent', labelEn: 'Crescent', labelBn: 'হেলাল চাঁদ' },
  { id: 'lantern', labelEn: 'Noor Lantern', labelBn: 'নূর লণ্ঠন' },
  { id: 'kaaba', labelEn: 'Kaaba', labelBn: 'কাবা শরীফ' },
  { id: 'quran', labelEn: 'Mushaf', labelBn: 'কুরআন' },
  { id: 'star', labelEn: 'Rub el Hizb', labelBn: 'নক্ষত্র' },
  { id: 'dome', labelEn: 'Masjid Dome', labelBn: 'মসজিদ গম্বুজ' },
];

/**
 * Deterministic client-side digest for offline PIN/password verification.
 */
export function hashCredential(raw: string): string {
  const input = raw.trim();
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `noor_${(h2 >>> 0).toString(16)}_${(h1 >>> 0).toString(16)}`;
}

export function validateAccountFields(input: {
  name: string;
  emailOrUsername: string;
  pin: string;
}): { ok: true } | { ok: false; errorKey: 'name' | 'identifier' | 'pin' } {
  if (input.name.trim().length < 2) {
    return { ok: false, errorKey: 'name' };
  }
  if (input.emailOrUsername.trim().length < 3) {
    return { ok: false, errorKey: 'identifier' };
  }
  if (input.pin.trim().length < 4) {
    return { ok: false, errorKey: 'pin' };
  }
  return { ok: true };
}

export function createUserAccount(
  profile: UserProfileState,
  input: {
    name: string;
    emailOrUsername: string;
    pin: string;
    avatarId: AvatarId;
  },
  nowIso: string = new Date().toISOString()
): { ok: true; profile: UserProfileState; account: UserAccountRecord } | { ok: false; error: string } {
  const normalizedId = input.emailOrUsername.trim().toLowerCase();
  const duplicate = profile.accounts.some(
    (a) => a.emailOrUsername.trim().toLowerCase() === normalizedId
  );
  if (duplicate) {
    return { ok: false, error: 'duplicate_account' };
  }

  const account: UserAccountRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    emailOrUsername: input.emailOrUsername.trim(),
    pinHash: hashCredential(input.pin),
    avatarId: input.avatarId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    ok: true,
    account,
    profile: {
      ...profile,
      activeAccountId: account.id,
      accounts: [...profile.accounts, account],
    },
  };
}

export function authenticateUserAccount(
  profile: UserProfileState,
  emailOrUsername: string,
  pin: string
): { ok: true; profile: UserProfileState; account: UserAccountRecord } | { ok: false; error: string } {
  const normalized = emailOrUsername.trim().toLowerCase();
  const found = profile.accounts.find(
    (a) => a.emailOrUsername.trim().toLowerCase() === normalized
  );
  if (!found) {
    return { ok: false, error: 'not_found' };
  }
  if (found.pinHash !== hashCredential(pin)) {
    return { ok: false, error: 'invalid_pin' };
  }
  return {
    ok: true,
    account: found,
    profile: {
      ...profile,
      activeAccountId: found.id,
    },
  };
}

export function getActiveDisplayIdentity(profile: UserProfileState): {
  isAuthenticated: boolean;
  account: UserAccountRecord | null;
  displayName: string;
  avatarId: AvatarId;
  handle: string;
} {
  const active =
    profile.activeAccountId
      ? profile.accounts.find((a) => a.id === profile.activeAccountId) ?? null
      : null;

  if (active) {
    return {
      isAuthenticated: true,
      account: active,
      displayName: active.name,
      avatarId: active.avatarId,
      handle: active.emailOrUsername,
    };
  }

  return {
    isAuthenticated: false,
    account: null,
    displayName: profile.guestName || 'Guest Believer',
    avatarId: profile.guestAvatarId || 'crescent',
    handle: 'Local Guest Profile',
  };
}

const WAQT_KEYS: WaqtKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Counts consecutive days ending today (or yesterday if today not logged yet)
 * where at least 1 Waqt (or all 5) was marked prayed.
 */
export function calculatePrayerStreak(
  checklist: Record<string, Record<WaqtKey, boolean>>,
  today: Date = new Date()
): { activeDaysStreak: number; fullFiveStreak: number; totalWaqtLogged: number } {
  let totalWaqtLogged = 0;
  for (const dayObj of Object.values(checklist)) {
    if (!dayObj || typeof dayObj !== 'object') continue;
    for (const w of WAQT_KEYS) {
      if (dayObj[w]) totalWaqtLogged += 1;
    }
  }

  const countDay = (d: Date) => {
    const key = formatDateKey(d);
    const entry = checklist[key];
    if (!entry) return 0;
    return WAQT_KEYS.reduce((acc, w) => acc + (entry[w] ? 1 : 0), 0);
  };

  let activeDaysStreak = 0;
  let fullFiveStreak = 0;

  // Allow streak to continue from yesterday if today hasn't had prayers logged yet
  const todayCount = countDay(today);
  const startOffset = todayCount > 0 ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const probe = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (countDay(probe) > 0) {
      activeDaysStreak += 1;
    } else {
      break;
    }
  }

  const fullStartOffset = todayCount === 5 ? 0 : 1;
  for (let i = fullStartOffset; i < 365; i++) {
    const probe = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (countDay(probe) === 5) {
      fullFiveStreak += 1;
    } else {
      break;
    }
  }

  return { activeDaysStreak, fullFiveStreak, totalWaqtLogged };
}
