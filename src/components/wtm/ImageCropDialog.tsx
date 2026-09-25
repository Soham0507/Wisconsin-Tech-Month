import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToBlob(src: string, area: Area, mime: string, outW: number, outH: number, transparent: boolean): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  // Prefer PNG when transparency matters (e.g. logos)
  const outMime = transparent || mime === "image/png" ? "image/png" : "image/jpeg";
  const quality = outMime === "image/jpeg" ? 0.9 : undefined;
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to export image"))), outMime, quality);
  });
}

export function ImageCropDialog({
  file,
  open,
  onCancel,
  onConfirm,
  aspect = 16 / 9,
  outWidth = 1600,
  outHeight = 900,
  title = "Crop your event image",
  hint,
  transparent = false,
}: {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob, ext: string) => void;
  aspect?: number;
  outWidth?: number;
  outHeight?: number;
  title?: string;
  hint?: string;
  transparent?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setSrc(null); return; }
    setErr(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    readFile(file).then(setSrc).catch(() => setErr("Couldn't read that image."));
  }, [file]);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const confirm = async () => {
    if (!src || !area || !file) return;
    setBusy(true);
    setErr(null);
    try {
      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await cropToBlob(src, area, mime, outWidth, outHeight, transparent);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      onConfirm(blob, ext);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Crop failed.");
    } finally {
      setBusy(false);
    }
  };

  const defaultHint = `Position and zoom to fill the frame. Uploaded image is ${outWidth}×${outHeight}.`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{hint ?? defaultHint}</p>
        <div className="relative mt-2 w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: String(aspect) }}>
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              minZoom={1}
              maxZoom={4}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.01}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </div>
        {err && <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={confirm} disabled={busy || !area}>
            {busy ? "Preparing…" : "Use this crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
