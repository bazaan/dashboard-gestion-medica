# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto del Proyecto

Panel de Gestión Médica personalizado para clínica de dermatología estética de alto nivel.
**Cliente**: Dra. Dennisse Arroyo (dradennissearroyo.com).
**Propósito**: Agendar y gestionar citas, historias clínicas electrónicas, base de datos de pacientes y sistema automático de recordatorios WhatsApp para renovaciones de tratamientos.

## Comandos

```sh
npm run dev -- -p 3005   # Servidor de desarrollo (SIEMPRE usar puerto 3005)
npm run build            # Build de producción
npm run lint             # ESLint
npm run start            # Servidor de producción
```

> **Importante**: Usar siempre el puerto **3005**. El entorno local tiene conflictos con Turbopack en el puerto 3000 por lockfiles del directorio padre.

> **Importante — Next.js**: Esta versión puede tener breaking changes respecto a versiones anteriores. Antes de escribir código, consultar las guías locales en `node_modules/next/dist/docs/`.

## Stack Tecnológico

- **Framework**: Next.js 16.2.1 (App Router), React 19
- **Lenguaje**: TypeScript (modo `strict`)
- **Estilos**: Tailwind CSS v4 con tokens definidos en `src/app/globals.css` via `@theme`
- **Base de datos**: Supabase (PostgreSQL) via `@supabase/ssr`
- **Animaciones**: `framer-motion`
- **Iconografía**: `lucide-react`
- **Datos del servidor**: `@tanstack/react-query` (QueryProvider en root layout)
- **Formularios**: `react-hook-form` + `zod` (schemas en `src/lib/schemas/`)
- **Toasts**: `sonner`
- **Utilidades**: `clsx` + `tailwind-merge` (`src/lib/utils.ts`)

## Arquitectura y Enrutamiento

El proyecto usa **Route Groups** de Next.js App Router:

- `(auth)` — páginas públicas (login). Layout centra contenido sobre fondo `bg-secondary`.
- `(dashboard)` — páginas protegidas. El layout es un Server Component que verifica sesión Supabase; si no hay usuario o perfil, redirige a `/login`. Monta `<Sidebar profile={profile}>` junto al `<main>` en `flex h-screen overflow-hidden`.

El root layout (`src/app/layout.tsx`) sólo inyecta fuentes, `<QueryProvider>` y `<Toaster>`.

**Middleware de autenticación**: `src/proxy.ts` contiene la lógica completa de guard de rutas lista para activarse. Para habilitarla, renombrar o importar desde `src/middleware.ts`. Actualmente la protección se hace sólo a nivel de layout del route group `(dashboard)`.

**Custom hooks**: se ubican en `src/lib/hooks/` (no en `src/components/`):
- `useFotos` — upload/delete de fotos en Supabase Storage
- `useConsultas` / `useHistoriaClinica` / `useTratamientosCatalogo` / `useCrearConsulta` — consultas y evoluciones clínicas
- `usePacientes` — lista, creación y búsqueda de pacientes
- `useDashboard` — estadísticas del día para el panel principal
- `useProcedimientos` — catálogo de tratamientos

**Schemas Zod**: `src/lib/schemas/paciente.schema.ts` y `src/lib/schemas/consulta.schema.ts`.

> **Nota sobre `any` en queries Supabase**: las consultas a tablas usan `(supabase as any)` porque los tipos TypeScript no están regenerados desde el proyecto Supabase real todavía. Una vez ejecutado `supabase gen types`, eliminar esos casts.

**Rutas actuales:**
- `/login` — Formulario de autenticación
- `/` — Dashboard principal: estadísticas dinámicas, greeting con hora del día, urgentes clicables con botón WA, badge de urgentes en sidebar
- `/pacientes` — Lista con búsqueda; vista mobile (cards) y desktop (tabla)
- `/pacientes/[id]` — Historia clínica, evoluciones, fotos antes/después con comparador slider, `NuevaConsultaDrawer`
- `/agenda` — Ruta existe, **no conectar** (decisión del cliente)
- `/renovaciones` — Tab "Seguimientos" + tab "Recordatorios WA" con log de envíos
- `/procedimientos` — Catálogo de tratamientos (solo admin/doctor)
- `/plantillas` — Plantillas de WhatsApp con preview interactivo (solo admin/doctor)
- `/configuracion` — Config del sistema (solo admin, página vacía)

## Supabase

Proyecto: `wnbamzjieowfqcowppxc.supabase.co`

Hay tres clientes, cada uno con su propio contexto:

| Archivo | Función | Cuándo usar |
|---|---|---|
| `src/lib/supabase/client.ts` | `createClient()` | Componentes cliente (`"use client"`) |
| `src/lib/supabase/server.ts` | `createClient()` async | Server Components, layouts, Server Actions |
| `src/lib/supabase/admin.ts` | `createAdminClient()` | Solo API Routes — **nunca en el cliente** |

Los tipos TypeScript de las tablas se definen manualmente en `src/types/database.types.ts`. Para regenerarlos:
```sh
npx supabase gen types typescript --project-id wnbamzjieowfqcowppxc > src/types/database.types.ts
```

