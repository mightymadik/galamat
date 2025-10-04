import instance from "../../axios-config";
import axios from "axios";

export const GetToken = () => {
  return instance.post("/authentication", {
    type: "api-app",
    credentials: {
      pb_api_key: "app-6839b0cd3f5f0",
    },
  });
};

export const GetProjects = (params: object) => {
  return instance.get("/projects", {
    params,
  });
};

export const SendCallBack = (phone: number, name: string, project: string) => {
  return axios.get(`https://crm.galamat.kz/rest/25451/see0f8hgdnl3zme4/crm.lead.add.json?
FIELDS[PHONE][0][VALUE]=${phone}&FIELDS[PHONE][0][VALUE_TYPE]=MOBILE&FIELDS[NAME]=${name}&UF_CRM_1718281646=${project}&SOURCE_ID=WEB`);
};
