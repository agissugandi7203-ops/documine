import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  supabaseSignOut,
} from "@/lib/server/supabase-auth";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;

  if (accessToken) {
    await supabaseSignOut(accessToken).catch(() => {});
  }

  const response = NextResponse.json({ signedOut: true });
  clearAuthCookies(response, req);
  return response;
}
