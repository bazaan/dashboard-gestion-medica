import { z } from "zod";

export const pacienteSchema = z.object({
  nombres: z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellidos: z.string().min(2, "Mínimo 2 caracteres").max(100),
  dni: z.string().min(8, "DNI debe tener 8 dígitos").max(12).regex(/^\d+$/, "Solo números"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().min(9, "Teléfono inválido").max(20),
  telefono_alt: z.string().optional().or(z.literal("")),
  fecha_nacimiento: z.string().min(1, "Fecha requerida"),
  sexo: z.enum(["F", "M", "otro"]).optional(),
  direccion: z.string().optional().or(z.literal("")),
  distrito: z.string().optional().or(z.literal("")),
  ciudad: z.string().min(1, "Ciudad requerida"),
  ocupacion: z.string().optional().or(z.literal("")),
  grupo_sanguineo: z.string().optional().or(z.literal("")),
  alergias_texto: z.string().optional().or(z.literal("")),
  antecedentes_medicos: z.string().optional().or(z.literal("")),
  medicamentos_actuales: z.string().optional().or(z.literal("")),
  consentimiento_datos: z.boolean().refine((v) => v === true, {
    message: "El consentimiento es obligatorio",
  }),
});

export type PacienteFormData = z.infer<typeof pacienteSchema>;
