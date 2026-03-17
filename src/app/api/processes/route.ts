import { NextResponse } from "next/server";
import { getClaudeProcesses } from "@/lib/process-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const processes = await getClaudeProcesses();
  return NextResponse.json({ processes, count: processes.length });
}
