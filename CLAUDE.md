# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto del Proyecto

Panel de Gestión Médica personalizado para clínica de dermatología estética de alto nivel.
**Cliente**: Dra. Dennisse Arroyo (dradennissearroyo.com).
**Propósito**: Agendar y gestionar citas, historias clínicas electrónicas y bases de datos de pacientes (tratamientos estéticos como Hilos Delta Lifting, Reshape Facial, Visage 3D).

## Comandos

```sh
npm run dev -- -p 3005   # Servidor de desarrollo (SIEMPRE usar puerto 3005)
npm run build            # Build de producción
npm run lint             # ESLint
npm run start            # Servidor de producción
```

> **Importante**: Usar siempre el puerto **3005**. El entorno local tiene conflictos con Turbopack en el puerto 3000 por lockfiles del directorio padre.

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

**Rutas actuales:**
- `/login` — Formulario de autenticación
- `/` — Dashboard principal: tarjetas de estadísticas, accesos rápidos, citas del día
- `/pacientes` — Tabla de pacientes
- `/pacientes/[id]` — Detalle del paciente: fotos antes/después con comparador slider
- `/agenda` — Calendario de turnos

## Supabase

Hay tres clientes, cada uno con su propio contexto:

| Archivo | Función | Cuándo usar |
|---|---|---|
| `src/lib/supabase/client.ts` | `createClient()` | Componentes cliente (`"use client"`) |
| `src/lib/supabase/server.ts` | `createClient()` async | Server Components, layouts, Server Actions |
| `src/lib/supabase/admin.ts` | `createAdminClient()` | Solo API Routes — **nunca en el cliente** |

Los tipos TypeScript de las tablas se definen manualmente en `src/types/database.types.ts`. Para regenerarlos desde el proyecto Supabase real:
```sh
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

**Tablas principales**: `profiles`, `pacientes`, `citas`, `tratamientos_catalogo`, `historias_clinicas`, `evoluciones_clinicas`, `fotos_antes_despues`, `audit_log`
**Vista**: `dashboard_stats` (agrega métricas del día)
**Storage bucket**: `fotos-pacientes` (URLs firmadas con TTL de 1 hora)

**Variables de entorno requeridas** (en `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Roles de usuario

`UserRole`: `admin` | `doctor` | `recepcion`. El perfil del usuario autenticado se carga en el dashboard layout y se pasa al `<Sidebar>`.

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

Existe un tema `.dark` definido en `globals.css` con overrides de todos los tokens de color.

### Tipografía

Las variables de fuente se inyectan en `<html>` desde `layout.tsx` y se mapean en `globals.css`:
- `--font-sans` → `--font-inter` (Inter) — fuente base, usar clase `font-sans`
- `--font-serif` → `--font-playfair` (Playfair Display) — títulos `h1`-`h4`, usar clase `font-serif`

## Configuración Especial

- **`next.config.ts`**: Usa `__dirname` para aislar el Turbopack root y evitar compilaciones en directorios padre.

## Roadmap (Próximos Pasos)

1. **CRUD Pacientes completo**: El drawer `NuevoPacienteDrawer` y el schema `pacienteSchema` ya existen; falta conectar edición y eliminación
2. **Historias Clínicas**: Evoluciones médicas en `/pacientes/[id]` (tablas `historias_clinicas` y `evoluciones_clinicas` ya modeladas)
3. **Agenda**: Conectar `/agenda` a la tabla `citas`
4. **Middleware de autenticación**: Proteger rutas a nivel de middleware de Next.js para evitar flash de contenido no autenticado
