interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}
export default function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="relative bg-gradient-hero text-primary-foreground overflow-hidden border-b border-primary/20">
      {/* Decorative subtle pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, hsl(0 0% 100%) 1px, transparent 1px), radial-gradient(circle at 80% 30%, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "32px 32px, 48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-secondary/20 blur-3xl"
      />
      <div className="relative px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-primary-foreground/80 mt-1.5 text-sm md:text-base max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
}
