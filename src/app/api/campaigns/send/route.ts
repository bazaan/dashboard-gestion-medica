import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHATWOOT_BASE = "https://chats.alef.company";
const CHATWOOT_TOKEN = "xBsW4FE3FCZdZbgXgdjrHfUA";
const CHATWOOT_ACCOUNT = 4;
const CHATWOOT_INBOX = 65;

// Normalize phone to E.164 Peru format
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `+51${digits}`;
  if (digits.length === 11 && digits.startsWith("51")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("051")) return `+${digits.slice(1)}`;
  return null;
}

// Search or create contact in Chatwoot
async function getOrCreateContact(phone: string, name: string): Promise<number | null> {
  // Search by phone
  const searchRes = await fetch(
    `${CHATWOOT_BASE}/api/v1/accounts/${CHATWOOT_ACCOUNT}/contacts/search?q=${encodeURIComponent(phone)}`,
    { headers: { api_access_token: CHATWOOT_TOKEN } }
  );
  const searchData = await searchRes.json();
  const contacts = searchData.payload ?? [];
  if (contacts.length > 0) return contacts[0].id;

  // Create contact
  const createRes = await fetch(
    `${CHATWOOT_BASE}/api/v1/accounts/${CHATWOOT_ACCOUNT}/contacts`,
    {
      method: "POST",
      headers: {
        api_access_token: CHATWOOT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inbox_id: CHATWOOT_INBOX,
        name,
        phone_number: phone,
      }),
    }
  );
  const createData = await createRes.json();
  return createData.payload?.contact?.id ?? null;
}

// Send template message via Chatwoot
async function sendTemplate(
  contactId: number,
  templateName: string,
  language: string,
  params: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `${CHATWOOT_BASE}/api/v1/accounts/${CHATWOOT_ACCOUNT}/conversations`,
    {
      method: "POST",
      headers: {
        api_access_token: CHATWOOT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inbox_id: CHATWOOT_INBOX,
        contact_id: contactId,
        message: {
          content: `Campaña: ${templateName}`,
          template_params: {
            name: templateName,
            category: "MARKETING",
            language,
            processed_params: params,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err.slice(0, 200) };
  }
  return { ok: true };
}

// POST — send campaign to list of patients
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      template_name,
      template_language = "es_PE",
      patient_ids,
      params_map, // { patientId: { nombre: "...", tratamiento: "..." } }
    } = body;

    if (!template_name || !patient_ids?.length) {
      return NextResponse.json({ error: "template_name and patient_ids required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch patients
    const { data: patients, error } = await (supabase as any)
      .from("pacientes")
      .select("id, nombre, apellido, telefono")
      .in("id", patient_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { id: string; nombre: string; status: string; error?: string }[] = [];
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const patient of patients) {
      const phone = normalizePhone(patient.telefono);
      if (!phone) {
        results.push({ id: patient.id, nombre: patient.nombre, status: "skipped", error: "Sin telefono valido" });
        continue;
      }

      const fullName = [patient.nombre, patient.apellido].filter(Boolean).join(" ");
      const contactId = await getOrCreateContact(phone, fullName);
      if (!contactId) {
        results.push({ id: patient.id, nombre: patient.nombre, status: "failed", error: "No se pudo crear contacto" });
        continue;
      }

      // Build params — use patient-specific params if provided, otherwise defaults
      const patientParams = params_map?.[patient.id] || {
        nombre: patient.nombre,
        tratamiento: body.default_tratamiento || "tu tratamiento",
      };

      const { ok, error: sendErr } = await sendTemplate(contactId, template_name, template_language, patientParams);
      results.push({
        id: patient.id,
        nombre: patient.nombre,
        status: ok ? "sent" : "failed",
        error: sendErr,
      });

      // Log to audit
      await (supabase as any).from("audit_log").insert({
        accion: "campaña_wa",
        tabla: "pacientes",
        registro_id: patient.id,
        descripcion: `Campaña ${template_name} → ${fullName} (${phone}): ${ok ? "enviado" : "fallido"}`,
        usuario_id: null,
      });

      // Delay between sends to avoid rate limiting
      await delay(800);
    }

    const sent = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;
    const skipped = results.filter(r => r.status === "skipped").length;

    return NextResponse.json({ sent, failed, skipped, total: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
