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
- `useConsultas` / `useHistoriaClinica` / `useTratamientosCatalogo` / `useCrearConsulta` — consultas y evoluciones clínicas. `useHistoriaClinica` acepta segundo param `enabled: boolean` para diferir la carga hasta que haya permiso.
- `usePacientes` — lista, creación y búsqueda de pacientes
- `useDashboard` — estadísticas del día para el panel principal
- `useProcedimientos` — catálogo de tratamientos
- `usePermisosAcceso` — sistema de permisos de acceso a pacientes (ver sección abajo)

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

**Schema acumulado** (todas ejecutadas en producción en este orden):
- `supabase/schema.sql` — tablas base
- `supabase/migration_v2.sql` — sistema completo de renovaciones y recordatorios
- `supabase/migration_v3.sql` — formulario médico completo en `historias_clinicas`: signos vitales (`fc`, `fr`, `pa`, `imc`, `rq`, `asa`), filiación (`religion`, `estado_civil`, `grado_instruccion`, `procedencia`), anamnesis, antecedentes fisiológicos, patológicos (`ant_patologicos[]`), alergias (`alergias_medicamentos[]`), fármacos (`farmacos_lista[]`), quirúrgicos y familiares
- `supabase/migration_v4.sql` — RLS policies para rol `recepcion` en `evoluciones_clinicas`
- `supabase/migration_v5.sql` — campos de filiación en tabla `pacientes`
- `supabase/migration_v6.sql` — RLS fixes para `fotos_antes_despues` y Storage bucket
- `supabase/migration_v7.sql` — acceso completo de escritura para `recepcion` en `historias_clinicas` y `evoluciones_clinicas`
- `supabase/migration_v8.sql` — fix de trigger functions con `SECURITY DEFINER` para compatibilidad con RLS de Supabase
- `supabase/migration_v9.sql` — permite a `recepcion` crear y editar `tratamientos_catalogo`
- `supabase/migration_v10.sql` — sistema de permisos de acceso a pacientes: tabla `permisos_acceso`, RLS actualizado en `historias_clinicas`/`evoluciones_clinicas`/`fotos_antes_despues`, Realtime habilitado

**Tablas principales**: `profiles`, `pacientes`, `citas`, `tratamientos_catalogo`, `historias_clinicas`, `evoluciones_clinicas`, `procedimientos_consulta`, `seguimientos_renovacion`, `recordatorios_log`, `fotos_antes_despues`, `audit_log`, `permisos_acceso`

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
- `doctor`: todo lo anterior + Procedimientos + Plantillas WA + Solicitudes de acceso
- `admin`: todo + Configuración + Solicitudes de acceso

**Permisos de edición en `/pacientes`**: solo `admin` y `doctor` ven los botones de editar y eliminar. Recepción no puede editar datos de pacientes desde la lista.

## Sistema de Permisos de Acceso a Pacientes

La Dra. Dennisse es muy protectora de la base de datos. Recepción **no puede abrir el expediente clínico de un paciente** sin aprobación explícita.

**Flujo:**
1. Recepción entra a `/pacientes/[id]` → ve pantalla "Acceso restringido" con botón "Solicitar acceso"
2. Al solicitar → se crea registro en `permisos_acceso` con `estado = 'pendiente'`
3. La doctora recibe notificación en tiempo real en el sidebar (ítem "Solicitudes de acceso" con badge amarillo parpadeante)
4. La doctora aprueba o rechaza desde el panel expandible del sidebar
5. Recepción ve la respuesta al instante via Supabase Realtime — si aprobado, el perfil se carga automáticamente
6. El acceso aprobado dura **hasta medianoche del mismo día** (`fecha_expira = CURRENT_DATE`)

**Tabla `permisos_acceso`** (columnas clave):
- `paciente_id`, `paciente_nombre` — qué paciente se solicitó
- `solicitado_por`, `solicitado_por_nombre` — quién pidió acceso
- `aprobado_por` — quién lo aprobó (doctor/admin)
- `estado` — `pendiente | aprobado | rechazado`
- `fecha_expira` — fecha de expiración (día completo)

