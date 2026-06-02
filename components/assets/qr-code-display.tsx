"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  assetId: string;
  assetCode: string;
  size?: number;
}

export default function QRCodeDisplay({ assetId, assetCode, size = 128 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Encode full URL so phone cameras navigate directly to asset page
    const url = `${window.location.origin}/assets/${assetId}`;
    QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 1 });
  }, [assetId, size]);

  return <canvas ref={canvasRef} title={assetCode} />;
}
