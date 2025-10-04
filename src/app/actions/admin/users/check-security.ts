"use server";

import moment from "moment/moment";

export async function CheckSecurity(pass: string | null) {
  const day = moment().format("DDMMYYYY");

  if (pass) {
    if (pass === `${day}_g`) {
      return {
        status: true,
      };
    } else {
      return {
        status: false,
      };
    }
  } else {
    return {
      status: false,
    };
  }
}
