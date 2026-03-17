import { NextRequest, NextResponse } from "next/server";
import { getKey, getDecryptedKey, addSnapshot, cleanOldSnapshots } from "@/lib/api-vault/key-store";
import { checkProvider } from "@/lib/api-vault/provider-checker";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const keyRecord = getKey(id);
    if (!keyRecord) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const apiKey = getDecryptedKey(id);
    if (!apiKey) {
      return NextResponse.json({ error: "Failed to decrypt key" }, { status: 500 });
    }

    const result = await checkProvider(
      keyRecord.provider,
      apiKey,
      keyRecord.base_url || undefined,
    );

    // Record usage snapshot for historical tracking
    if (result.valid) {
      const balance = result.balance?.amount ?? null;
      const used = result.usage?.used ?? null;
      const currency = result.balance?.currency ?? "USD";
      addSnapshot(id, balance, used, currency);
      // Periodically clean old snapshots (keep 90 days)
      cleanOldSnapshots(90);
    }

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
