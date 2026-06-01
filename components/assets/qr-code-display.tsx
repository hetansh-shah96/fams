"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 128 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}
