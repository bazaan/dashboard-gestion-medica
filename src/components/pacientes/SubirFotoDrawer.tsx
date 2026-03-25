"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImagePlus, CheckCircle2, Loader2, Camera, Trash2 } from "lucide-react";
import { useUploadFoto } from "@/lib/hooks/useFotos";

interface Props {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNombre: string;
}

type TipoFoto = "antes" | "despues" | "seguimiento";
type AnguloFoto = "frontal" | "lateral_izq" | "lateral_der" | "superior" | "otro";

const TIPOS: { value: TipoFoto; label: string; color: string; desc: string }[] = [
  { value: "antes", label: "Antes", color: "border-blue-300 bg-blue-50 text-blue-700", desc: "Estado inicial del paciente" },
  { value: "despues", label: "Después", color: "border-emerald-300 bg-emerald-50 text-emerald-700", desc: "Resultado post-tratamiento" },
  { value: "seguimiento", label: "Seguimiento", color: "border-amber-300 bg-amber-50 text-amber-700", desc: "Control de evolución" },
];

const ANGULOS: { value: AnguloFoto; label: string }[] = [
  { value: "frontal", label: "Frontal" },
  { value: "lateral_izq", label: "Lateral Izq." },
  { value: "lateral_der", label: "Lateral Der." },
  { value: "superior", label: "Superior" },
  { value: "otro", label: "Otro" },
];

interface FilePreview { file: File; preview: string; }

export function SubirFotoDrawer({ open, onClose, pacienteId, pacienteNombre }: Props) {
  const [tipo, setTipo] = useState<TipoFoto>("antes");
  const [angulo, setAngulo] = useState<AnguloFoto>("frontal");
  const [zona, setZona] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaFoto, setFechaFoto] = useState(new Date().toISOString().split("T")[0]);
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);

  const { mutateAsync: uploadFoto, isPending } = useUploadFoto();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPreviews = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
  });

  function removePreview(index: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function resetForm() {
    previews.forEach((p) => URL.revokeObjectURL(p.preview));
    setPreviews([]);
    setTipo("antes");
    setAngulo("frontal");
    setZona("");
    setDescripcion("");
    setFechaFoto(new Date().toISOString().split("T")[0]);
    setUploadedCount(0);
  }

  async function handleUpload() {
    if (previews.length === 0) return;
    let count = 0;
    for (const { file } of previews) {
      await uploadFoto({ pacienteId, file, tipo, angulo, zona, descripcion, fecha_foto: fechaFoto });
      count++;
      setUploadedCount(count);
    }
    resetForm();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg h-full bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
          <div>
            <p className="label-elegant mb-0.5">Registro Fotográfico</p>
            <h3 className="font-serif text-lg font-semibold text-foreground">Subir Fotografías</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{pacienteNombre}</p>
          </div>
          <button onClick={() => { resetForm(); onClose(); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

          {/* Tipo de foto */}
          <div>
            <p className="text-xs font-semibold text-accent/70 uppercase tracking-wider mb-3">Tipo de Fotografía <span className="text-primary">*</span></p>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    tipo === t.value ? t.color + " border-2 shadow-sm" : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs mt-0.5 opacity-70 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <p className="text-xs font-semibold text-accent/70 uppercase tracking-wider mb-3">
              Fotografías <span className="text-primary">*</span>
              <span className="text-muted-foreground font-normal normal-case tracking-normal ml-1">(máx. 10 fotos · 10MB c/u)</span>
            </p>
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {isDragActive ? <ImagePlus className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isDragActive ? "Suelta las fotos aquí" : "Arrastra las fotos o haz clic"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, HEIC</p>
                </div>
              </div>
            </div>

            {/* Previews grid */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previews.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                    <button
                      onClick={() => removePreview(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className={`absolute bottom-1.5 left-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      tipo === "antes" ? "bg-blue-500 text-white" : tipo === "despues" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    }`}>
                      {tipo === "antes" ? "A" : tipo === "despues" ? "D" : "S"}
                    </div>
                  </div>
                ))}
                {previews.length < 10 && (
                  <div {...getRootProps()} className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
                    <input {...getInputProps()} />
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detalles */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-accent/70 uppercase tracking-wider">Detalles</p>

            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-accent/70 uppercase tracking-wider">Fecha de la Fotografía</label>
              <input type="date" value={fechaFoto} onChange={(e) => setFechaFoto(e.target.value)} className="input-premium" />
            </div>

            {/* Ángulo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-accent/70 uppercase tracking-wider">Ángulo</label>
              <div className="flex flex-wrap gap-2">
                {ANGULOS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAngulo(a.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      angulo === a.value
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zona */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-accent/70 uppercase tracking-wider">Zona Tratada</label>
              <input
                type="text"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej: Tercio superior, zona periocular, labios..."
                className="input-premium"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-accent/70 uppercase tracking-wider">Notas / Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Observaciones del tratamiento, contexto de la foto..."
                className="input-premium resize-none"
              />
            </div>
          </div>

          {/* Aviso de privacidad */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
            <div className="flex gap-3">
              <Camera className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed">
                Las fotografías se almacenan de forma <strong>cifrada y privada</strong>. Solo el personal autorizado de la clínica puede acceder a ellas mediante enlaces firmados con expiración de 1 hora.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-border bg-background shrink-0 flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {previews.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {previews.length} foto{previews.length > 1 ? "s" : ""} lista{previews.length > 1 ? "s" : ""}
              </span>
            ) : (
              "Sin fotos seleccionadas"
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { resetForm(); onClose(); }} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={isPending || previews.length === 0}
              className="btn-primary min-w-36"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Subiendo {uploadedCount}/{previews.length}...</>
              ) : (
                <><Upload className="w-4 h-4" />Subir {previews.length > 0 ? `${previews.length} foto${previews.length > 1 ? "s" : ""}` : "Fotos"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
