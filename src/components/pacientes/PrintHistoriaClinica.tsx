"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { HistoriaClinica, Paciente } from "@/types/database.types";
import { TIPO_PIEL_LABELS, FITZPATRICK_LABELS } from "./HistoriaClinicaForm";

type EvolucionConProcs = {
  id: string;
  fecha_atencion: string;
  motivo_consulta: string;
  signos_sintomas: string | null;
  examen_fisico: string | null;
  fur: string | null;
  ram: string | null;
  antecedentes: string | null;
  examenes_auxiliares: string | null;
  medicacion: string | null;
  diagnostico: string | null;
  procedimiento: string;
  productos_usados: string[];
  zona_tratada: string[];
  observaciones: string | null;
  recomendaciones: string | null;
  proxima_sesion_sugerida: string | null;
  is_locked: boolean;
  procedimientos_consulta?: Array<{
    id: string;
    tratamiento_id: string;
    tratamientos_catalogo: { nombre: string; categoria: string } | null;
  }>;
};

interface PrintHistoriaClinicaProps {
  paciente: Paciente;
  historia: HistoriaClinica;
  evoluciones: EvolucionConProcs[];
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="print-field">
      <span className="print-field-label">{label}:</span>{" "}
      <span className="print-field-value">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-section">
      <h3 className="print-section-title">{title}</h3>
      <div className="print-section-content">{children}</div>
    </div>
  );
}

