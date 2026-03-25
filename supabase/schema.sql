-- =============================================================
-- SCHEMA COMPLETO: Dashboard Dra. Dennisse Arroyo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- --------------------------------
-- 1. EXTENSIONES
-- --------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------
-- 2. TABLAS
-- --------------------------------

-- Perfiles de usuarios del sistema (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'recepcion')),
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de tratamientos
CREATE TABLE IF NOT EXISTS tratamientos_catalogo (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                      TEXT NOT NULL,
  codigo                      TEXT UNIQUE NOT NULL,
  categoria                   TEXT NOT NULL CHECK (categoria IN ('hilos', 'facial', 'laser', 'corporal', 'evaluacion', 'otro')),
  descripcion                 TEXT,
  duracion_minutos            INT NOT NULL DEFAULT 60,
  precio_base                 NUMERIC(10,2),
  requiere_evaluacion_previa  BOOLEAN DEFAULT FALSE,
  instrucciones_previas       TEXT,
  instrucciones_post          TEXT,
  is_active                   BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_historia       TEXT UNIQUE NOT NULL,
  nombres               TEXT NOT NULL,
  apellidos             TEXT NOT NULL,
  dni                   TEXT UNIQUE NOT NULL,
  email                 TEXT,
  telefono              TEXT NOT NULL,
  telefono_alt          TEXT,
  fecha_nacimiento      DATE NOT NULL,
  sexo                  TEXT CHECK (sexo IN ('F', 'M', 'otro')),
  direccion             TEXT,
  distrito              TEXT,
  ciudad                TEXT DEFAULT 'Lima',
  pais                  TEXT DEFAULT 'Perú',
  ocupacion             TEXT,
  grupo_sanguineo       TEXT,
  alergias              TEXT[] DEFAULT '{}',
  antecedentes_medicos  TEXT,
  medicamentos_actuales TEXT,
  consentimiento_datos  BOOLEAN DEFAULT FALSE,
  consentimiento_fecha  TIMESTAMPTZ,
  estado                TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'vip')),
  foto_perfil_url       TEXT,
  notas_internas        TEXT,
  creado_por            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Citas
