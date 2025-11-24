import instance from "../../axios-config";
import axios from "axios";

export const GetToken = () => {
  return instance.post("/authentication", {
    type: "api-app",
    credentials: {
      pb_api_key: process.env.PB_API_KEY,
    },
  });
};

export const GetProjects = (params: object) => {
  return instance.get("/projects", {
    params,
  });
};

export const SendCallBack = (phone: number, name: string, project: string) => {
  // Use the internal API route instead of calling Bitrix directly
  return axios.post("/api/send-callback", {
    phone,
    name,
    project,
  });
};
