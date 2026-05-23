import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Link as LinkIcon, Upload, X, Clipboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  aspect?: "square" | "portrait";
  emptyHint?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

export default function EppImageInput({ value, onChange, bucket = "epp-images", aspect = "square", emptyHint }: Props) {
  const BUCKET = bucket;
  const [urlInput, setUrlInput] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setUrlInput(value || ""); }, [value]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen excede 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      setUploading(false);
      toast.error("Error al subir: " + error.message);
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Imagen cargada");
  }, [onChange]);

  // Paste anywhere on the dropzone
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            return;
          }
        }
      }
    };
    el.addEventListener("paste", handler);
    return () => el.removeEventListener("paste", handler);
  }, [uploadFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          await uploadFile(new File([blob], `pasted.${imgType.split("/")[1]}`, { type: imgType }));
          return;
        }
      }
      toast.error("No hay imagen en el portapapeles");
    } catch {
      toast.error("Permiso denegado para acceder al portapapeles");
    }
  };

  const applyUrl = () => {
    const v = urlInput.trim();
    if (!v) { onChange(""); return; }
    onChange(v);
    toast.success("URL aplicada");
  };

  const clear = () => { onChange(""); setUrlInput(""); };

  return (
    <div className="space-y-3">
      {/* Preview / Dropzone — vertical, large */}
      <div
        ref={dropRef}
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors outline-none focus:ring-2 focus:ring-ring overflow-hidden",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        )}
      >
        {value ? (
          <div className={cn("w-full bg-background", aspect === "square" ? "aspect-square" : "aspect-[3/4]")}>
            <img
              src={value}
              alt="Vista previa"
              className="h-full w-full object-contain"
              onError={() => toast.error("No se pudo cargar la imagen")}
            />
          </div>
        ) : (
          <div className={cn("w-full flex items-center justify-center p-6", aspect === "square" ? "aspect-square" : "aspect-[3/4]")}>
            <div className="text-center space-y-2">
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Subiendo imagen…</p>
                </>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-medium">{emptyHint ?? "Arrastra una imagen aquí"}</p>
                  <p className="text-xs text-muted-foreground">
                    o pega con <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+V</kbd>
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* URL + acciones discretas debajo de la imagen */}
      {value && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground break-all line-clamp-2 leading-snug">{value}</p>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3 mr-1" /> Reemplazar
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={clear}>
              <X className="h-3 w-3 mr-1" /> Quitar
            </Button>
          </div>
        </div>
      )}

      {/* Source tabs */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1" />Subir</TabsTrigger>
          <TabsTrigger value="paste"><Clipboard className="h-3.5 w-3.5 mr-1" />Pegar</TabsTrigger>
          <TabsTrigger value="url"><LinkIcon className="h-3.5 w-3.5 mr-1" />URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="pt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Subiendo…" : "Seleccionar archivo (máx. 5MB)"}
          </Button>
        </TabsContent>

        <TabsContent value="paste" className="pt-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={pasteFromClipboard}
          >
            <Clipboard className="h-4 w-4 mr-2" /> Pegar desde el portapapeles
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Tip: copia una imagen y presiona Ctrl+V sobre el área de arriba.
          </p>
        </TabsContent>

        <TabsContent value="url" className="pt-3 flex gap-2">
          <Input
            placeholder="https://…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
          />
          <Button type="button" variant="secondary" onClick={applyUrl}>Aplicar</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
