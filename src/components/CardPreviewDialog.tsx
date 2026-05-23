import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, LucideIcon } from "lucide-react";

interface CardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  maxWidthClass?: string;
}

/**
 * Modal de vista previa (solo lectura) reutilizable para tarjetas.
 * Mantiene el estilo corporativo con header en gradiente primario.
 */
export default function CardPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon = Eye,
  children,
  maxWidthClass = "max-w-3xl",
}: CardPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidthClass} w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col`}>
        <DialogHeader className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
            <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
              <Icon className="h-4 w-4" />
            </div>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-primary-foreground/80 ml-[42px] text-xs">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