**Schema en tres partes** (todas ejecutadas en producción):
- `supabase/schema.sql` — tablas base
- `supabase/migration_v2.sql` — sistema completo de renovaciones y recordatorios
- `supabase/migration_v3.sql` — formulario médico completo en `historias_clinicas`: signos vitales (`fc`, `fr`, `pa`, `imc`, `rq`, `asa`), filiación (`religion`, `estado_civil`, `grado_instruccion`, `procedencia`), anamnesis, antecedentes fisiológicos, patológicos (`ant_patologicos[]`), alergias (`alergias_medicamentos[]`), fármacos (`farmacos_lista[]`), quirúrgicos y familiares

**Tablas principales**: `profiles`, `pacientes`, `citas`, `tratamientos_catalogo`, `historias_clinicas`, `evoluciones_clinicas`, `procedimientos_consulta`, `seguimientos_renovacion`, `recordatorios_log`, `fotos_antes_despues`, `audit_log`

**Vistas**: `dashboard_stats`, `renovaciones_vista`

**Storage buckets**:
- `fotos-pacientes` — fotos antes/después (URLs firmadas TTL 1 hora)
- `documentos-pacientes` — PDFs y documentos clínicos (privado, 20MB límite)

**Columna añadida manualmente** (no está en migration_v2.sql original):
```sql
ALTER TABLE recordatorios_log ADD COLUMN IF NOT EXISTS error_msg TEXT;
```

