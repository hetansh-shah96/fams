"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QRScannerPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);

  async function lookupAsset(code: string) {
    if (!code.trim()) return;
    setError("");
    // If the QR encodes a full URL (e.g. https://domain/assets/ID), navigate directly
    try {
      const url = new URL(code.trim());
      if (url.origin === window.location.origin) {
        router.push(url.pathname);
        return;
      }
    } catch {
      // Not a URL — fall through to asset code search
    }
    const res = await fetch(`/api/assets?search=${encodeURIComponent(code.trim())}`);
    if (!res.ok) { setError("Lookup failed — please try again"); return; }
    const data = await res.json();
    if (data.assets?.length > 0) {
      router.push(`/assets/${data.assets[0].id}`);
    } else {
      setError(`No asset found for: ${code}`);
    }
  }

  async function startScanner() {
    setScanning(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await scanner.stop();
          setScanning(false);
          await lookupAsset(decodedText);
        },
        undefined
      );
    } catch {
      setError("Camera access denied or not available");
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (html5QrRef.current) {
      try {
        await (html5QrRef.current as { stop: () => Promise<void> }).stop();
      } catch {}
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/assets"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
          <p className="text-sm text-gray-500">Scan an asset QR code to view details</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4 text-orange-500" />Camera Scanner</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div id="qr-reader" ref={scannerRef} className="w-full" />
          {!scanning ? (
            <Button onClick={startScanner} className="w-full bg-orange-500 hover:bg-orange-600">
              <QrCode className="w-4 h-4 mr-2" />Start Camera Scan
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" className="w-full">Stop Scanner</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4 text-gray-500" />Manual Lookup</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter asset code (e.g. FAM-IT-2024-0001)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupAsset(manualCode)}
            />
            <Button onClick={() => lookupAsset(manualCode)} className="bg-orange-500 hover:bg-orange-600">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
