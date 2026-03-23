import {cookies} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';

const SUPPORTED_LOCALES = new Set(['ru', 'kk']);

export default getRequestConfig(async (_params) => {
  const store = await cookies();
  const rawLocale = (store.get('locale')?.value || 'ru').toLowerCase();
  const locale = SUPPORTED_LOCALES.has(rawLocale) ? rawLocale : 'ru';

  return {
    locale,
    messages: (await import(`../messages/${locale}/common.json`)).default
  };
});
