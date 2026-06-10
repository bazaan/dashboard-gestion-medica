import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHATWOOT_BASE = process.env.CHATWOOT_BASE_URL || "https://chats.alef.company";
const CHATWOOT_TOKEN = process.env.CHATWOOT_API_TOKEN || "xBsW4FE3FCZdZbgXgdjrHfUA";
const CHATWOOT_ACCOUNT = Number(process.env.CHATWOOT_ACCOUNT_ID || "4");
const CHATWOOT_INBOX = Number(process.env.CHATWOOT_WA_INBOX_ID || "80");

// Costo por mensaje de template MARKETING en Peru (USD)
const COSTO_POR_MENSAJE_USD = 0.07;

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

// Two-step: crear conversacion + enviar template como mensaje
async function sendTemplateMessage(
  contactId: number,
  templateName: string,
  language: string,
  params: Record<string, string>,
  content: string,
): Promise<void> {
  // Step 1: crear o encontrar conversacion
  const convData = await chatwootPost("/conversations", {
    inbox_id: CHATWOOT_INBOX,
    contact_id: contactId,
  });
  const convId = convData.payload?.id ?? convData.id;
  if (!convId) throw new Error("No se pudo crear conversacion");

  // Step 2: enviar template como mensaje
  // Templates usan params POSITIONAL ({{1}}, {{2}}) no NAMED
  await chatwootPost(`/conversations/${convId}/messages`, {
    message_type: "outgoing",
    content,
    template_params: {
      name: templateName,
      category: "MARKETING",
      language,
      processed_params: {
        "1": params.nombre || params["1"] || "",
        "2": params.tratamiento || params["2"] || "",
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      template_name,
      template_language = "es_PE",
      patient_ids,
      default_tratamiento,
      campaign_name,
    } = body;

    if (!template_name || !patient_ids?.length) {
      return NextResponse.json({ error: "template_name and patient_ids required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch patients
    const { data: patients, error } = await (supabase as any)
      .from("pacientes")
      .select("id, nombres, apellidos, telefono")
      .in("id", patient_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Crear registro de campana
    const { data: campana } = await (supabase as any)
      .from("campanas_wa")
      .insert({
        nombre: campaign_name || `Campaña ${template_name} — ${new Date().toLocaleDateString("es-PE")}`,
        template_name,
        template_lang: template_language,
        total: patients.length,
      })
      .select("id")
      .single();

    const campanaId = campana?.id;

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

        await sendTemplateMessage(contactId, template_name, template_language, params, content);

        results.push({ id: patient.id, nombre: fullName, status: "sent" });
        enviados++;
        if (campanaId) {
          await (supabase as any).from("campana_destinatarios").insert({
            campana_id: campanaId,
            paciente_id: patient.id,
            nombre: fullName,
            telefono: phone,
            estado: "enviado",
          });
        }
      } catch (err: any) {
        results.push({ id: patient.id, nombre: fullName, status: "failed", error: err.message });
        fallidos++;
        if (campanaId) {
          await (supabase as any).from("campana_destinatarios").insert({
            campana_id: campanaId,
            paciente_id: patient.id,
            nombre: fullName,
            telefono: phone,
            estado: "fallido",
            error_msg: (err.message || "").slice(0, 500),
          });
        }
      }

      // Actualizar totales cada 5 envios (por si timeout de serverless)
      if (campanaId && (enviados + fallidos + omitidos) % 5 === 0) {
        await (supabase as any)
          .from("campanas_wa")
          .update({
            enviados,
            fallidos,
            omitidos,
            costo_estimado: +(enviados * COSTO_POR_MENSAJE_USD).toFixed(4),
          })
          .eq("id", campanaId);
      }

      // Delay entre envios para evitar rate limiting de Meta
      await new Promise(r => setTimeout(r, 800));
    }

    // Actualizar totales finales
    if (campanaId) {
      await (supabase as any)
        .from("campanas_wa")
        .update({
          enviados,
          fallidos,
          omitidos,
          costo_estimado: +(enviados * COSTO_POR_MENSAJE_USD).toFixed(4),
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
