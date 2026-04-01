# Dashboard Clínica Dra. Dennisse Arroyo — Bitácora del Proyecto

> Última actualización: 31 de marzo de 2026

---

## ¿Qué es esto?

Panel de gestión médica a medida para una clínica de dermatología estética de alto nivel en Lima. Incluye gestión de pacientes, historias clínicas electrónicas, seguimiento de renovaciones de tratamientos y un sistema automático de recordatorios por WhatsApp.

**Stack principal:** Next.js 16 (App Router) + Supabase + Python (Railway) + Chatwoot + Meta WhatsApp Business API

---

## Estado actual del sistema (31 de marzo 2026)

### ✅ Completamente funcional

- **Base de datos Supabase** — ambos schemas ejecutados (`schema.sql` + `migration_v2.sql`). Triggers automáticos funcionando: al registrar un procedimiento se crean seguimientos y recordatorios automáticamente.
- **Dashboard** — estadísticas en tiempo real, greeting dinámico, urgentes clicables, badge de urgentes en sidebar
- **Módulo de Pacientes** — lista, búsqueda, detalle, historia clínica, fotos antes/después, `NuevaConsultaDrawer` con catálogo de procedimientos
- **Módulo de Renovaciones** — tab Seguimientos + tab Recordatorios WA con log completo
- **Módulo de Procedimientos** — catálogo de 52 tratamientos
- **Módulo de Plantillas WA** — preview interactivo con variables editables
- **Servicio Python (reminders-service)** — flujo end-to-end testeado: 3/3 mensajes enviados correctamente en prueba local
- **Mobile** — responsive completo con bottom nav, top bar fija, badge de urgentes, tap feedback

### ⚠️ Funciona pero con limitación

- **Templates WhatsApp MARKETING** (`0d`, `7d`, `30d`) — aprobados en Meta, pero el número `+51 936 196 001` está en TIER_250 + NOT_VERIFIED → Meta bloquea silenciosamente la entrega. Los mensajes llegan a Chatwoot con `status: delivered` pero nunca llegan al WhatsApp del paciente.
  - **Fix A**: Verificar el número con OTP (hit cooldown 1h, intentar nuevamente)
  - **Fix B**: Re-someter los 3 templates como categoría UTILITY

### ⏳ Templates UTILITY confirmados funcionales
- `citas_healup` — UTILITY, entrega inmediata sin restricción de tier. Testeado y confirmado.

### 🔲 Pendiente de deploy
- **Railway** — servicio Python listo, variables de entorno en `reminders-service/.env`, falta copiarlas al proyecto Railway y hacer deploy
- **Netlify** — dashboard listo para deploy, falta push a main

---

## Lo que ya está hecho (detallado)

### Dashboard y autenticación
- Login con Supabase Auth, redirect automático al dashboard
- Dashboard con estadísticas dinámicas desde `renovaciones_vista` y `tratamientos_catalogo`
- Greeting dinámico según hora (buenos días/tardes/noches) con nombre real del usuario
- Sidebar con navegación por roles (`admin`, `doctor`, `recepcion`)
- Sidebar responsive: top bar + bottom nav en móvil, sidebar fijo en desktop
- **Badge de urgentes** en el ítem Renovaciones del sidebar (bottom nav y desktop) — muestra conteo de vencidos + por vencer ≤7 días

### Módulo de Pacientes (`/pacientes`)
- Lista con búsqueda full-text y paginación
- Vista card en móvil, vista tabla en desktop
- `NuevoPacienteDrawer` con validación Zod
- Vista detalle (`/pacientes/[id]`):
  - Info personal y médica completa
  - `NuevaConsultaDrawer` — registra evoluciones clínicas con selección de procedimientos del catálogo
  - Historia clínica con tabs (Fotos, Historia Clínica, Información, Citas)
  - Comparador antes/después con slider interactivo
  - Upload de fotos al bucket `fotos-pacientes` (Supabase Storage)
  - Documentos adjuntos al bucket `documentos-pacientes`

