declare interface IStateTranslate {
  translateSite: {
    words: any;
    selectedLang: string;
    languages: string[];
  };
}

declare interface IModalState {
  modals: {
    modalSelectedHouse: IHouse | null;
    objectInfo: IObjectData[] | null;
    modalSendRequest: boolean;
    modalSendRequestGlaOne: string | null;
  };
}

declare interface IProjectsState {
  projectsState: {
    projects: IProjectMerged[];
  };
}

declare interface IParams {
  projectId: number;
  projectIds?: number[];
  houseId: number;
  rooms: number[];
  "price[min]": number;
  "price[max]": number;
  minFloor: number;
  maxFloor: number;
  "area[min]": number;
  "area[max]": number;
}

declare interface IFilterParamsState {
  filterParams: {
    params: IParams;
  };
}

interface Description {
  title: string | null;
  body: string | null;
}

interface Location {
  latitude: number | null;
  longitude: number | null;
  zoom: number | null;
}

declare interface IProjectStage {
  id: number;
  title: string;
  type: string;
  currency: string;
  developer: string | null;
  developer_brand: string | null;
  description: Description;
  agreementText: string | null;
  archiveState: "ARCHIVED" | "NOT_ARCHIVED";
  banks: string | null;
  district: string | null;
  locality: string | null;
  region: string | null;
  salesOffice: string | null;
  externalId: string | null;
  parking: string | null;
  hasKindergarten: boolean;
  hasPlayground: boolean;
  hasSchool: boolean;
  hasSecurity: boolean;
  hasSportsGround: boolean;
  images: IProjectImage[];
  location: Location;
  youtubeVideos: string[];
  completion_date: string;
}

interface IProjectImage {
  url: string;
  mobile_url: string;
  isPublished: boolean;
}

declare interface Location {
  latitude: number | null;
  longitude: number | null;
  zoom: number | null;
}

declare interface ILanguage {
  id: number;
  name: string;
  key: string | null;
  parent_id: string | null;
}

interface Description {
  title: string | null;
  body: string | null;
}

declare interface ILangMerged {
  id: number | undefined;
  ruName: string;
  name: string;
  parent_id: number | null | undefined;
}

declare interface IUser {
  id: number;
  name: string;
  login: string;
  password: string;
  status: "super-admin" | "def-user";
}

declare interface IUserNoPass {
  id: number;
  name: string;
  login: string;
  status: "super-admin" | "def-user" | string;
}

declare interface ISliderItem {
  id: number;
  slider_name: string;
  image_path: string;
  url: string;
  parent_id: string;
  sub_parent_id: number;
  lang_key: string;
  children?: ISliderItem[];
  sort_index: number;
}

type IProjectDataPositions =
  | "business"
  | "business-plus"
  | "comfort-plus"
  | "comfort"
  | "standard";

declare interface IProjectData {
  id: number;
  project_id: number;
  hide: boolean;
  position: IProjectDataPositions;
  page_url: string;
  address: string;
  min_price: number;
  file_url: string;
}

declare interface IProjectMerged extends IProjectStage {
  id: number;
  project_id: number;
  hide: boolean;
  position: IProjectDataPositions;
  page_url: string;
  address: string;
  min_price: number;
}

// FOR PLANS

declare interface IPlanAddress {
  full: string;
  locality: string;
  district: string | null;
  region: string | null;
  street: string;
  number: string | null;
}

declare interface IPlanImageInfo {
  source: string;
  technical: boolean;
  big: string;
  preview: string;
  small: string;
  imageName: string;
}

declare interface IPlanPriceRange {
  min: string;
  max: string;
}

declare interface IPlanAreaRange {
  min: string;
  max: string;
}

declare interface IPlan {
  id: number;
  code: string;
  projectId: number;
  projectName: string;
  houseName: string;
  houseId: number;
  isHouseArchive: boolean;
  isWithoutLayout: boolean;
  isStudio: boolean;
  isEuroLayout: boolean;
  isFreeLayout: boolean;
  roomsAmount: number;
  hidePrice: boolean;
  priceRange: IPlanPriceRange;
  areaRange: IPlanAreaRange;
  attachments: any[]; // փոխիր կոնկրետ տիպով եթե կա
  properties: string[];
  propertyTypeAliases: string[];
  address: IPlanAddress;
  image: IPlanImageInfo;
  planImages: IPlanImageInfo[];
  lightSideAngle: number;
  isLightSideVisible: boolean;
  countFilteredProperty: number;
}

// FOR PROPERTY

declare interface IPropertyArea {
  area_total: number;
  area_estimated: number | null;
  area_living: number | null;
  area_kitchen: number | null;
  area_balcony: number | null;
  area_without_balcony: number | null;
}

declare interface IPropertyPrice {
  value: number;
  prevValue: number | null;
  pricePerMeter: number;
  isActivePromo: boolean;
}

