import { useState, FormEvent, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/livigui-logo-full.png";
import authBg from "@/assets/auth-bg.jpg";

export default function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";

  useEffect(() => {
    document.title = "Iniciar sesión · Livigui Kardex EPP";
  }, []);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast({
        title: "No se pudo iniciar sesión",
        description:
          error.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Bienvenido", description: "Sesión iniciada correctamente." });
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative">
        {/* Soft decorative gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-subtle pointer-events-none"
        />
        <div className="w-full max-w-md relative animate-fade-in">
          <div className="mb-10 flex justify-center lg:justify-start">
            <img
              src={logoFull}
              alt="Livigui - soluciones rápidas y duraderas"
              className="h-20 w-auto object-contain drop-shadow-sm"
            />
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary font-semibold mb-2">
              Kardex EPP
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
              Bienvenido de nuevo
            </h1>
            <p className="text-muted-foreground">
              Ingresa con tu cuenta corporativa para continuar.
            </p>
          </div>

          <Card className="p-6 sm:p-8 border-border/50 shadow-lg bg-card/95 backdrop-blur-sm animate-scale-in">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Correo electrónico
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@livigui.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11 transition-base"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Contraseña
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-11 transition-base"
                    required
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-gradient-primary hover:opacity-95 shadow-md hover:shadow-lg transition-base"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </Card>

          <div className="mt-6 flex items-center justify-center lg:justify-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
            <span>Acceso restringido al personal autorizado de Livigui.</span>
          </div>
        </div>
      </div>

      {/* Right: Visual panel */}
      <div className="hidden lg:block relative overflow-hidden bg-gradient-hero">
        <img
          src={authBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-accent/60" />

        {/* Decorative pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 35%, hsl(0 0% 100%) 1.5px, transparent 1.5px), radial-gradient(circle at 75% 65%, hsl(0 0% 100%) 1px, transparent 1px)",
            backgroundSize: "48px 48px, 32px 32px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-secondary/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl"
        />

        <div className="relative h-full flex flex-col justify-end p-12 text-primary-foreground">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              Sistema corporativo
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4 max-w-md">
              Gestión segura de Equipos de Protección Personal.
            </h2>
            <p className="text-primary-foreground/90 max-w-md text-lg leading-relaxed">
              Controla entregas, devoluciones y vigencias de EPP de todo tu personal en un solo lugar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