### Módulo de Renovaciones (`/renovaciones`)
- **Tab "Seguimientos"**: tabla de todos los seguimientos con estado (Vencido / Por vencer / Vigente / Permanente), filtros por estado y categoría, búsqueda de paciente/tratamiento, botón WA directo (links con código +51 correctamente formateados)
- **Tab "Recordatorios WA"**: log completo de `recordatorios_log` con stats, filtros por estado (pendiente/enviado/fallido), visualización de `error_msg`

### Servicio de Recordatorios Python (`reminders-service/`)
- Estructura: `main.py` → `sender.py` → `db.py` + `templates.py` + `chatwoot.py`
- `config.py` con 3 variables separadas de idioma por template (`WA_TEMPLATE_30D_LANGUAGE`, etc.)
- Cron APScheduler diario a las 9:00 AM Lima (configurable vía env)
- Retry automático con backoff exponencial (tenacity) en errores de red
- Modo `DRY_RUN` para pruebas sin enviar mensajes reales
- `chatwoot.py` normaliza teléfonos a E.164 con `phonenumbers`, crea contacto si no existe, crea conversación outbound
- Botón Quick Reply "¡Agendemos! 📅" en los templates (estático, **no** incluir en `template_params` — causa error `#132000`)

### Schema de base de datos
Ambos scripts ejecutados en producción (Supabase `wnbamzjieowfqcowppxc`):
- `schema.sql` — tablas base
- `migration_v2.sql` — sistema completo v2 con catálogo de 52 procedimientos, tablas de seguimientos/recordatorios, vista `renovaciones_vista` y triggers automáticos
- `ALTER TABLE recordatorios_log ADD COLUMN IF NOT EXISTS error_msg TEXT` — ejecutado manualmente

---

## Flujo automático de renovaciones (de punta a punta)

1. **Doctor registra consulta** → `NuevaConsultaDrawer` inserta en `evoluciones_clinicas`
2. **Se añaden procedimientos** → insert en `procedimientos_consulta`
3. **Trigger SQL automático** → calcula fecha de vencimiento según `duracion_vigencia_meses` del tratamiento → inserta en `seguimientos_renovacion`
4. **Otro trigger SQL** → crea 3 filas en `recordatorios_log` (`30_dias`, `7_dias`, `vencimiento`) con `estado = 'pendiente'`
5. **Cron diario 9 AM (Railway)** → lee pendientes cuya `fecha_programada <= hoy`
6. **Servicio envía vía Chatwoot** → Chatwoot llama a Meta WhatsApp Cloud API con el template
7. **Actualiza `recordatorios_log`**: `estado = 'enviado'` + `fecha_enviada`, o `estado = 'fallido'` + `error_msg`
8. **Dashboard `/renovaciones`** → tab "Recordatorios WA" muestra el log

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (Next.js / Netlify)                 │
│  /pacientes   /renovaciones   /plantillas   /procedimientos      │
└────────────────────────────┬────────────────────────────────────┘
                             │ read/write
                             ▼
                    ┌────────────────┐
                    │   SUPABASE     │
                    │  PostgreSQL    │  wnbamzjieowfqcowppxc
                    │  + Storage     │
                    └───────┬────────┘
                            │ recordatorios_log (pendiente → enviado)
                            ▼
              ┌─────────────────────────────┐
              │  REMINDERS SERVICE (Railway) │
              │  Python · cron 9:00 AM Lima  │
              │  db.py → templates.py        │
              │  → chatwoot.py               │
              └──────────────┬──────────────┘
                             │ POST /conversations (Chatwoot API)
                             ▼
                   ┌──────────────────┐
                   │    CHATWOOT      │
                   │  chats.alef.company │
                   │  Account 1 / Inbox 17 │
                   └────────┬─────────┘
                            │ Meta WhatsApp Cloud API
                            │ phone_number_id: 907213675807970
                            ▼
                   ┌──────────────────┐
                   │    PACIENTE      │
                   │  WhatsApp móvil  │
                   └──────────────────┘