CREATE TABLE IF NOT EXISTS citas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  tratamiento_id        UUID NOT NULL REFERENCES tratamientos_catalogo(id),
  doctor_id             UUID REFERENCES profiles(id),
  creado_por            UUID REFERENCES profiles(id),
  fecha_hora_inicio     TIMESTAMPTZ NOT NULL,
  fecha_hora_fin        TIMESTAMPTZ NOT NULL,
  duracion_minutos      INT NOT NULL,
  sede                  TEXT DEFAULT 'San Isidro',
  estado                TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
                          'pendiente', 'confirmada', 'en_sala_espera',
                          'en_atencion', 'completada', 'cancelada', 'no_asistio'
                        )),
  precio_acordado       NUMERIC(10,2),
  forma_pago            TEXT CHECK (forma_pago IN ('efectivo', 'tarjeta', 'transferencia', 'mixto')),
  estado_pago           TEXT DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'parcial', 'pagado')),
  notas                 TEXT,
  motivo_cancelacion    TEXT,
  recordatorio_enviado  BOOLEAN DEFAULT FALSE,
  confirmada_en         TIMESTAMPTZ,
  atendida_en           TIMESTAMPTZ,
  cancelada_en          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_fecha     ON citas(fecha_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_paciente  ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado    ON citas(estado);

-- Historias Clínicas (una por paciente)
CREATE TABLE IF NOT EXISTS historias_clinicas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id               UUID UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  numero                    TEXT UNIQUE NOT NULL,
  motivo_consulta_inicial   TEXT,
  antecedentes_esteticos    TEXT,
  expectativas_paciente     TEXT,
  tipo_piel                 TEXT CHECK (tipo_piel IN ('seca', 'grasa', 'mixta', 'normal', 'sensible')),
  fototipo_fitzpatrick      INT CHECK (fototipo_fitzpatrick BETWEEN 1 AND 6),
  condiciones_piel          TEXT[] DEFAULT '{}',
  abierta_por               UUID REFERENCES profiles(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Evoluciones Clínicas (registro de cada sesión)
CREATE TABLE IF NOT EXISTS evoluciones_clinicas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id               UUID NOT NULL REFERENCES historias_clinicas(id) ON DELETE CASCADE,
  cita_id                   UUID REFERENCES citas(id),
  paciente_id               UUID NOT NULL REFERENCES pacientes(id),
  doctor_id                 UUID NOT NULL REFERENCES profiles(id),
  fecha_atencion            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo_consulta           TEXT NOT NULL,
  examen_fisico             TEXT,
  diagnostico               TEXT,
  procedimiento             TEXT NOT NULL,
  productos_usados          TEXT[] DEFAULT '{}',
  zona_tratada              TEXT[] DEFAULT '{}',
  observaciones             TEXT,
  recomendaciones           TEXT,
  proxima_sesion_sugerida   DATE,
  firmado_por               UUID REFERENCES profiles(id),
  firmado_en                TIMESTAMPTZ,
  is_locked                 BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Fotos Antes/Después
CREATE TABLE IF NOT EXISTS fotos_antes_despues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  evolucion_id          UUID REFERENCES evoluciones_clinicas(id),
  cita_id               UUID REFERENCES citas(id),
  storage_path          TEXT NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('antes', 'despues', 'seguimiento')),
  angulo                TEXT CHECK (angulo IN ('frontal', 'lateral_izq', 'lateral_der', 'superior', 'otro')),
  zona                  TEXT,
  descripcion           TEXT,
  fecha_foto            DATE NOT NULL DEFAULT CURRENT_DATE,
  consentimiento_imagen BOOLEAN NOT NULL DEFAULT FALSE,
  subida_por            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id UUID,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- 3. TRIGGERS: updated_at automático
-- --------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_historias_updated_at
  BEFORE UPDATE ON historias_clinicas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_evoluciones_updated_at
  BEFORE UPDATE ON evoluciones_clinicas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- 4. TRIGGER: Auto-crear historia clínica al registrar paciente
-- --------------------------------
CREATE OR REPLACE FUNCTION crear_historia_clinica()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO historias_clinicas (paciente_id, numero, abierta_por)
  VALUES (NEW.id, NEW.numero_historia, NEW.creado_por);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_crear_historia_al_registrar_paciente
  AFTER INSERT ON pacientes
  FOR EACH ROW EXECUTE FUNCTION crear_historia_clinica();

-- --------------------------------
-- 5. TRIGGER: Auto-crear profile al registrar usuario en auth
-- --------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recepcion')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- --------------------------------
-- 6. FUNCIÓN HELPER PARA RLS
-- --------------------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --------------------------------
-- 7. ROW LEVEL SECURITY
-- --------------------------------
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE historias_clinicas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evoluciones_clinicas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_antes_despues   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- pacientes
CREATE POLICY "pacientes_select" ON pacientes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pacientes_insert" ON pacientes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "pacientes_update" ON pacientes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "pacientes_delete" ON pacientes
  FOR DELETE USING (get_my_role() = 'admin');

-- tratamientos_catalogo (lectura para todos, escritura solo admin)
CREATE POLICY "tratamientos_select" ON tratamientos_catalogo
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tratamientos_write" ON tratamientos_catalogo
  FOR ALL USING (get_my_role() = 'admin');

-- citas
CREATE POLICY "citas_select" ON citas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "citas_insert" ON citas
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'recepcion'));

CREATE POLICY "citas_update" ON citas
  FOR UPDATE USING (
    get_my_role() IN ('admin', 'recepcion')
    OR (get_my_role() = 'doctor' AND doctor_id = auth.uid())
  );

CREATE POLICY "citas_delete" ON citas
  FOR DELETE USING (get_my_role() = 'admin');

-- historias_clinicas
CREATE POLICY "historias_select" ON historias_clinicas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "historias_insert" ON historias_clinicas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "historias_update" ON historias_clinicas
  FOR UPDATE USING (get_my_role() IN ('admin', 'doctor'));

-- evoluciones_clinicas
CREATE POLICY "evoluciones_select" ON evoluciones_clinicas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "evoluciones_insert" ON evoluciones_clinicas
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'doctor'));

CREATE POLICY "evoluciones_update" ON evoluciones_clinicas
  FOR UPDATE USING (
    is_locked = FALSE
    AND (get_my_role() = 'admin' OR doctor_id = auth.uid())
  );