declare interface IProperty {
  id: number;
  house_id: number;
  houseName: string;
  isHouseArchive: boolean;
  projectName: string;
  number: string;
  rooms_amount: number;
  floor: number;
  sectionName: string;
  layout_type: string;
  without_layout: boolean;
  studio: boolean;
  free_layout: boolean;
  euro_layout: boolean;
  propertyType: string;
  typePurpose: "apartment" | "office" | "parking" | "residential";
  has_related_preset_with_layout: boolean;
  facing: string;
  externalId: string | null;
  area: IPropertyArea;
  show_calculate_mortgage: boolean;
  show_register: boolean;
  disable_booking_button: boolean;
  price: IPropertyPrice;
  status: "AVAILABLE" | "SOLD" | "BOOKED" | "UNAVAILABLE";
  customStatusId: number;
  specialOffersIds: number[] | null;
  specialOffers: any | null;
  responsibleName: string | null;
  responsibleId: number | null;
  crmContactName: string | null;
  crmContactId: number | null;
  countHistoryRecord: number | null;
  countDeals: number | null;
  positionOnFloor: number;
  layoutCode: string;
  bookedUntilDate: string | null;
  bookedUntilTime: string | null;
}

declare interface IMaxPlan {
  id: number;
  lightSideAngle: number;
  isLightSideVisible: boolean;
  areas: IMaxPlanArea[];
  images: IMaxPlanImages;
  originalLayoutHeight: number;
  originalLayoutWidth: number;
  number: number;
  sectionNumber: number;
}

declare interface IMaxPlanArea {
  coordinates: IMaxPlanCoordinate[];
  propertyId: number;
}

declare interface IMaxPlanCoordinate {
  x: number;
  y: number;
}

declare interface IMaxPlanImages {
  source: string;
  large: string;
  big: string;
  preview: string;
}

// FOR HOUSES

declare interface IHouse {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  type: "RESIDENTIAL" | string;
  isArchive: boolean;
  street: string;
  number: string;
  facing: string;
  material: string | null;
  buildingState: "UNFINISHED" | "BUILT" | "HAND-OVER";
  developmentStartQuarter: IHouseQuarter | null;
  developmentEndQuarter: IHouseQuarter | null;
  salesStart: IHouseMonthYear | null;
  salesEnd: IHouseMonthYear | null;
  image: string;
  fullImage: string;
  minFloor: number;
  maxFloor: number;
  currency: IHouseCurrency;
  address: IHouseAddress;
  minPrice: number;
  minPriceArea: number;
  propertyCount: string;
  countFilteredProperty: string;
  houseBadges: any[];
  propertyTypes: number[];
  roomsFilter: string[];
  roomsWithEuroFilter: string[];
  landNumber: string | null;
  hasAvailableProperties: boolean;
  hasBookedProperties: boolean;
  contractAddress: string | null;
  externalId: string;
  showroom: boolean;
  commissioningDate: string | null;
}

declare interface IHouseQuarter {
  year: string;
  quarter: number;
}

declare interface IHouseMonthYear {
  month: string;
  year: string;
}

declare interface IHouseCurrency {
  id: number;
  code: string;
  class: string;
  symbol: string;
  title: string;
  shortName: string;
  unicodeSymbol: string;
}

declare interface IHouseAddress {
  full: string;
  locality: string | null;
  district: string | null;
  region: string | null;
  street: string;
  number: string;
}

declare interface IObjectData {
  id: number;
  project_house_id: number;
  api_url: string;
  coordinates: string;
  image_path: string;
  color: string;
  parent_id: null | number;
}

declare interface IFloor {
  id: number;
  lightSideAngle: number;
  isLightSideVisible: boolean;
  images: {
    source: string;
    large: string;
    big: string;
    preview: string;
  };
  originalLayoutHeight: number;
  originalLayoutWidth: number;
  areas: [
    {
      propertyId: number;
      coordinates: {
        x: number;
        y: number;
      }[];
    },
  ];
  number: number;
  sectionNumber: number;
}

declare interface ICell {
  propertyId: number | null;
}

declare interface ISection {
  number: number;
  name: string;
  cells: ICell[];
}

declare interface IFloor {
  number: number;
  sections: ISection[];
}

declare interface ISectionName {
  name: string;
  number: number;
}

declare interface IBoard {
  floors: IFloor[];
  sectionNames: ISectionName[];
}

type playingStatus = "no-verified" | "verified" | "played" | "winnings-taken";

declare interface IDataSendMessage {
  status: "created-db" | "have-db" | "error";
  data: {
    id: number;
    phone: number;
    name: string;
    status: playingStatus;
    winner: number;
    verification_code: number;
    timeout: string;
  };
  dataWhatsappContent: {
    status: string;
    requestId: string;
  };
  error: "";
}

declare interface IProbabilities {
  id: number;
  price: number;
  probability: number;
  rotate: number;
}

declare interface IPlayer {
  id: number;
  phone: string;
  status: playingStatus;
  timeout: string;
  verification_code: number;
  winner: number;
}

declare interface IDataOldProjects {
  image_url: string;
  name: string;
  address: string;
  date: string;
}

declare interface IArea {
  id: string;
  title: string;
  shape: string;
  fillColor: string;
  strokeColor: string;
  coords: number[];
}
