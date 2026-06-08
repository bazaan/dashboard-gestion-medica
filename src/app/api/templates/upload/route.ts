import { NextRequest, NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v21.0";

async function getMetaToken(): Promise<string> {
  const res = await fetch("https://chats.alef.company/api/v1/accounts/4/inboxes", {
    headers: { api_access_token: "xBsW4FE3FCZdZbgXgdjrHfUA" },
  });
  const data = await res.json();
  const inboxes = data?.payload ?? data;
  const inbox = (inboxes as any[]).find((i: any) => i.id === 80);
  if (!inbox) throw new Error("Inbox 80 not found");
  return inbox.provider_config?.api_key;
}

async function getAppId(token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/app?access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

/**
 * POST /api/templates/upload
 * Receives a file, uploads it to Meta's Resumable Upload API, returns the handle.
 * Body: FormData with "file" field
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const token = await getMetaToken();
    const appId = await getAppId(token);

    // Step 1: Create upload session
    const sessionRes = await fetch(
      `${GRAPH}/${appId}/uploads?file_length=${file.size}&file_type=${encodeURIComponent(file.type)}&access_token=${token}`,
      { method: "POST" }
    );
    const sessionData = await sessionRes.json();
    if (sessionData.error) {
      return NextResponse.json({ error: `Upload session: ${sessionData.error.message}` }, { status: 400 });
    }
    const uploadSessionId = sessionData.id; // "upload:..."

    // Step 2: Upload file binary
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(`${GRAPH}/${uploadSessionId}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${token}`,
        file_offset: "0",
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    });
    const uploadData = await uploadRes.json();
    if (uploadData.error) {
      return NextResponse.json({ error: `Upload file: ${uploadData.error.message}` }, { status: 400 });
    }

    // uploadData.h is the handle to use in template creation
    return NextResponse.json({ handle: uploadData.h });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
