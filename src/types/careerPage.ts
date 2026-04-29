export interface CareerHeroData {
  id: number;
  title: string;
  videoLink: string;
}

export interface CareerNumberData {
  id: number;
  icon: string | null;
  title: string;
  description: string;
  bgImage: string | null;
}

export interface CareerTeamData {
  id: number;
  title: string;
  image: string | null;
}

export interface CareerConditionData {
  id: number;
  icon: string | null;
  title: string;
}

export interface CareerStageData {
  id: number;
  number: number;
  icon: string | null;
  title: string;
}
