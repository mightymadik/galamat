import "./global.scss";
import "@heroui/theme";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import Header from "@/components/common/header/header";
import Footer from "@/components/common/footer/footer";
import Menu from "@/components/common/menu/menu";
import ReduxProvider from "./providers";
import { store } from "@/store";
import AuthModal from "@/components/common/authModal/authModal";
import UtmCapture from "@/components/common/utmCapture/utmCapture";
import CtaModal from "@/components/common/ctaModal/ctaModal";
import { NextIntlClientProvider } from 'next-intl';
import CookieConsent from "@/components/common/cookieConsent/cookieConsent";

type Props = {
  children: React.ReactNode;
};

// Locale/city come from cookies (next-intl + apiGet). Static prerender would throw DYNAMIC_SERVER_USAGE.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Купить квартиру в Астане — Galamat | Отдел продаж недвижимости",
  description:
    "Galamat — надёжная недвижимость в столице. Купить квартиру в Астане легко с нами: профессиональный отдел продаж, выгодные предложения и сопровождение сделки.",
  keywords: [
    "Купить квартиру в Астане",
    "Новостройки Астана",
    "Недвижимость в Астане",
    "1-комнатная квартира Астана",
    "2-комнатная квартира Астана",
    "3-комнатная квартира Астана",
    "4-комнатная квартира Астана",
    "Квартира в ипотеку Астана",
    "Квартира в рассрочку Астана",
    "Дешевые квартиры Астана",
  ],
  alternates: {
    canonical: "https://galamat.kz",
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/favicon.ico' },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default async function RootLayout({ children }: Props) {
  return (
    <html lang="ru" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id=GTM-KTS8G3K9'+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KTS8G3K9');`,
          }}
        />

        {/* Yandex.Metrika */}
        <Script
          id="yandex-metrika-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');

ym(108235655, 'init', {
  webvisor:true,
  clickmap:true,
  trackLinks:true,
  accurateTrackBounce:true,
  ecommerce:"dataLayer"
});`,
          }}
        />
      </head>
      <body className="notranslate" translate="no">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KTS8G3K9"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {/* Yandex.Metrika (noscript) */}
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/108235655"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <NextIntlClientProvider>
          <ReduxProvider store={store}>
            <NextTopLoader />
            <CookieConsent />
            <Header />
            <main className="flex-1">{children}</main>
            <Menu />
            <Footer />
            <AuthModal />
            <CtaModal />
            <UtmCapture />
          </ReduxProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}