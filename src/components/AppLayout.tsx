import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, HardHat, ClipboardList, FileText, Settings, LogOut, Menu } from "lucide-react";
import logoWhite from "@/assets/livigui-logo-white.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { loadAreaSettings } from "@/hooks/useAreaSettings";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/trabajadores", icon: Users, label: "Trabajadores" },
  { to: "/epps", icon: HardHat, label: "Catálogo EPP" },
  { to: "/kardex", icon: ClipboardList, label: "Kardex" },
  { to: "/reportes", icon: FileText, label: "Reportes" },
  { to: "/ajustes", icon: Settings, label: "Ajustes" },
];

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { loadAreaSettings().catch(() => {}); }, []);
  const displayName = profile?.full_name ?? user?.email ?? "Usuario";
  const initials = (profile?.full_name ?? user?.email ?? "U")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background">
        <aside
          className={`hidden md:flex ${collapsed ? "w-16" : "w-64"} flex-col bg-sidebar text-sidebar-foreground shadow-xl relative transition-all duration-300 ease-in-out`}
        >
          {/* Subtle right-edge accent */}
          <div aria-hidden="true" className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-sidebar-primary/40 to-transparent" />

          {/* Toggle button */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border shadow-md flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Menu className="h-3.5 w-3.5" />
          </button>

          <div className={`flex flex-col items-center gap-2 border-b border-sidebar-border ${collapsed ? "p-3" : "p-5"}`}>
            <img
              src={logoWhite}
              alt="Livigui - soluciones rápidas y duraderas"
              className={`${collapsed ? "h-8" : "h-16"} w-auto object-contain transition-all duration-300`}
            />
            {!collapsed && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-sidebar-primary font-semibold">Kardex EPP</p>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {nav.map((n) => {
              const link = (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg text-sm font-medium transition-base ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-sidebar-primary transition-all duration-300 ${
                          isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
                        }`}
                      />
                      <n.icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"}`} />
                      {!collapsed && <span className="truncate">{n.label}</span>}
                    </>
                  )}
                </NavLink>
              );

              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3 space-y-2">
            <div className={`flex items-center gap-3 ${collapsed ? "justify-center px-0" : "px-2"} py-2 rounded-lg bg-sidebar-accent/40`}>
              <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30 shrink-0">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">{displayName}</p>
                  <p className="text-[11px] truncate text-sidebar-foreground/60">{profile?.cargo ?? profile?.area ?? user?.email}</p>
                </div>
              )}
            </div>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-base"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesión</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-base"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            )}
            {!collapsed && (
              <p className="text-[10px] text-sidebar-foreground/40 px-2 pt-1 text-center">v1.0 · Livigui Kardex</p>
            )}
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md text-sidebar-foreground border-t border-sidebar-border shadow-lg">
          <nav className="flex justify-around">
            {nav.slice(0, 5).map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 px-2 flex-1 text-[10px] transition-colors ${
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                  }`
                }
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="flex-1 min-w-0 pb-20 md:pb-0 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