**RLS actualizado** (migration_v10): `historias_clinicas`, `evoluciones_clinicas` y `fotos_antes_despues` requieren `permisos_acceso` aprobado y vigente para recepción. Admin/doctor siempre tienen acceso.

**Componentes clave:**
- `src/components/pacientes/SolicitarAccesoPanel.tsx` — pantalla de bloqueo con estados: sin solicitud / esperando / aprobado. Usa Supabase Realtime para detectar aprobación al instante.
- `src/components/NotificacionesPermiso.tsx` — panel expandible inline en sidebar para la doctora. Agrupa solicitudes por paciente, tiene buscador por nombre de paciente o solicitante, botones Aprobar/Rechazar por cada solicitud.

**Hooks en `src/lib/hooks/usePermisosAcceso.ts`:**
- `usePermisoActivo(pacienteId)` — verifica si hay permiso aprobado vigente para el usuario actual
- `useSolicitudPendiente(pacienteId)` — solicitud pendiente activa (poll cada 3s cuando existe)
- `usePermisosPendientes()` — todas las solicitudes pendientes para la doctora (con Realtime)
- `useSolicitarAcceso()` — mutation para crear solicitud (idempotente: no duplica si ya existe una)
- `useResponderPermiso()` — mutation para aprobar/rechazar (solo admin/doctor)

**En `pacientes/[id]/page.tsx`**: carga el rol del usuario, verifica `permisoActivo`. Si es recepción sin permiso → muestra `SolicitarAccesoPanel`. Al aprobarse, invalida los query keys de historia/consultas/fotos para refetch con RLS desbloqueado.

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

**Bugs corregidos:**
- `NuevaConsultaDrawer`: `useTratamientosCatalogo` no seleccionaba `is_active`, filtro en cliente devolvía array vacío. Solución: eliminado el filtro redundante.
- `useDashboard` contador de pacientes: usaba `.eq("is_active", true)` pero `pacientes` no tiene esa columna — siempre devolvía 0. Corregido a `.neq("estado", "inactivo")`.

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

- **`next.config.ts`**: Usa `__dirname` para aislar el Turbopack root y evitar compilaciones en directorios padre. Define `basePath: "/staff"` — todas las rutas en producción (Netlify) van bajo `/staff/*`. En desarrollo con `-p 3005` el `basePath` sigue activo, por lo que las URLs locales también usan `/staff/`.
- **`netlify.toml`**: Configuración de deploy. El sitio se despliega en Netlify apuntando a la rama `main`.

## Roadmap (Próximos Pasos)

1. **Resolver entrega de templates MARKETING** — Opción A: verificar `+51 936 196 001` con OTP vía Meta API (`POST /{phone_number_id}/request_code`). Opción B: re-someter `0d`, `7d`, `30d` como UTILITY en Meta Business Manager (1-2 días aprobación).
2. **Deploy reminders-service a Railway** — copiar variables de `reminders-service/.env` al proyecto Railway
3. ~~**Deploy dashboard a Netlify**~~ — ✅ conectado a rama `main`, deploy automático en cada push
4. ~~**CRUD Pacientes completo**~~ — ✅ implementado (edición y eliminación en `NuevoPacienteDrawer`)
5. **Middleware de autenticación** — activar `src/proxy.ts` renombrándolo a `src/middleware.ts`
6. ~~**Sistema de permisos de acceso a pacientes**~~ — ✅ implementado (migration_v10 + `usePermisosAcceso` + `SolicitarAccesoPanel` + `NotificacionesPermiso`)
7. **Contrato de confidencialidad** — la Dra. requiere un acuerdo firmado por cada colaborador que acceda al sistema. Prompt generado para producirlo via claude.ai (Ley N° 29733 Perú). Pendiente imprimir y firmar con cada miembro del equipo.

> Ver `PROYECTO.md` para la bitácora completa, arquitectura del sistema y notas técnicas detalladas.
