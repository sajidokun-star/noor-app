# Noor update: audio, PWA, Fancy Mode, iOS polish

Copy every file in this folder over the same path in your repo (new files: audioManager.ts, pwa.ts, public/*).
Then run: `npm install && npm run lint && npm test && npm run build`

## 1. Azan audio (no synthetic sound, no double sound)
- Deleted `playAzanFallbackChime` and the `chime` Muazzin option (Web Audio oscillator code).
- Deleted the Tasbih oscillator click and its two "sound" toggles (the `tasbihSound` field stays in saved data, so localStorage is untouched).
- New `src/utils/audioManager.ts`: ONE shared `Audio` element. Azan, Quran and Ruqyah all claim it, which hard-stops whatever was playing first.
- iOS: the element is unlocked on the first tap anywhere (silent clip), so a scheduled Azan can play later.
- Each Muazzin has a source list tried in order: `/audio/adhan/<id>.mp3` (put your licensed files in `public/audio/adhan/`) then the remote URL.
- If the browser blocks autoplay, the Azan banner shows a "Tap to play Azan" button. If every source fails, it says so.
- Notifications are now `silent`, so the OS never adds its own sound on top of the Azan.
- Saved `muazzin: "chime"` values migrate to `makkah` automatically.

## 2. PWA / iOS
- New `public/manifest.json` (`display: standalone`), `public/sw.js`, icons; linked from `index.html`.
- `sw.js` never intercepts audio/Range requests (iOS Safari needs that), handles notification taps, and has a `push` handler.
- Notifications go through `registration.showNotification` (required on Android and iOS PWAs).
- `overscroll-behavior-y: none` on `html` and `body`.
- Notifications page shows an "Add to Home Screen" hint on iPhone when not installed.

## 3. Fancy Mode
- Theme is now `light | dark (AMOLED #000) | fancy`. Header button cycles all three; Profile has a segmented selector.
- Fancy = velvet gradient #2D0C38 to #120419, golden lantern glow, gold geometric lattice, glass cards (backdrop blur), bronze-gold prayer countdown banner, #F5B942 accents/buttons/switches.

## 4. iOS polish
- Spring page transitions, sliding nav pill, iOS switch with stretching thumb, segmented control, blur material bars, press feedback, no tap delay, no input zoom.
- Fonts, Noorani Quran font, timer colons and all localStorage keys are untouched.

## Not verified / limits
- Could not run `npm install`/`vite build` here (no network). Ran: tsc (no errors in new/changed logic files), the 11 unit tests (pass), and simulated tests of the audio manager.
- The remote Adhan URLs were kept from your code and could not be checked from here; add local MP3s for reliability.
- A web app cannot ring at prayer time while closed or locked. That needs Web Push (server + VAPID keys) or a native wrapper with local notifications.
