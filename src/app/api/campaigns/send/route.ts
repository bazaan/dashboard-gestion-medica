import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHATWOOT_BASE = process.env.CHATWOOT_BASE_URL || "https://chats.alef.company";
const CHATWOOT_TOKEN = process.env.CHATWOOT_API_TOKEN || "xBsW4FE3FCZdZbgXgdjrHfUA";
const CHATWOOT_ACCOUNT = Number(process.env.CHATWOOT_ACCOUNT_ID || "4");
const CHATWOOT_INBOX = Number(process.env.CHATWOOT_WA_INBOX_ID || "80");
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID || "1125723850624383";

// Costo por mensaje de template MARKETING en Peru (USD)
const COSTO_POR_MENSAJE_USD = 0.07;

// Templates con header image: se envian via Meta API directa
// porque Chatwoot no soporta processed_params con image headers
// Las imagenes deben estar en URLs publicas permanentes (no WhatsApp CDN que expira)
const TEMPLATE_HEADER_IMAGES: Record<string, string> = {
  recordatorio_rejuran: "http://173.249.59.135:8092/static/rejuran_header.jpg",
  recordatorio_neauvia_hd: "http://173.249.59.135:8092/static/neauvia_header.jpg",
};
const TEMPLATES_WITH_IMAGE_HEADER = new Set(Object.keys(TEMPLATE_HEADER_IMAGES));

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `+51${digits}`;
  if (digits.length === 11 && digits.startsWith("51")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("051")) return `+${digits.slice(1)}`;
  return null;
}

async function chatwootGet(path: string) {
  const res = await fetch(`${CHATWOOT_BASE}/api/v1/accounts/${CHATWOOT_ACCOUNT}${path}`, {
    headers: { api_access_token: CHATWOOT_TOKEN },
  });
  return res.json();
}

