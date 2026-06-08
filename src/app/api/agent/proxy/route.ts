import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.DENNISSE_AGENT_URL || "http://173.249.59.135:8091";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || "health";
  try {
    const res = await fetch(`${AGENT_URL}/${path}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || "";
  try {
    const body = await req.json();
    const res = await fetch(`${AGENT_URL}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
