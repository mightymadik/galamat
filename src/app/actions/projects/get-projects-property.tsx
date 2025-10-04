"use server";

import instance from "../../../../axios-config";

export async function ActionGetProjectsProperty(type: string, params: object) {
  try {
    const res = await instance.get(type, { params });
    return res.data;
  } catch (error: any) {
    return error;
  }
}