async function chatwootPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CHATWOOT_BASE}/api/v1/accounts/${CHATWOOT_ACCOUNT}${path}`, {
    method: "POST",
    headers: { api_access_token: CHATWOOT_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwoot ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getOrCreateContact(phone: string, name: string): Promise<number> {
  const data = await chatwootGet(`/contacts/search?q=${encodeURIComponent(phone)}&include_contacts=true`);
  const contacts = data.payload?.contacts ?? data.payload ?? [];
  if (contacts.length > 0) return contacts[0].id;

  const createData = await chatwootPost("/contacts", { phone_number: phone, name });
  const payload = createData.payload ?? createData;
  const contact = payload.contact ?? payload;
  if (contact?.id) return contact.id;
  throw new Error("No se pudo crear contacto");
}

// Cache del Meta API token (se obtiene del inbox de Chatwoot)
let _metaToken = "";
async function getMetaToken(): Promise<string> {
  if (_metaToken) return _metaToken;
  const data = await chatwootGet(`/inboxes/${CHATWOOT_INBOX}`);
  const inbox = data.payload ?? data;
  _metaToken = inbox.provider_config?.api_key || "";
  return _metaToken;
}

// Cache de templates con sus headers (para saber qué imagen usar)
let _templateHeaders: Record<string, string> | null = null;
async function getTemplateHeaderImage(templateName: string): Promise<string | null> {
  if (!_templateHeaders) {
    _templateHeaders = {};
    const data = await chatwootGet(`/inboxes/${CHATWOOT_INBOX}`);
    const inbox = data.payload ?? data;
    for (const t of inbox.message_templates || []) {
      for (const c of t.components || []) {
        if (c.type === "HEADER" && c.format === "IMAGE" && c.example?.header_handle?.[0]) {
          _templateHeaders[t.name] = c.example.header_handle[0];
        }
      }
    }
  }
  return _templateHeaders[templateName] || null;
}

// Envio via Meta API directa (para templates con image header)
async function sendViaMetaApi(
  phone: string,
  templateName: string,
  language: string,
  params: Record<string, string>,
  headerImageUrl: string,
): Promise<void> {
  const token = await getMetaToken();
  const res = await fetch(`https://graph.facebook.com/v21.0/${META_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace("+", ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: "header",
            parameters: [{ type: "image", image: { link: headerImageUrl } }],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: params.nombre || params["1"] || "" },
              { type: "text", text: params.tratamiento || params["2"] || "" },
            ],
          },
        ],
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API ${res.status}: ${text.slice(0, 300)}`);
  }
}

// Two-step Chatwoot: crear conversacion + enviar template como mensaje
async function sendViaChatwoot(
  contactId: number,
  templateName: string,
  language: string,
  params: Record<string, string>,
  content: string,
): Promise<void> {
  const convData = await chatwootPost("/conversations", {
    inbox_id: CHATWOOT_INBOX,
    contact_id: contactId,
  });
  const convId = convData.payload?.id ?? convData.id;
  if (!convId) throw new Error("No se pudo crear conversacion");

  await chatwootPost(`/conversations/${convId}/messages`, {
    message_type: "outgoing",
    content,
    template_params: {
      name: templateName,
      category: "MARKETING",
      language,
      processed_params: params,
    },
  });
}

// Punto de entrada: elige Meta API directa (templates con imagen) o Chatwoot (sin imagen)
async function sendTemplateMessage(
  contactId: number,
  phone: string,
  templateName: string,
  language: string,
  params: Record<string, string>,
  content: string,
): Promise<void> {
  if (TEMPLATES_WITH_IMAGE_HEADER.has(templateName)) {
    const headerImg = TEMPLATE_HEADER_IMAGES[templateName];
    await sendViaMetaApi(phone, templateName, language, params, headerImg);
    return;
  }
  await sendViaChatwoot(contactId, templateName, language, params, content);
}

// POST /api/campaigns/send — envía un batch pequeño (max 5 pacientes)
// El frontend orquesta múltiples requests para campañas grandes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      template_name,
      template_language = "es_PE",
      patient_ids,
      default_tratamiento,
      campaign_name,
      campana_id: existingCampanaId,
    } = body;

    if (!template_name || !patient_ids?.length) {
      return NextResponse.json({ error: "template_name and patient_ids required" }, { status: 400 });
    }

    // Limitar batch a 5 pacientes por request (Netlify timeout safe)
    const batchIds = patient_ids.slice(0, 5);

    const supabase = createAdminClient();

    // Fetch patients del batch
    const { data: patients, error } = await (supabase as any)
      .from("pacientes")
      .select("id, nombres, apellidos, telefono")
      .in("id", batchIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Crear campana solo si no existe (primer batch)
    let campanaId = existingCampanaId;
    if (!campanaId) {
      const { data: campana } = await (supabase as any)
        .from("campanas_wa")
        .insert({
          nombre: campaign_name || `Campaña ${template_name} — ${new Date().toLocaleDateString("es-PE")}`,
          template_name,
          template_lang: template_language,
          total: patient_ids.length,
        })
        .select("id")
        .single();
      campanaId = campana?.id;
    }

    const results: { id: string; nombre: string; status: string; error?: string }[] = [];
    let enviados = 0;
    let fallidos = 0;
    let omitidos = 0;

    for (const patient of patients) {
      const fullName = [patient.nombres, patient.apellidos].filter(Boolean).join(" ");
      const phone = normalizePhone(patient.telefono);

      if (!phone) {
        results.push({ id: patient.id, nombre: fullName, status: "skipped", error: "Sin telefono valido" });
        omitidos++;
        if (campanaId) {
          await (supabase as any).from("campana_destinatarios").insert({
            campana_id: campanaId,
            paciente_id: patient.id,
            nombre: fullName,
            telefono: patient.telefono,
            estado: "omitido",
            error_msg: "Sin telefono valido",
          });
        }
        continue;
      }

      try {
        const contactId = await getOrCreateContact(phone, fullName);
        const params = {
          nombre: patient.nombres || fullName,
          tratamiento: default_tratamiento || "tu tratamiento",
        };
        const content = `Hola ${params.nombre}, te escribimos de la Clinica Dra. Dennisse Arroyo sobre ${params.tratamiento}.`;

        const canal = TEMPLATES_WITH_IMAGE_HEADER.has(template_name) ? "meta_api" : "chatwoot";
        await sendTemplateMessage(contactId, phone, template_name, template_language, params, content);

        const logEntry = {
          campana_id: campanaId,
          paciente_id: patient.id,
          nombre: fullName,
          telefono: phone,
          estado: "enviado",
          error_msg: `[${canal}] template=${template_name} params=${JSON.stringify(params)}`,
        };
        results.push({ id: patient.id, nombre: fullName, status: "sent" });
        enviados++;
        if (campanaId) {
          await (supabase as any).from("campana_destinatarios").insert(logEntry);
        }

        console.log(`[CAMPAIGN] SENT ${canal} | ${fullName} | ${phone} | ${template_name}`);
      } catch (err: any) {
        const canal = TEMPLATES_WITH_IMAGE_HEADER.has(template_name) ? "meta_api" : "chatwoot";
        const errorDetail = `[${canal}] ${err.message}`;
        results.push({ id: patient.id, nombre: fullName, status: "failed", error: errorDetail });
        fallidos++;
        if (campanaId) {
          await (supabase as any).from("campana_destinatarios").insert({
            campana_id: campanaId,
            paciente_id: patient.id,
            nombre: fullName,
            telefono: phone,
            estado: "fallido",
            error_msg: errorDetail.slice(0, 500),
          });
        }

        console.error(`[CAMPAIGN] FAIL ${canal} | ${fullName} | ${phone} | ${template_name} | ${err.message}`);
      }

      // Delay entre envios para evitar rate limiting de Meta
      await new Promise(r => setTimeout(r, 800));
    }

    // Actualizar totales de la campana (acumulativo)
    if (campanaId) {
      // Leer totales actuales y sumar este batch
      const { data: current } = await (supabase as any)
        .from("campanas_wa")
        .select("enviados, fallidos, omitidos")
        .eq("id", campanaId)
        .single();

      const totalEnviados = (current?.enviados || 0) + enviados;
      const totalFallidos = (current?.fallidos || 0) + fallidos;
      const totalOmitidos = (current?.omitidos || 0) + omitidos;

      await (supabase as any)
        .from("campanas_wa")
        .update({
          enviados: totalEnviados,
          fallidos: totalFallidos,
          omitidos: totalOmitidos,
          costo_estimado: +(totalEnviados * COSTO_POR_MENSAJE_USD).toFixed(4),
        })
        .eq("id", campanaId);
    }

    return NextResponse.json({
      sent: enviados,
      failed: fallidos,
      skipped: omitidos,
      total: results.length,
      costo_estimado_usd: +(enviados * COSTO_POR_MENSAJE_USD).toFixed(4),
      campana_id: campanaId,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
