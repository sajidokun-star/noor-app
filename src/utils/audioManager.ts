/**
 * Noor audio manager.
 *
 * Guarantees that only ONE HTMLAudioElement exists and only ONE voice (Azan, Quran
 * recitation or Ruqyah) can play at a time. Claiming the element hard-stops whatever
 * was playing first, so double sounds are impossible.
 *
 * Using a single shared element also matters on iOS Safari: playback permission is
 * granted per element after a user gesture. If every feature created its own `Audio`,
 * a scheduled Azan (which has no gesture) would be blocked. The shared element is
 * unlocked on the first tap/click anywhere in the app (see `installAudioUnlock`).
 *
 * No Web Audio API / oscillator code lives here: only real recorded audio is played.
 */

export type AudioOwner = 'azan' | 'quran' | 'ruqyah';

interface ActiveClaim {
  owner: AudioOwner;
  onPreempt: () => void;
}

let sharedAudio: HTMLAudioElement | null = null;
let activeClaim: ActiveClaim | null = null;
let unlocked = false;
let unlocking = false;
let chainToken = 0;

/** Builds a tiny silent PCM WAV (0.1s) used only to unlock playback on iOS. */
function buildSilentWavDataUri(): string {
  const sampleRate = 8000;
  const samples = 800;
  const buffer = new Uint8Array(44 + samples);
  const view = new DataView(buffer.buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) buffer[offset + i] = str.charCodeAt(i);
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate (8-bit mono)
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeStr(36, 'data');
  view.setUint32(40, samples, true);
  buffer.fill(0x80, 44); // 8-bit PCM silence
  let binary = '';
  for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
    sharedAudio.setAttribute('playsinline', '');
  }
  return sharedAudio;
}

function hardStop(el: HTMLAudioElement): void {
  el.onended = null;
  el.onerror = null;
  el.muted = false;
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    // ignore: element may not have metadata yet
  }
}

/**
 * Claims the shared element for `owner`. Anything already playing is stopped first and,
 * when the previous owner is a different feature, its `onPreempt` callback runs so its
 * UI can reset (e.g. Quran play button -> paused).
 */
export function claimAudio(owner: AudioOwner, onPreempt: () => void): HTMLAudioElement {
  const el = getSharedAudio();
  const previous = activeClaim;
  chainToken += 1; // invalidates any in-flight source chain
  hardStop(el);
  activeClaim = { owner, onPreempt };
  if (previous && previous.owner !== owner) {
    previous.onPreempt();
  }
  return el;
}

/** Stops playback if `owner` currently holds the element. */
export function releaseAudio(owner: AudioOwner): void {
  if (!activeClaim || activeClaim.owner !== owner) return;
  chainToken += 1;
  if (sharedAudio) hardStop(sharedAudio);
  activeClaim = null;
}

export function isAudioOwner(owner: AudioOwner): boolean {
  return activeClaim?.owner === owner;
}

export interface SourceChainHandlers {
  /** Called when the browser refuses playback because no user gesture unlocked audio. */
  onBlocked?: () => void;
  /** Called when every source failed to load/play. */
  onFailed?: () => void;
  /** Called when the audio finished naturally. */
  onEnded?: () => void;
}

/**
 * Plays the first working URL from `sources` on the shared element (exclusive).
 * Each candidate is tried once; a load error or unsupported source advances to the
 * next candidate exactly once (no double playback).
 */
export function playSourceChain(
  owner: AudioOwner,
  sources: string[],
  onPreempt: () => void,
  handlers: SourceChainHandlers = {}
): void {
  const el = claimAudio(owner, onPreempt);
  const token = chainToken;

  const attempt = (index: number) => {
    if (token !== chainToken) return;
    if (index >= sources.length) {
      handlers.onFailed?.();
      return;
    }
    let advanced = false;
    const next = () => {
      if (advanced || token !== chainToken) return;
      advanced = true;
      attempt(index + 1);
    };
    el.onerror = next;
    el.onended = () => {
      if (token === chainToken) handlers.onEnded?.();
    };
    el.src = sources[index];
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err: unknown) => {
        if (token !== chainToken) return;
        const name = (err as { name?: string } | null)?.name;
        if (name === 'NotAllowedError') {
          handlers.onBlocked?.();
          return;
        }
        if (name === 'AbortError') return; // superseded by a newer claim
        next();
      });
    }
  };

  attempt(0);
}

/**
 * Unlocks audio playback for the shared element. Must run inside a user gesture.
 * Plays a silent clip (muted) and immediately pauses it.
 */
export function unlockAudio(): void {
  if (unlocked || unlocking || typeof window === 'undefined') return;
  if (activeClaim) {
    // Something real is already playing, so playback is evidently permitted.
    unlocked = true;
    return;
  }
  const el = getSharedAudio();
  unlocking = true;
  el.muted = true;
  el.src = buildSilentWavDataUri();
  const p = el.play();
  if (p && typeof p.then === 'function') {
    p.then(() => {
      unlocking = false;
      if (!activeClaim) {
        el.pause();
        el.currentTime = 0;
      }
      el.muted = false;
      unlocked = true;
    }).catch(() => {
      unlocking = false;
      el.muted = false;
    });
  } else {
    unlocking = false;
  }
}

/** Installs one-time global gesture listeners that unlock audio on first interaction. */
export function installAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => {};
  const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchend', 'click', 'keydown'];
  const handler = () => {
    unlockAudio();
    if (unlocked) remove();
  };
  const remove = () => events.forEach((e) => window.removeEventListener(e, handler));
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  return remove;
}
