"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorCtor = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

/** EAN-8/EAN-13/UPC-A check digit. Other lengths pass through. */
function checksumOk(code: string): boolean {
  if (![8, 12, 13].includes(code.length)) return true;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const doneRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopZxing: (() => void) | null = null;
    let cancelled = false;

    const finish = (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (doneRef.current || code.length < 6 || !checksumOk(code)) return;
      doneRef.current = true;
      navigator.vibrate?.(80);
      onDetectedRef.current(code);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        const supported = Native ? await Native.getSupportedFormats?.().catch(() => []) : [];
        if (Native && supported && supported.some((f) => FORMATS.includes(f))) {
          const detector = new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
          let busy = false;
          timer = setInterval(async () => {
            if (busy || video.readyState < 2) return;
            busy = true;
            try {
              const codes = await detector.detect(video);
              if (codes[0]) finish(codes[0].rawValue);
            } catch {
              /* frame not ready */
            } finally {
              busy = false;
            }
          }, 180);
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) finish(result.getText());
          });
          stopZxing = () => controls.stop();
        }
      } catch (e) {
        const name = (e as Error)?.name;
        setError(
          name === "NotAllowedError"
            ? "Kamera izni verilmedi. Tarayıcı ayarlarından kameraya izin ver."
            : "Kamera açılamadı. Barkodu aşağıya elle yazabilirsin.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stopZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="font-medium">Barkodu çerçeveye hizala</span>
        <button onClick={onClose} className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium">Kapat</button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-40 w-[80%] max-w-sm rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        {error && <p className="absolute inset-x-4 top-4 rounded-xl bg-red-600/90 p-3 text-sm">{error}</p>}
      </div>
      <form
        className="flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onDetected(manual.replace(/\D/g, ""));
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          inputMode="numeric"
          placeholder="veya barkod numarasını yaz"
          className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-3 placeholder:text-white/50"
        />
        <button className="rounded-xl bg-white px-4 py-3 font-medium text-black">Ara</button>
      </form>
    </div>
  );
}
