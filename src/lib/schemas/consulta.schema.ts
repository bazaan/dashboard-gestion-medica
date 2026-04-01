import { z } from "zod";

export const consultaSchema = z.object({
  fecha_atencion:      z.string().min(1, "Fecha requerida"),
  hora_atencion:       z.string().min(1, "Hora requerida"),
  motivo_consulta:     z.string().optional().or(z.literal("")),
  signos_sintomas:     z.string().optional().or(z.literal("")),
  examen_fisico:       z.string().optional().or(z.literal("")),
  fur:                 z.string().optional().or(z.literal("")),   // solo mujeres
  ram:                 z.string().optional().or(z.literal("")),
  antecedentes:        z.string().optional().or(z.literal("")),
  examenes_auxiliares: z.string().optional().or(z.literal("")),
  medicacion:          z.string().optional().or(z.literal("")),
  diagnostico:         z.string().optional().or(z.literal("")),
  tratamiento_ids:     z.array(z.string()).min(1, "Selecciona al menos un procedimiento"),
  observaciones:       z.string().optional().or(z.literal("")),
  recomendaciones:     z.string().optional().or(z.literal("")),
  proxima_sesion:      z.string().optional().or(z.literal("")),
});

export type ConsultaFormData = z.infer<typeof consultaSchema>;
