export const servLink = "https://pb14286.profitbase.ru/api/v4/json";

export const filesLink = "https://s.galamat.kz";
export const filesLinkSave = `${filesLink}/save-images.php`;
export const filesLinkRemove = `${filesLink}/remove-image.php`;
export const SITE_URL = {
  HOME: "/",
  PRIVACY_POLICY: "/privacy-policy",
  REQUESTS: "/requests",
  OUR_COMPANY: "/our-company",
  SALES: "/gala-bonus",
  METHODS_PURCHASE: "/methods-purchase",
  SALES_OFFICE: "/sales-office",
  USER_AGREEMENT: "/user-agreement",
  SEND_CALLBACK: "/send-callback",
  COOKIE: "/cookie",
  CONTACT: "/contact",
  SEND_REQUEST: "/send-request",
  PROJECTS: "/projects",
  PROJECTS_GALA_ONE: "/projects/gala-one",
  REAL_ESTATE: "/real-estate",
  PROJECT: "/project",
  CALCULATOR: "/calculator",
  ORLEU_PROJECT: "/orleu-project",
  ORLEU_PROJECT_PANORAMA: "/orleu-project/360",
  ADMIN: "admin",
  ADMIN_TRANSLATE: "admin/translate",
  ADMIN_USERS: "admin/users",
  ADMIN_LOGIN: "admin/login",
  ADMIN_PAGES: "admin/pages",
  ADMIN_PAGES_HOME: "home",
  ADMIN_PAGES_COMPANY: "company",
  ADMIN_PROJECTS: "admin/projects",
  ADMIN_LOTTERY: "admin/lottery",
  ADMIN_PROJECTS_HOUSES: "admin/projects/houses",
};

export const localStorageKeys = {
  tokenData: "tokenData",
  tokenTime: "tokenTime",
  tokenAdmin: "tokenAdmin",
  userAdmin: "userAdmin",
  languages: "languages",
  cookieComplete: "cookieComplete",
};

export const motionOptionText = {
  init: {
    opacity: 0,
    y: "30px",
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

export const all = "Все";

export const floorSelectItems = Array.from({ length: 30 }, (_, i) => i + 1);

export const ProjectDataPositions = [
  { value: "business", label: "Бизнес", color: "#DB1D31" },
  { value: "business-plus", label: "Бизнес +", color: "#DB1D31" },
  { value: "comfort-plus", label: "Комфорт +", color: "#132C5E" },
  { value: "comfort", label: "Комфорт", color: "#156E33" },
  { value: "standard", label: "Стандарт", color: "#7B7B7B" },
] as const;

export const formatPrice = (value: number) => {
  if (value >= 1_000_000) {
    const millions = (value / 1_000_000).toFixed(1).replace(".", ",");
    return `${millions} млн`;
  } else if (value >= 1_000) {
    const thousands = Math.round(value / 1_000);
    return `${thousands} тыс`;
  } else {
    return value.toString();
  }
};

export const isValidInternationalPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/[\s\-().]/g, ""); // մաքրում ենք բացատներ, փակագծեր, դաշեր և կետեր

  const pattern = /^(?:\+|00)?[1-9]\d{6,14}$/;

  return pattern.test(cleaned);
};
