import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md relative">

      {/* Decorative background orbs */}
      <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Branding */}
      <div className="flex justify-center mb-10 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://qzmgizrvdukyxvpgclvd.supabase.co/storage/v1/object/public/CLINICADENNISSE/firma-logo.png"
          alt="Clínica Dra. Dennisse Arroyo"
          className="w-64 object-contain"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Decorative gold top strip */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

        <div className="mb-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Acceso al Sistema
          </h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            Restringido al personal autorizado de la clínica
          </p>
        </div>

        <LoginForm />
      </div>

      {/* Footer */}
      <p className="text-center text-white/20 text-xs mt-8 tracking-wide">
        © {new Date().getFullYear()} · Clínica Dra. Dennisse Arroyo · Sistema de Gestión Médica
      </p>
    </div>
  );
}