```

---

## Notas técnicas importantes

### Templates WhatsApp — MARKETING vs UTILITY

Meta distingue dos categorías con reglas muy distintas:

| Categoría | Requiere tier | Requiere verificación | Casos de uso |
|---|---|---|---|
| UTILITY | No | No | Recordatorios de citas, confirmaciones, avisos de vencimiento |
| MARKETING | Sí (tier alto) | Sí (OTP) | Promociones, ofertas, re-engagement |

Los templates `0d`, `7d`, `30d` fueron aprobados como MARKETING. Para que entreguen necesitan:
- Verificar `+51 936 196 001` con OTP (SMS): `POST https://graph.facebook.com/v20.0/907213675807970/request_code` con `{"code_method": "SMS", "language": "es"}`
- O re-someter como UTILITY (técnicamente son recordatorios transaccionales, Meta los suele aprobar)

Los templates UTILITY (`citas_healup`) entregan inmediatamente a cualquier número sin restricciones.

### Cómo enviar template vía Chatwoot API

El token del system user de Meta (`provider_config.api_key`) no tiene permiso `whatsapp_business_messaging` para llamar directamente a `/{phone_number_id}/messages`. Usar siempre la API de Chatwoot:

```
POST https://chats.alef.company/api/v1/accounts/1/conversations
Header: api_access_token: xBsW4FE3FCZdZbgXgdjrHfUA
```

Para templates POSICIONALES (`citas_healup`, `mensaje_citas_diarias`):
```json
"processed_params": { "1": "valor1", "2": "valor2" }
```

Para templates NAMED (`0d`, `7d`, `30d`):
```json
"processed_params": { "nombre": "Juan", "tratamiento": "Hilos Delta", "fecha": "15 de abril" }
```

**Reglas de parámetros Meta**:
- No incluir `\n` en valores de parámetros posicionales → error `#132018`
- No incluir `buttons` en `template_params` → error `#132000` (Chatwoot los agrega incorrectamente)
- El idioma debe coincidir exactamente con el registrado en Meta (`en_US` ≠ `en`)

### Por qué `(supabase as any)` en algunas queries
Los tipos TypeScript no han sido regenerados desde el proyecto Supabase real. Una vez corrido `supabase gen types` se pueden eliminar esos casts.

### Por qué `src/proxy.ts` en vez de `src/middleware.ts`
El middleware causaba loops de redirect en dev con puerto 3005. La lógica está lista en `proxy.ts`; activarla es solo renombrar.

### Columnas correctas de `recordatorios_log`
Nombres exactos: `tipo`, `fecha_programada`, `fecha_enviada`, `error_msg`. No usar: `tipo_recordatorio`, `fecha_envio_programada`, `enviado_at`.

### WA links en el dashboard
Formato correcto para Perú: `https://wa.me/51${telefono.replace(/\D/g, "").slice(-9)}` — tomar los últimos 9 dígitos y anteponer el código de país `51`.

### Sincronización de plantillas WA
El texto de los mensajes existe en DOS lugares que deben mantenerse idénticos:
- `reminders-service/templates.py` (lo que se envía)
- `src/app/(dashboard)/plantillas/page.tsx` (preview en el dashboard)
- Meta Business Manager (aprobado para envío)

Si se modifica uno, actualizar los tres y esperar re-aprobación de Meta (24-48h).

---

## Roadmap (próximos pasos)

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 1 | **Resolver entrega MARKETING** | Bloqueado | Verificar número con OTP o re-someter como UTILITY |
| 2 | **Deploy Railway** | Listo para deploy | Copiar vars de `reminders-service/.env` al proyecto Railway |
| 3 | **Deploy Netlify** | Listo para deploy | Push a main branch |
| 4 | **CRUD Pacientes — Edición** | Pendiente | `NuevoPacienteDrawer` y `pacienteSchema` existen, falta modo edición y botón eliminar |
| 5 | **Middleware de autenticación** | Pendiente | Renombrar `src/proxy.ts` → `src/middleware.ts` |
| 6 | **Limpiar datos de prueba** | Pendiente | Eliminar consulta de prueba y 3 recordatorios del paciente Juan Pablo (creados para testear el flujo) |
