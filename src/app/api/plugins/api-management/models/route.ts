import { NextRequest, NextResponse } from "next/server";
import { getKey, getDecryptedKey } from "@/lib/api-vault/key-store";
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
      return NextResponse.json(
        { error: "Failed to decrypt key" },
        { status: 500 }
      );
    }

    const result = await checkProvider(
      keyRecord.provider,
      apiKey,
      keyRecord.base_url || undefined
    );

    return NextResponse.json({
      models: result.models,
      valid: result.valid,
      error: result.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
