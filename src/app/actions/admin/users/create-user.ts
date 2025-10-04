"use server";
import bcrypt from "bcrypt";

import prisma from "@/lib/prisma";

export async function CreateUser(
  name: string,
  login: string,
  password: string,
  status: "super-admin" | "def-user",
) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.users.create({
      data: {
        name,
        login,
        password: hashedPassword,
        status,
      },
    });

    return {
      status: 1,
      data: result,
    };
  } catch (error) {
    return {
      status: 0,
      data: [],
      error,
    };
  }
}
