import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Maximize2, RotateCcw, Check, X, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle } from "lucide-react";

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
  unlock: () => void;
}

const INK_THRESHOLD = 200;
function cropToSquare(src: HTMLCanvasElement): string | null {
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width: w, height: h } = src;
  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
  const data = img.data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;
      const aN = a / 255;
      const r = data[i] * aN + 255 * (1 - aN);
      const g = data[i + 1] * aN + 255 * (1 - aN);
      const b = data[i + 2] * aN + 255 * (1 - aN);
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      if (lum < INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const size = Math.max(cw, ch);
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d")!;
  octx.clearRect(0, 0, size, size);
  const dx = Math.floor((size - cw) / 2);
  const dy = Math.floor((size - ch) / 2);
  octx.drawImage(src, minX, minY, cw, ch, dx, dy, cw, ch);
  return out.toDataURL("image/png");
}


interface Props {
  label: string;
  height?: number;
  initialDataUrl?: string | null;
  /** URL de imagen de firma validada para mostrar como modelo en modo ampliado */
  referenceImageUrl?: string | null;
  /** Nombre del trabajador (se muestra en el modelo y en el resultado) */
  referenceName?: string;
  /**
   * Callback opcional que ejecuta una validación al confirmar en modo ampliado.
   * Si retorna ok=false el diálogo permanece abierto para reintentar.
   */
  onConfirmValidate?: (
    dataUrl: string,
  ) => Promise<{ ok: boolean; score: number; threshold: number; message?: string }>;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ label, height = 180, initialDataUrl, referenceImageUrl, referenceName, onConfirmValidate }, ref) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const expandedSigRef = useRef<SignatureCanvas>(null);
  const [hasInk, setHasInk] = useState(false);
  const [locked, setLocked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [validationResult, setValidationResult] = useState<
    { ok: boolean; score: number; threshold: number; message?: string } | null
  >(null);
  const loadedKeyRef = useRef<string | null>(null);

  // Load initial signature when canvas is ready / when initialDataUrl changes
  useEffect(() => {
    if (!initialDataUrl || !sigRef.current) return;
    if (loadedKeyRef.current === initialDataUrl) return;
    const canvas = sigRef.current.getCanvas();
    const draw = () => {
      try {
        sigRef.current?.clear();
        sigRef.current?.fromDataURL(initialDataUrl, {
          width: canvas.width,
          height: canvas.height,
        });
        loadedKeyRef.current = initialDataUrl;
        setHasInk(true);
      } catch {
        /* ignore */
      }
    };
    const id = window.setTimeout(draw, 50);
    return () => window.clearTimeout(id);
  }, [initialDataUrl]);

  // Keep lock state synced with the underlying canvas
  useEffect(() => {
    if (locked) sigRef.current?.off();
    else sigRef.current?.on();
  }, [locked]);

  // Load snapshot into expanded canvas when opened
  useEffect(() => {
    if (!expanded) return;
    const id = window.setTimeout(() => {
      if (!expandedSigRef.current) return;
      const c = expandedSigRef.current.getCanvas();
      expandedSigRef.current.clear();
      const src = snapshot;
      if (src) {
        try {
          expandedSigRef.current.fromDataURL(src, { width: c.width, height: c.height });
        } catch {
          /* ignore */
        }
      }
      if (locked) expandedSigRef.current.off();
      else expandedSigRef.current.on();
    }, 80);
    return () => window.clearTimeout(id);
  }, [expanded, snapshot, locked]);

  const handleClear = () => {
    if (locked) return;
    sigRef.current?.clear();
    loadedKeyRef.current = null;
    setHasInk(false);
  };

  const handleExpand = () => {
    const data = sigRef.current && !sigRef.current.isEmpty()
      ? sigRef.current.getCanvas().toDataURL("image/png")
      : null;
    setSnapshot(data);
    setValidationResult(null);
    setExpanded(true);
  };

  const handleExpandedReset = () => {
    if (locked) return;
    expandedSigRef.current?.clear();
    setValidationResult(null);
  };

  const applyExpandedToMain = () => {
    if (!expandedSigRef.current || !sigRef.current) return;
    const isEmpty = expandedSigRef.current.isEmpty();
    if (isEmpty) {
      sigRef.current.clear();
      loadedKeyRef.current = null;
      setHasInk(false);
      if (locked) sigRef.current.off();
      return;
    }
    const srcCanvas = expandedSigRef.current.getCanvas();
    const mainCanvas = sigRef.current.getCanvas();
    // Fit the expanded canvas content into the main canvas preserving aspect ratio
    const off = document.createElement("canvas");
    off.width = mainCanvas.width;
    off.height = mainCanvas.height;
    const octx = off.getContext("2d")!;
    // Transparent background so the underlying signature pad styling shows through
    octx.clearRect(0, 0, off.width, off.height);
    const scale = Math.min(off.width / srcCanvas.width, off.height / srcCanvas.height);
    const dw = srcCanvas.width * scale;
    const dh = srcCanvas.height * scale;
    const dx = (off.width - dw) / 2;
    const dy = (off.height - dh) / 2;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, dx, dy, dw, dh);
    const data = off.toDataURL("image/png");
    sigRef.current.clear();
    try {
      // Pass matching dimensions so fromDataURL doesn't rescale
      sigRef.current.fromDataURL(data, { width: mainCanvas.width, height: mainCanvas.height });
      loadedKeyRef.current = data;
      setHasInk(true);
    } catch {
      /* ignore */
    }
    if (locked) sigRef.current.off();
    else sigRef.current.on();
  };

  const handleExpandedConfirm = async () => {
    if (onConfirmValidate) {
      if (!expandedSigRef.current || expandedSigRef.current.isEmpty()) {
        setValidationResult({ ok: false, score: 0, threshold: 0, message: "Firme antes de confirmar." });
        return;
      }
      const data = expandedSigRef.current.getCanvas().toDataURL("image/png");
      setValidating(true);
      setScanProgress(0);
      setValidationResult(null);
      const start = performance.now();
      const DURATION = 1800;
      let rafId = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const eased = 1 - Math.pow(1 - t, 3);
        setScanProgress(Math.min(92, eased * 92));
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      try {
        const [res] = await Promise.all([
          onConfirmValidate(data),
          new Promise<void>((r) => setTimeout(r, DURATION)),
        ]);
        cancelAnimationFrame(rafId);
        setScanProgress(100);
        await new Promise((r) => setTimeout(r, 250));
        setValidating(false);
        setScanProgress(0);
        setValidationResult(res);
      } catch (e: any) {
        cancelAnimationFrame(rafId);
        setValidating(false);
        setScanProgress(0);
        setValidationResult({ ok: false, score: 0, threshold: 0, message: e?.message ?? String(e) });
      }
      return;
    }
    applyExpandedToMain();
    setExpanded(false);
    setValidationResult(null);
    const hasContent = !sigRef.current?.isEmpty();
    if (hasContent) {
      setLocked(true);
      window.setTimeout(() => sigRef.current?.off(), 50);
    }
  };

  const handleResultAccept = () => {
    const wasOk = validationResult?.ok;
    setValidationResult(null);
    if (wasOk) {
      applyExpandedToMain();
      setExpanded(false);
      const hasContent = !sigRef.current?.isEmpty();
      if (hasContent) {
        setLocked(true);
        window.setTimeout(() => sigRef.current?.off(), 50);
      }
    }
  };

  const handleExpandedCancel = () => {
    setExpanded(false);
    setValidationResult(null);
  };

  const handleApprove = () => {
    if (sigRef.current?.isEmpty()) return;
    setLocked((v) => !v);
  };

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      if (!sigRef.current || sigRef.current.isEmpty()) return null;
      const src = sigRef.current.getCanvas();
      return cropToSquare(src) ?? src.toDataURL("image/png");
    },
    clear: () => {
      sigRef.current?.clear();
      loadedKeyRef.current = null;
      setHasInk(false);
      setLocked(false);
    },
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
    unlock: () => {
      setLocked(false);
      sigRef.current?.on();
    },
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExpand}
            className="h-7 px-2 text-xs"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1" /> Ampliar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={locked}
            className="h-7 px-2 text-xs"
          >
            <Eraser className="h-3.5 w-3.5 mr-1" /> Limpiar
          </Button>
          <Button
            type="button"
            variant={locked ? "default" : "ghost"}
            size="sm"
            onClick={handleApprove}
            className="h-7 px-2 text-xs"
            title={locked ? "Desbloquear firma" : "Aprobar firma (bloquear)"}
          >
            {locked ? (
              <>
                <Lock className="h-3.5 w-3.5 mr-1" /> Bloqueada
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Aprobar
              </>
            )}
          </Button>
        </div>
      </div>
      <div
        className={`rounded-lg border-2 border-dashed bg-muted/30 overflow-hidden ${
          locked ? "border-primary/50 bg-primary/5" : "border-border"
        }`}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="hsl(215 75% 22%)"
          onEnd={() => setHasInk(true)}
          canvasProps={{
            style: { width: "100%", height: `${height}px`, touchAction: "none" },
          }}
        />
      </div>
      {!hasInk && !locked && (
        <p className="text-xs text-muted-foreground mt-1">Firme con el dedo o lápiz táctil</p>
      )}
      {locked && (
        <p className="text-xs text-primary mt-1 flex items-center gap-1">
          <Lock className="h-3 w-3" /> Firma aprobada y bloqueada
        </p>
      )}

      <Dialog open={expanded} onOpenChange={(o) => !o && handleExpandedCancel()}>
        <DialogContent className="max-w-[100vw] w-screen h-screen sm:max-w-[100vw] sm:rounded-none p-0 gap-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-base font-semibold">{label} — Modo ampliado</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExpandedReset}
                disabled={locked}
                className="h-8"
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Restablecer
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleExpandedConfirm}
                disabled={validating}
                className="h-8"
              >
                <Check className="h-4 w-4 mr-1" /> {validating ? "Validando..." : "Confirmar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExpandedCancel}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4 bg-muted/20 min-h-0 flex flex-col gap-3">
            {referenceImageUrl && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Firma validada {referenceName ? `— ${referenceName}` : ""} (modelo)
                  </span>
                </div>
                <div className="flex-1 min-h-0 rounded-lg border-2 border-border bg-background overflow-hidden flex items-center justify-center">
                  <img
                    src={referenceImageUrl}
                    alt="Firma validada"
                    className="h-full w-auto max-w-none object-contain select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {referenceImageUrl ? "Firme aquí" : label}
                </span>
                {validationResult && (
                  <span
                    className={`text-xs font-semibold ${
                      validationResult.ok ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {referenceName ? `${referenceName}: ` : ""}
                    {validationResult.ok ? "Coincidencia válida" : "No coincide"}
                    {validationResult.threshold > 0 && (
                      <> · {(validationResult.score * 100).toFixed(0)}% / mín {(validationResult.threshold * 100).toFixed(0)}%</>
                    )}
                  </span>
                )}
              </div>
              <div className="relative flex-1 min-h-0 rounded-lg border-2 border-dashed border-border bg-background overflow-hidden">
                <SignatureCanvas
                  ref={expandedSigRef}
                  penColor="hsl(215 75% 22%)"
                  canvasProps={{
                    style: { width: "100%", height: "100%", touchAction: "none" },
                  }}
                />
                {validating && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Grid técnica */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          "linear-gradient(hsl(var(--primary) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.25) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />
                    {/* Línea de escaneo vertical */}
                    <div className="absolute inset-y-0 left-0 w-full overflow-hidden">
                      <div className="scanner-sweep absolute top-0 bottom-0 w-24 -left-24" />
                    </div>
                    {/* Esquinas estilo HUD */}
                    <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-primary" />
                    <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-primary" />
                    <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-primary" />
                    <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-primary" />
                    {/* Etiqueta */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.25em] text-primary bg-background/70 px-2 py-0.5 rounded">
                      Analizando trazos · {Math.round(scanProgress)}%
                    </div>
                  </div>
                )}
              </div>
              {validating && (
                <div className="mt-2 space-y-1">
                  <Progress value={scanProgress} className="h-2" />
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span>Reconocimiento biométrico</span>
                    <span className="text-primary">{Math.round(scanProgress)}%</span>
                  </div>
                </div>
              )}
              {validationResult && !validationResult.ok && validationResult.message && (
                <p className="text-xs text-destructive mt-1">{validationResult.message}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!validationResult && !validating} onOpenChange={(o) => !o && handleResultAccept()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {validationResult?.ok ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  Validación exitosa
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-destructive" />
                  Validación fallida
                </>
              )}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2">
                {referenceName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Trabajador: </span>
                    <span className="font-semibold text-foreground">{referenceName}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Resultado: </span>
                  <span className={`font-semibold ${validationResult?.ok ? "text-primary" : "text-destructive"}`}>
                    {validationResult?.ok ? "Coincidencia válida" : "No coincide"}
                  </span>
                </div>
                {validationResult && validationResult.threshold > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Coincidencia: </span>
                    <span className="font-mono font-semibold text-foreground">
                      {(validationResult.score * 100).toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground"> / mínimo </span>
                    <span className="font-mono text-foreground">
                      {(validationResult.threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {validationResult?.message && (
                  <p className="text-sm text-muted-foreground pt-1">{validationResult.message}</p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={handleResultAccept} className="w-full sm:w-auto">
              {validationResult?.ok ? "Aceptar y continuar" : "Reintentar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
SignaturePad.displayName = "SignaturePad";