-- fotos_antes_despues
CREATE POLICY "fotos_select" ON fotos_antes_despues
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fotos_insert" ON fotos_antes_despues
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND consentimiento_imagen = TRUE
  );

CREATE POLICY "fotos_delete" ON fotos_antes_despues
  FOR DELETE USING (get_my_role() = 'admin');

-- audit_log
CREATE POLICY "audit_select_admin" ON audit_log
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- --------------------------------
-- 8. VISTA: Dashboard Stats
-- --------------------------------
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE DATE(fecha_hora_inicio AT TIME ZONE 'America/Lima') = CURRENT_DATE)                                           AS citas_hoy,
  COUNT(*) FILTER (WHERE estado = 'confirmada'  AND DATE(fecha_hora_inicio AT TIME ZONE 'America/Lima') = CURRENT_DATE)                AS confirmadas_hoy,
  COUNT(*) FILTER (WHERE estado = 'completada'  AND DATE(fecha_hora_inicio AT TIME ZONE 'America/Lima') = CURRENT_DATE)                AS completadas_hoy,
  COALESCE(SUM(precio_acordado) FILTER (WHERE estado_pago = 'pagado' AND DATE(fecha_hora_inicio AT TIME ZONE 'America/Lima') = CURRENT_DATE), 0) AS ingresos_hoy
FROM citas;

-- --------------------------------
-- 9. DATOS SEMILLA: Catálogo de Tratamientos
-- --------------------------------
INSERT INTO tratamientos_catalogo (nombre, codigo, categoria, duracion_minutos, precio_base, requiere_evaluacion_previa, descripcion) VALUES
  ('Hilos Delta Lifting®',           'HDL-001', 'hilos',     90,  NULL, TRUE,  'Tratamiento de hilos tensores para lifting facial sin cirugía'),
  ('Reshape Facial',                 'RSF-001', 'facial',    75,  NULL, TRUE,  'Remodelación y armonización de rasgos faciales'),
  ('Visage 3D',                      'V3D-001', 'facial',    60,  NULL, FALSE, 'Tratamiento volumizador tridimensional del rostro'),
  ('Evaluación Inicial',             'EVA-001', 'evaluacion',30,  NULL, FALSE, 'Consulta de evaluación y diagnóstico estético'),
  ('Limpieza Facial Profunda',       'LFP-001', 'facial',    60,  NULL, FALSE, 'Limpieza facial con extracción y tratamiento personalizado'),
  ('Bioestimulación Colágeno',       'BEC-001', 'facial',    45,  NULL, FALSE, 'Estimulación de la producción natural de colágeno'),
  ('Mesoterapia Facial',             'MES-001', 'facial',    45,  NULL, FALSE, 'Microinyecciones de nutrientes para rejuvenecimiento'),
  ('Plasma Rico en Plaquetas (PRP)', 'PRP-001', 'facial',    60,  NULL, TRUE,  'Tratamiento regenerativo con plasma autólogo'),
  ('Toxina Botulínica',              'BOT-001', 'facial',    30,  NULL, FALSE, 'Aplicación de neuromodulador para líneas de expresión'),
  ('Ácido Hialurónico - Labios',     'AHL-001', 'facial',    30,  NULL, FALSE, 'Relleno y definición de labios con ácido hialurónico'),
  ('Ácido Hialurónico - Surcos',     'AHS-001', 'facial',    30,  NULL, FALSE, 'Relleno de surcos nasogenianos y ojeras'),
  ('Peeling Químico',                'PEE-001', 'facial',    45,  NULL, FALSE, 'Exfoliación química controlada para renovación celular'),
  ('Láser Fraccionado',              'LAS-001', 'laser',     60,  NULL, TRUE,  'Tratamiento láser para cicatrices, manchas y rejuvenecimiento'),
  ('IPL Fotorejuvenecimiento',       'IPL-001', 'laser',     60,  NULL, TRUE,  'Luz pulsada intensa para manchas y rojeces'),
  ('Seguimiento Post-Tratamiento',   'SEG-001', 'evaluacion',20,  NULL, FALSE, 'Control y seguimiento de resultado de tratamientos')
ON CONFLICT (codigo) DO NOTHING;
