"use server";

import prisma from "@/lib/prisma";

interface RequestData {
  phone: string;
}

export async function POST(request: Request) {
  try {
    const requestData: RequestData = await request.json();

    // Ստուգել, արդյոք phone պարամետրը առկա է
    if (!requestData.phone) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Phone parameter is required",
          error: "Missing required parameter: phone",
        }),
        {
          status: 403, // Bad Request
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const existingRecord = await prisma.lottery.findFirst({
      where: {
        phone: requestData.phone,
      },
    });

    if (!existingRecord) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Record with provided phone number not found",
          error: "Record not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const updateProbabilities = await prisma.lottery.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        status: "verified",
        winner: 0,
      },
    });

    return new Response(
      JSON.stringify({
        status: "ok",
        data: updateProbabilities,
        error: "",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("API Error:", error);

    return new Response(
      JSON.stringify({
        status: "error",
        data: [],
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