export const PrintHistoriaClinica = forwardRef<HTMLDivElement, PrintHistoriaClinicaProps>(
  function PrintHistoriaClinica({ paciente, historia, evoluciones }, ref) {
    const edad = paciente.fecha_nacimiento
      ? Math.floor((Date.now() - new Date(paciente.fecha_nacimiento).getTime()) / (365.25 * 86400000))
      : null;

    return (
      <div ref={ref} className="print-container">
        {/* Header */}
        <div className="print-header">
          <div className="print-header-left">
            <h1 className="print-clinic-name">Dra. Dennisse Arroyo</h1>
            <p className="print-clinic-sub">Dermatología Estética</p>
          </div>
          <div className="print-header-right">
            <p className="print-hc-number">{historia.numero}</p>
            <p className="print-date">Impreso: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          </div>
        </div>

        <div className="print-divider-gold" />

        <h2 className="print-title">HISTORIA CLÍNICA</h2>

        {/* Datos del paciente */}
        <Section title="Datos del Paciente">
          <div className="print-grid-2">
            <Field label="Nombres" value={`${paciente.nombres} ${paciente.apellidos}`} />
            <Field label="DNI" value={paciente.dni} />
            <Field label="Fecha de Nacimiento" value={
              paciente.fecha_nacimiento
                ? `${format(new Date(paciente.fecha_nacimiento), "dd/MM/yyyy")}${edad ? ` (${edad} años)` : ""}`
                : undefined
            } />
            <Field label="Sexo" value={
              paciente.sexo === "F" ? "Femenino" : paciente.sexo === "M" ? "Masculino" : paciente.sexo ? "Otro" : undefined
            } />
            <Field label="Teléfono" value={paciente.telefono} />
            <Field label="Email" value={paciente.email} />
            <Field label="Dirección" value={paciente.direccion} />
            <Field label="Distrito / Ciudad" value={[paciente.distrito, paciente.ciudad].filter(Boolean).join(", ") || undefined} />
            <Field label="Ocupación" value={paciente.ocupacion} />
            <Field label="Estado Civil" value={paciente.estado_civil} />
            <Field label="Religión" value={paciente.religion} />
            <Field label="Grado de Instrucción" value={paciente.grado_instruccion} />
            <Field label="Procedencia" value={paciente.procedencia} />
            <Field label="Grupo Sanguíneo" value={paciente.grupo_sanguineo} />
          </div>
          {paciente.alergias && paciente.alergias.length > 0 && (
            <Field label="Alergias" value={paciente.alergias.join(", ")} />
          )}
          <Field label="Antecedentes Médicos" value={paciente.antecedentes_medicos} />
          <Field label="Medicamentos Actuales" value={paciente.medicamentos_actuales} />
        </Section>

        {/* Historia Base */}
        <Section title="Historia Clínica Base">
          <Field label="Motivo de Consulta Inicial" value={historia.motivo_consulta_inicial} />
          {(historia.tipo_piel || historia.fototipo_fitzpatrick) && (
            <div className="print-grid-2">
              <Field label="Tipo de Piel" value={historia.tipo_piel ? (TIPO_PIEL_LABELS[historia.tipo_piel] ?? historia.tipo_piel) : undefined} />
              <Field label="Fototipo Fitzpatrick" value={
                historia.fototipo_fitzpatrick
                  ? `Tipo ${historia.fototipo_fitzpatrick} — ${FITZPATRICK_LABELS[historia.fototipo_fitzpatrick] ?? ""}`
                  : undefined
              } />
            </div>
          )}
          <Field label="Antecedentes Estéticos" value={historia.antecedentes_esteticos} />
          <Field label="Expectativas del Paciente" value={historia.expectativas_paciente} />
          {historia.condiciones_piel && historia.condiciones_piel.length > 0 && (
            <Field label="Condiciones de Piel" value={historia.condiciones_piel.join(", ")} />
          )}
        </Section>

        {/* Signos Vitales */}
        {(historia.fc || historia.fr || historia.pa || historia.imc || historia.rq || historia.asa) && (
          <Section title="Signos Vitales">
            <div className="print-grid-3">
              <Field label="FC" value={historia.fc} />
              <Field label="FR" value={historia.fr} />
              <Field label="PA" value={historia.pa} />
              <Field label="IMC" value={historia.imc} />
              <Field label="RQ" value={historia.rq} />
              <Field label="ASA" value={historia.asa} />
            </div>
          </Section>
        )}

        {/* Anamnesis */}
        {historia.tiempo_enfermedad && (
          <Section title="Anamnesis">
            <Field label="Tiempo de Enfermedad" value={historia.tiempo_enfermedad} />
          </Section>
        )}

        {/* Antecedentes Fisiológicos */}
        {(historia.gestacion_g || historia.gestacion_p || historia.menarquia || historia.fur_historia ||
          historia.peso_kg || historia.talla || historia.apetito || historia.sed ||
          historia.alcohol || historia.tabaco || historia.drogas) && (
          <Section title="Antecedentes Fisiológicos">
            <div className="print-grid-2">
              {(historia.gestacion_g || historia.gestacion_p) && (
                <Field label="Gestación" value={`G${historia.gestacion_g || "—"} P${historia.gestacion_p || "—"}`} />
              )}
              <Field label="Menarquía" value={historia.menarquia} />
              <Field label="FUR" value={historia.fur_historia} />
              <Field label="RC" value={historia.rc} />
              <Field label="Peso" value={historia.peso_kg ? `${historia.peso_kg} kg` : undefined} />
              <Field label="Talla" value={historia.talla} />
              <Field label="Apetito" value={historia.apetito} />
              <Field label="Sed" value={historia.sed} />
              <Field label="Diuresis" value={historia.diuresis} />
              <Field label="Deposiciones" value={historia.deposiciones} />
              <Field label="Sueño" value={historia.sueno} />
              <Field label="Última Ingesta" value={historia.ultima_ingesta} />
            </div>
            {(historia.alcohol || historia.tabaco || historia.drogas) && (
              <div className="print-field">
                <span className="print-field-label">Hábitos:</span>{" "}
                <span className="print-field-value">
                  {[
                    historia.alcohol && "Alcohol",
                    historia.tabaco && "Tabaco",
                    historia.drogas && "Drogas",
                  ].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </Section>
        )}

        {/* Antecedentes Patológicos */}
        {(historia.ant_patologicos?.length > 0 || historia.ant_patologicos_otros) && (
          <Section title="Antecedentes Patológicos">
            <Field label="Patológicos" value={
              [...(historia.ant_patologicos || []), historia.ant_patologicos_otros].filter(Boolean).join(", ")
            } />
          </Section>
        )}

        {/* Alergias Medicamentosas */}
        {(historia.alergias_medicamentos?.length > 0 || historia.alergias_med_otros) && (
          <Section title="Alergias Medicamentosas">
            <Field label="Alergias" value={
              [...(historia.alergias_medicamentos || []), historia.alergias_med_otros].filter(Boolean).join(", ")
            } />
          </Section>
        )}

        {/* Fármacos */}
        {(historia.farmacos_lista?.length > 0 || historia.farmacos_otros) && (
          <Section title="Fármacos Actuales">
            <Field label="Fármacos" value={
              [...(historia.farmacos_lista || []), historia.farmacos_otros].filter(Boolean).join(", ")
            } />
          </Section>
        )}

        {/* Quirúrgicos y Familiares */}
        {(historia.ant_quirurgicos || historia.ant_familiares) && (
          <Section title="Otros Antecedentes">
            <Field label="Antecedentes Quirúrgicos" value={historia.ant_quirurgicos} />
            <Field label="Antecedentes Familiares" value={historia.ant_familiares} />
          </Section>
        )}

        {/* Evoluciones */}
        {evoluciones.length > 0 && (
          <>
            <div className="print-divider-gold" />
            <h2 className="print-title">EVOLUCIONES CLÍNICAS ({evoluciones.length})</h2>

            {evoluciones.map((ev, i) => {
              const procs = (ev.procedimientos_consulta ?? [])
                .filter(p => p.tratamientos_catalogo)
                .map(p => p.tratamientos_catalogo!.nombre);

              return (
                <div key={ev.id} className="print-evolucion">
                  <div className="print-evolucion-header">
                    <span className="print-evolucion-number">#{evoluciones.length - i}</span>
                    <span className="print-evolucion-date">
                      {format(new Date(ev.fecha_atencion), "dd/MM/yyyy HH:mm")}
                    </span>
                    {ev.is_locked && <span className="print-evolucion-signed">Firmada</span>}
                  </div>

                  {procs.length > 0 && (
                    <Field label="Procedimientos del Catálogo" value={procs.join(", ")} />
                  )}
                  <Field label="Motivo de Consulta" value={ev.motivo_consulta} />
                  <Field label="Signos y Síntomas" value={ev.signos_sintomas} />
                  <Field label="Examen Físico" value={ev.examen_fisico} />
                  <Field label="FUR" value={ev.fur} />
                  <Field label="RAM" value={ev.ram} />
                  <Field label="Antecedentes" value={ev.antecedentes} />
                  <Field label="Exámenes Auxiliares" value={ev.examenes_auxiliares} />
                  <Field label="Medicación" value={ev.medicacion} />
                  <Field label="Diagnóstico" value={ev.diagnostico} />
                  {procs.length === 0 && <Field label="Procedimiento" value={ev.procedimiento} />}
                  {ev.productos_usados?.length > 0 && (
                    <Field label="Productos Utilizados" value={ev.productos_usados.join(", ")} />
                  )}
                  {ev.zona_tratada?.length > 0 && (
                    <Field label="Zona Tratada" value={ev.zona_tratada.join(", ")} />
                  )}
                  <Field label="Observaciones" value={ev.observaciones} />
                  <Field label="Recomendaciones" value={ev.recomendaciones} />
                  {ev.proxima_sesion_sugerida && (
                    <Field label="Próxima Sesión" value={format(new Date(ev.proxima_sesion_sugerida), "dd/MM/yyyy")} />
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Footer */}
        <div className="print-footer">
          <div className="print-footer-line" />
          <p>Dra. Dennisse Arroyo — Dermatología Estética</p>
          <p>Historia Clínica {historia.numero} — {paciente.nombres} {paciente.apellidos}</p>
        </div>
      </div>
    );
  }
);
