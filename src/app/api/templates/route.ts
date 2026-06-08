import { NextRequest, NextResponse } from "next/server";

const WABA_ID = "3598875606929262";
const META_API = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`;

// Token stored in Chatwoot inbox 80, account 4 provider_config.api_key
// In production this should come from env, but for now we fetch it from Chatwoot
async function getMetaToken(): Promise<string> {
  const CHATWOOT_TOKEN = "xBsW4FE3FCZdZbgXgdjrHfUA";
  const res = await fetch("https://chats.alef.company/api/v1/accounts/4/inboxes", {
    headers: { api_access_token: CHATWOOT_TOKEN },
  });
  const data = await res.json();
  const inboxes = data?.payload ?? data;
  const inbox = (inboxes as any[]).find((i: any) => i.id === 80);
  if (!inbox) throw new Error("Inbox 80 not found");
  return inbox.provider_config?.api_key;
}

// GET — list all templates from Meta
export async function GET() {
  try {
    const token = await getMetaToken();
    const res = await fetch(`${META_API}?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }
    return NextResponse.json({ templates: data.data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create a new template in Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, language, category, body_text, buttons, header } = body;

    if (!name || !body_text) {
      return NextResponse.json({ error: "name and body_text are required" }, { status: 400 });
    }

    const components: any[] = [];

    // Header component (TEXT, IMAGE, VIDEO, DOCUMENT)
    if (header && header.format && header.format !== "NONE") {
      const headerComp: any = { type: "HEADER", format: header.format };
      if (header.format === "TEXT") {
        headerComp.text = header.text || "";
      } else if (header.handle) {
        // IMAGE, VIDEO, DOCUMENT — need a handle from upload
        headerComp.example = { header_handle: [header.handle] };
      }
      components.push(headerComp);
    }

    // Meta API requires positional variables {{1}}, {{2}}, not named ones
    // Convert {{nombre}} → {{1}}, {{tratamiento}} → {{2}}, etc.
    const EXAMPLE_VALUES: Record<string, string> = {
      nombre: "Maria Garcia",
      tratamiento: "Rejuran",
    };

    const seen: string[] = [];
    const bodyForMeta = body_text.replace(/\{\{(\w+)\}\}/g, (_: string, varName: string) => {
      let idx = seen.indexOf(varName);
      if (idx === -1) { seen.push(varName); idx = seen.length - 1; }
      return `{{${idx + 1}}}`;
    });

    const bodyComp: any = {
      type: "BODY",
      text: bodyForMeta,
    };

    if (seen.length > 0) {
      bodyComp.example = {
        body_text: [seen.map(v => EXAMPLE_VALUES[v] || `ejemplo_${v}`)],
      };
    }

    components.push(bodyComp);

    if (buttons && buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: buttons.map((b: any) => {
          if (b.type === "PHONE_NUMBER") {
            return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number || b.phone };
          }
          return { type: "QUICK_REPLY", text: b.text };
        }),
      });
    }

    const payload = {
      name,
      language: language || "es_PE",
      category: category || "MARKETING",
      components,
    };

    const token = await getMetaToken();
    const res = await fetch(META_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("[META] Payload sent:", JSON.stringify(payload, null, 2));
    console.log("[META] Response:", JSON.stringify(data, null, 2));
    if (data.error) {
      return NextResponse.json({ error: data.error.message, details: data.error, payload_sent: payload }, { status: 400 });
    }

    return NextResponse.json({ success: true, template: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — delete a template by name
export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const token = await getMetaToken();
    const res = await fetch(`${META_API}?name=${name}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
