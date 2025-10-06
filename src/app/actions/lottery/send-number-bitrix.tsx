"use server";

import axios from "axios";

import prisma from "@/lib/prisma";

// In-memory store to track recent requests
const requestTracker = new Map<number, number>();

export async function ActionSendNumberBitrix(id: number) {
  try {
    // Prevent duplicate requests within 10 seconds
    const now = Date.now();
    const lastRequestTime = requestTracker.get(id);

    // Check if we've processed this request recently
    if (lastRequestTime && now - lastRequestTime < 10000) {
      console.log(`Duplicate request blocked for lottery ID: ${id}`);
      return {
        status: "duplicate",
        message: "Request already processed recently",
        promocode: "",
      };
    }

    // Mark this request as processed
    requestTracker.set(id, now);

    // Clean up old entries (older than 1 minute) to prevent memory leaks
    for (const [key, timestamp] of requestTracker.entries()) {
      if (now - timestamp > 60000) {
        requestTracker.delete(key);
      }
    }

    const updateProbabilities = await prisma.lottery.findUnique({
      where: {
        id,
      },
    });

    const getAxios = await axios.get(
      "https://crm.galamat.kz/services/webhooks/gen_link/index.php",
      {
        params: {
          name: updateProbabilities?.name,
          phone: updateProbabilities?.phone,
          balance: updateProbabilities?.winner,
        },
      },
    );

    return getAxios.data;
  } catch (error: any) {
    console.log(error);
    return error;
  }
}
