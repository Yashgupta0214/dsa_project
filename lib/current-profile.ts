import { auth } from "@clerk/nextjs";
import { cache } from "react";

import { db } from "@/lib/db";

export const currentProfile = cache(async () => {
  const { userId } = auth();

  if (!userId) return null;

  const profile = await db.profile.findUnique({
    where: { userId }
  });

  return profile;
});
