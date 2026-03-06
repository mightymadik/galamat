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
import PreloadComponent from "@/components/common/preload/preload";
import UtmCapture from "@/components/common/utmCapture/utmCapture";
import CtaModal from "@/components/common/ctaModal/ctaModal";
import { NextIntlClientProvider } from 'next-intl';

type Props = {
  children: React.ReactNode;
};

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
  viewport: {
    width: "device-width",
    initialScale: 1.0,
  },
};

export default async function RootLayout({ children }: Props) {
  return (
    <html>
      <head>
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
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KTS8G3K9"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <NextIntlClientProvider>
          <ReduxProvider store={store}>
            <NextTopLoader />
            {/* <PreloadComponent /> */}
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