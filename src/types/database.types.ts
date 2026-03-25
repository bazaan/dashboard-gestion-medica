// Este archivo será reemplazado por los tipos generados automáticamente con:
// npx supabase gen types typescript --project-id <tu-project-id> > src/types/database.types.ts
//
// Por ahora contiene los tipos manuales para que el proyecto compile sin errores.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'doctor' | 'recepcion'
export type PacienteEstado = 'activo' | 'inactivo' | 'vip'
export type Sexo = 'F' | 'M' | 'otro'
export type CitaEstado =
  | 'pendiente'
  | 'confirmada'
  | 'en_sala_espera'
  | 'en_atencion'
  | 'completada'
  | 'cancelada'
  | 'no_asistio'
export type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'
export type EstadoPago = 'pendiente' | 'parcial' | 'pagado'
export type TratamientoCategoria =
  | 'hilos'
  | 'facial'
  | 'laser'
  | 'corporal'
  | 'evaluacion'
  | 'otro'
export type TipoFoto = 'antes' | 'despues' | 'seguimiento'
export type AnguloFoto =
  | 'frontal'
  | 'lateral_izq'
  | 'lateral_der'
  | 'superior'
  | 'otro'
export type TipoPiel = 'seca' | 'grasa' | 'mixta' | 'normal' | 'sensible'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          avatar_url: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: UserRole
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      pacientes: {
        Row: {
          id: string
          numero_historia: string
          nombres: string
          apellidos: string
          dni: string
          email: string | null
          telefono: string
          telefono_alt: string | null
          fecha_nacimiento: string
          sexo: Sexo | null
          direccion: string | null
          distrito: string | null
          ciudad: string
          pais: string
          ocupacion: string | null
          grupo_sanguineo: string | null
          alergias: string[]
          antecedentes_medicos: string | null
          medicamentos_actuales: string | null
          consentimiento_datos: boolean
          consentimiento_fecha: string | null
          estado: PacienteEstado
          foto_perfil_url: string | null
          notas_internas: string | null
          creado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['pacientes']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['pacientes']['Insert']>
      }
      tratamientos_catalogo: {
        Row: {
          id: string
          nombre: string
          codigo: string
          categoria: TratamientoCategoria
          descripcion: string | null
          duracion_minutos: number
          precio_base: number | null
          requiere_evaluacion_previa: boolean
          instrucciones_previas: string | null
          instrucciones_post: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['tratamientos_catalogo']['Row'],
          'id' | 'created_at'
        > & { id?: string; created_at?: string }
        Update: Partial<
          Database['public']['Tables']['tratamientos_catalogo']['Insert']
        >
      }
      citas: {
        Row: {
          id: string
          paciente_id: string
          tratamiento_id: string
          doctor_id: string | null
          creado_por: string | null
          fecha_hora_inicio: string
          fecha_hora_fin: string
          duracion_minutos: number
          sede: string
          estado: CitaEstado
          precio_acordado: number | null
          forma_pago: FormaPago | null
          estado_pago: EstadoPago
          notas: string | null
          motivo_cancelacion: string | null
          recordatorio_enviado: boolean
          confirmada_en: string | null
          atendida_en: string | null
          cancelada_en: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['citas']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['citas']['Insert']>
      }
      historias_clinicas: {
        Row: {
          id: string
          paciente_id: string
          numero: string
          motivo_consulta_inicial: string | null
          antecedentes_esteticos: string | null
          expectativas_paciente: string | null
          tipo_piel: TipoPiel | null
          fototipo_fitzpatrick: number | null
          condiciones_piel: string[]
          abierta_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['historias_clinicas']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<
          Database['public']['Tables']['historias_clinicas']['Insert']
        >
      }
      evoluciones_clinicas: {
        Row: {
          id: string
          historia_id: string
          cita_id: string | null
          paciente_id: string
          doctor_id: string
          fecha_atencion: string
          motivo_consulta: string
          examen_fisico: string | null
          diagnostico: string | null
          procedimiento: string
          productos_usados: string[]
          zona_tratada: string[]
          observaciones: string | null
          recomendaciones: string | null
          proxima_sesion_sugerida: string | null
          firmado_por: string | null
          firmado_en: string | null
          is_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['evoluciones_clinicas']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<
          Database['public']['Tables']['evoluciones_clinicas']['Insert']
        >
      }
      fotos_antes_despues: {
        Row: {
          id: string
          paciente_id: string
          evolucion_id: string | null
          cita_id: string | null
          storage_path: string
          tipo: TipoFoto
          angulo: AnguloFoto | null
          zona: string | null
          descripcion: string | null
          fecha_foto: string
          consentimiento_imagen: boolean
          subida_por: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['fotos_antes_despues']['Row'],
          'id' | 'created_at'
        > & { id?: string; created_at?: string }
        Update: Partial<
          Database['public']['Tables']['fotos_antes_despues']['Insert']
        >
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource: string
          resource_id: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['audit_log']['Row'],
          'id' | 'created_at'
        > & { id?: string; created_at?: string }
        Update: never
      }
    }
    Views: {
      dashboard_stats: {
        Row: {
          citas_hoy: number | null
          confirmadas_hoy: number | null
          completadas_hoy: number | null
          ingresos_hoy: number | null
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Tipos helper para uso en componentes
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']
export type Tratamiento =
  Database['public']['Tables']['tratamientos_catalogo']['Row']
export type Cita = Database['public']['Tables']['citas']['Row']
export type HistoriaClinica =
  Database['public']['Tables']['historias_clinicas']['Row']
export type EvolucionClinica =
  Database['public']['Tables']['evoluciones_clinicas']['Row']
export type FotoAntesDespues =
  Database['public']['Tables']['fotos_antes_despues']['Row']
export type DashboardStats =
  Database['public']['Views']['dashboard_stats']['Row']
