import { useEffect, useRef, useState } from "react";

/**
 * Reveals an image the way a progressive JPEG arrived over a modem: a blocky
 * first scan, then successively finer ones, then the real thing.
 *
 * It is deliberate theatre, not a network effect — the file is already in
 * cache by the time this runs. Each pass draws the decoded image downscaled
 * and then blown back up with smoothing off, which is what a DC-only scan
 * actually looked like: one value per block.
 *
 * Without JS the plain <img> renders as usual; with reduced motion the passes
 * are skipped.
 */
const PASSES = [
  { scale: 1 / 64, blur: 5, hold: 420 },
  { scale: 1 / 32, blur: 4, hold: 340 },
  { scale: 1 / 16, blur: 3, hold: 300 },
  { scale: 1 / 8, blur: 2, hold: 280 },
  { scale: 1 / 4, blur: 1, hold: 260 },
  { scale: 1 / 2, blur: 0, hold: 240 },
];

export function ProgressiveImage({
  src,
  width,
  height,
  alt,
  className,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const scan = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Backing store at half the source: enough detail for the last pass,
      // half the pixels to push six times.
      canvas.width = Math.round(width / 2);
      canvas.height = Math.round(height / 2);
      setScanning(true);

      let i = 0;

      const draw = () => {
        if (cancelled) return;
        const pass = PASSES[i];
        if (!pass) {
          setScanning(false);
          return;
        }
        const w = Math.max(2, Math.round(width * pass.scale));
        const h = Math.max(2, Math.round(height * pass.scale));

        const small = document.createElement("canvas");
        small.width = w;
        small.height = h;
        const sctx = small.getContext("2d");
        if (!sctx) return;
        sctx.imageSmoothingEnabled = true;
        sctx.drawImage(img, 0, 0, w, h);

        ctx.filter = pass.blur ? `blur(${pass.blur}px)` : "none";
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(small, 0, 0, canvas.width, canvas.height);

        i += 1;
        setProgress(i / PASSES.length);
        timer = setTimeout(draw, pass.hold);
      };

      draw();
    };

    if (img.complete && img.naturalWidth) scan();
    else img.addEventListener("load", scan, { once: true });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      img.removeEventListener("load", scan);
    };
  }, [width, height]);

  return (
    <div className="relative">
      <img
        ref={imgRef}
        src={src}
        width={width}
        height={height}
        alt={alt}
        className={`${className ?? ""} ${
          scanning ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`absolute inset-0 h-full w-full ${
          scanning ? "block" : "hidden"
        }`}
      />
      {scanning && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/40">
          <div
            className="h-full bg-mint transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
