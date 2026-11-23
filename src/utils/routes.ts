export type AppRoute =
  | 'home'
  | 'quran'
  | 'prayer'
  | 'qibla'
  | 'tracker'
  | 'calendar'
  | 'hadith'
  | 'fiqh'
  | 'dua'
  | 'tasbih'
  | 'ruqyah'
  | 'zakat'
  | 'miras'
  | 'quiz'
  | 'card-maker'
  | 'nearby'
  | 'backup'
  | 'notifications'
  | 'profile'
  | 'ramadan'
  | 'seerah'
  | 'ai-assistant'
  | 'tools';

const VALID_ROUTES = new Set<AppRoute>([
  'home',
  'quran',
  'prayer',
  'qibla',
  'tracker',
  'calendar',
  'hadith',
  'fiqh',
  'dua',
  'tasbih',
  'ruqyah',
  'zakat',
  'miras',
  'quiz',
  'card-maker',
  'nearby',
  'backup',
  'notifications',
  'profile',
  'ramadan',
  'seerah',
  'ai-assistant',
  'tools',
]);

export function parseHashToRoute(hash: string): AppRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim().toLowerCase() as AppRoute;
  return VALID_ROUTES.has(cleaned) ? cleaned : 'home';
}

export function routeToHash(route: AppRoute): string {
  return `#/${route}`;
}
