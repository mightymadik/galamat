import {cookies} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async (_params) => {
  const store = await cookies();
  const locale = store.get('locale')?.value || 'ru';

  return {
    locale,
    messages: (await import(`../messages/${locale}/common.json`)).default
  };
});
