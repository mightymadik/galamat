export type HhOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
};

export type HhArea = { id?: string; name?: string; url?: string };
export type HhAddress = { city?: string; street?: string; raw?: string; building?: string };

export type HhVacancyListItem = {
  id: string;
  name: string;
  area?: HhArea | null;
  address?: HhAddress | null;
  alternate_url?: string;
};

export type HhVacanciesResponse = {
  items: HhVacancyListItem[];
  found?: number;
  per_page?: number;
  page?: number;
  pages?: number;
};

export type PublicVacancyCard = {
  id: string;
  title: string;
  address: string;
  link: string;
};

export type HeadHunterListParams = {
  employerId?: string;
  page?: number;
  perPage?: number;
  text?: string;
  area?: string;
};
