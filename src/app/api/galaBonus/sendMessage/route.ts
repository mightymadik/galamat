"use server";

import axios from "axios";

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return Response.json(
        { status: "error", message: "phone and code are required" },
        { status: 400 }
      );
    }

    const body = {
      to: phone,
      content: {
        whatsappContent: {
          contentType: "AUTHENTICATION",
          name: "authorization",
          code,
        },
      },
    };

    const response = await axios.post(
      "https://kazinfoteh.org/wasender/sendwamsg",
      body,
      {
        headers: {
          "X-API-KEY": process.env.WASENDER_API_KEY!,
        },
      }
    );

    return Response.json({
      status: "ok",
      data: response.data,
    });
  } catch (err: any) {
    console.error("WASENDER ERROR:", err?.response?.data || err);

    return Response.json(
      {
        status: "error",
        error: err?.response?.data || err.message,
      },
      { status: 500 }
    );
  }
}
