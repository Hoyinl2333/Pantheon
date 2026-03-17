import { NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/api-vault/key-store";

export function GET() {
  return NextResponse.json({ providers: PROVIDERS });
}