**Variables de entorno** (en `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://wnbamzjieowfqcowppxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Roles de usuario

`UserRole`: `admin` | `doctor` | `recepcion`. El perfil del usuario autenticado se carga en el dashboard layout y se pasa al `<Sidebar>`.

Visibilidad en sidebar por rol:
- `recepcion`: Panel, Pacientes, Renovaciones
- `doctor`: todo lo anterior + Procedimientos + Plantillas WA
- `admin`: todo + Configuración

## Sistema de Recordatorios WhatsApp (`reminders-service/`)

Servicio Python independiente desplegado en **Railway**. Corre diariamente a las 9:00 AM Lima (cron configurable).

**Flujo completo:**
1. `main.py` dispara el cron → `sender.py` orquesta el batch
2. `db.py` consulta `recordatorios_log` donde `estado = 'pendiente'` y `fecha_programada <= hoy`
3. `templates.py` construye el mensaje según el tipo (`30_dias`, `7_dias`, `vencimiento`)
4. `chatwoot.py` normaliza el teléfono a E.164, busca o crea contacto en Chatwoot, crea conversación outbound con template WA
5. `db.py` marca el recordatorio como `enviado` o `fallido` con `error_msg`

**Columnas críticas de `recordatorios_log`** (nombres exactos, no confundir):
- `tipo` (no `tipo_recordatorio`)
- `fecha_programada` (no `fecha_envio_programada`)
- `fecha_enviada` (no `enviado_at`)
- `error_msg` — columna añadida manualmente, para debug de fallos

**Plantillas Meta aprobadas** (nombres exactos en Meta Business Manager):

| Variable env | Nombre en Meta | Idioma | Categoría | Estado |
|---|---|---|---|---|
| `WA_TEMPLATE_30D` | `30d` | `en_US` | MARKETING | Aprobada |
| `WA_TEMPLATE_7D` | `7d` | `es_PE` | MARKETING | Aprobada |
| `WA_TEMPLATE_VENCIMIENTO` | `0d` | `es_PE` | MARKETING | Aprobada |

> **⚠️ Problema activo**: Los 3 templates son categoría MARKETING. El número `+51 936 196 001` está en tier TIER_250 y estado NOT_VERIFIED. Meta bloquea silenciosamente MARKETING a números no verificados con tier bajo. **Solución A**: verificar el número con OTP vía Meta API. **Solución B**: re-someter los 3 templates como categoría UTILITY.

**Templates UTILITY confirmados funcionales** (entregan sin restricción de tier/verificación):
- `citas_healup` — UTILITY, `es`, parámetros POSICIONALES `{{1}}` (fecha) y `{{2}}` (lista citas). **Importante**: `{{2}}` no puede llevar `\n`, separar con `·` o comas.

**Otras plantillas en la cuenta** (WABA `1757278298325261`):
- `mensaje_citas_diarias` — MARKETING, `es`, POSICIONAL, para resumen diario de citas

**Variables de entorno del servicio** (archivo `.env` en `reminders-service/`, replicar en Railway):
```
SUPABASE_URL=https://wnbamzjieowfqcowppxc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
CHATWOOT_BASE_URL=https://chats.alef.company
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_API_TOKEN=xBsW4FE3FCZdZbgXgdjrHfUA
CHATWOOT_WA_INBOX_ID=17
WA_TEMPLATE_30D=30d
WA_TEMPLATE_7D=7d
WA_TEMPLATE_VENCIMIENTO=0d
WA_TEMPLATE_30D_LANGUAGE=en_US
WA_TEMPLATE_7D_LANGUAGE=es_PE
WA_TEMPLATE_VENCIMIENTO_LANGUAGE=es_PE
USE_WA_TEMPLATES=true
MAX_MESSAGES_PER_RUN=100
DELAY_BETWEEN_SENDS=0.8
DRY_RUN=false
CRON_HOUR=9
CRON_MINUTE=0
LOG_LEVEL=INFO
```

**Credenciales Chatwoot / Meta** (para llamadas directas a la API):
- Chatwoot base URL: `https://chats.alef.company`
- Chatwoot API token: `xBsW4FE3FCZdZbgXgdjrHfUA`
- Inbox ID: `17`
- Meta phone_number_id: `907213675807970`
- Meta WABA ID: `1757278298325261`
- Meta system user: `122096410293196402` (Alef Company System User)
- Meta API token: en `provider_config.api_key` del inbox 17 de Chatwoot

**Cómo enviar template vía Chatwoot API** (método confirmado funcional):
```bash
POST https://chats.alef.company/api/v1/accounts/1/conversations
{
  "inbox_id": 17,
  "contact_id": <id>,
  "message": {
    "content": "texto fallback",
    "template_params": {
      "name": "nombre_template",
      "category": "UTILITY",   # o "MARKETING"
      "language": "es",
      "processed_params": { "1": "valor1", "2": "valor2" }  # POSICIONAL
      # Para NAMED: { "nombre": "Juan", "tratamiento": "Hilos" }
    }
  }
}
```

> Para templates NAMED (como `0d`, `7d`, `30d`), `processed_params` usa claves con nombre. Para templates POSICIONALES (como `citas_healup`), usa claves `"1"`, `"2"`, etc. **No incluir `buttons`** en `template_params` — Chatwoot lo agrega mal y causa error `#132000`.

**Paciente de prueba** (creado para testear el flujo end-to-end):
- Nombre: Juan Pablo | ID: `0acad5d5-2a7a-4adb-9b5a-13d3749a4a20`
- Historia: `d62ccfe5-...` | Teléfono: `902215511`
- Se creó consulta con Hilos Delta Lifting® con fechas forzadas a hoy → generó 3 recordatorios → flow funcionó correctamente (3/3 enviados)

## Mobile Polish (implementado)

El layout móvil usa `pt-14 pb-16` en `<main>` para compensar la top bar y el bottom nav fijos.

Mejoras implementadas:
- **Sidebar**: badge rojo con conteo de urgentes en el ítem Renovaciones (bottom nav + sidebar desktop). Usa `useDashboardStats` en `Sidebar.tsx`
- **Dashboard**: greeting dinámico por hora, nombre real del usuario, urgentes clicables → `/pacientes/[id]`, botón WA directo en cada urgente, `active:scale-[0.98]` en cards
- **Renovaciones**: filtros de búsqueda stack vertical en móvil, `active:bg-muted/40` en filas móviles, WA links con código de país `+51` (`slice(-9)`)
- **Pacientes**: vista card en móvil, vista tabla en desktop

**Bug conocido y corregido**: En `NuevaConsultaDrawer`, `useTratamientosCatalogo` no selecciona el campo `is_active`, por lo que filtrarlo en el cliente devolvía array vacío. Solución: eliminar el filtro redundante ya que el hook ya consulta `.eq("is_active", true)`.

## Guía de Estilos (Branding Oficial)

Los tokens de Tailwind se definen en `globals.css` y se usan directamente como clases (`bg-primary`, `text-secondary`, etc.).

### Colores
| Token | Hex | Uso |
|---|---|---|
| `primary` | `#a98d67` | Botones, acentos dorados |
| `primary-hover` | `#967a59` | Hover de botones |
| `secondary` | `#20354d` | Fondo Sidebar, Navy Blue |
| `accent` | `#3a3d42` | Carbón oscuro |
| `background` | `#ffffff` | Fondo principal |
| `muted` | `#f4f5f7` | Tarjetas, fondos secundarios |
| `foreground` | `#1a1a1a` | Texto principal |
| `border` | `#e5e7eb` | Bordes |

### Tipografía
- `--font-sans` → Inter — fuente base, clase `font-sans`
- `--font-serif` → Playfair Display — títulos, clase `font-serif`

## Configuración Especial

- **`next.config.ts`**: Usa `__dirname` para aislar el Turbopack root y evitar compilaciones en directorios padre.

## Roadmap (Próximos Pasos)

1. **Resolver entrega de templates MARKETING** — Opción A: verificar `+51 936 196 001` con OTP vía Meta API (`POST /{phone_number_id}/request_code`). Opción B: re-someter `0d`, `7d`, `30d` como UTILITY en Meta Business Manager (1-2 días aprobación).
2. **Deploy reminders-service a Railway** — copiar variables de `reminders-service/.env` al proyecto Railway
3. **Deploy dashboard a Netlify** — push a main branch
4. ~~**CRUD Pacientes completo**~~ — ✅ implementado (edición y eliminación en `NuevoPacienteDrawer`)
5. **Middleware de autenticación** — activar `src/proxy.ts` renombrándolo a `src/middleware.ts`

> Ver `PROYECTO.md` para la bitácora completa, arquitectura del sistema y notas técnicas detalladas.
