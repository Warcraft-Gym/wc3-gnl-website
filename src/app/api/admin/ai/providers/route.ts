import { NextResponse } from "next/server";
import { listAvailableProviders } from "@/lib/admin/ai/provider";

export async function GET() {
  return NextResponse.json({ providers: listAvailableProviders() });
}
