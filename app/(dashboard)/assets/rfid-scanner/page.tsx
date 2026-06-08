"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio, ArrowLeft, CheckCircle2, XCircle, Trash2 } from "lucide-react";

const HUMAN_TYPING_GAP_MS = 500;

interface ScanResult {
  tag: string;
  assetId: string | null;
  assetCode: string | null;
  name: string | null;
  scannedAt: Date;
}

export default function RFIDScannerPage() {
  const [active, setActive] = useState(false);
  const [buffer, setBuffer] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTime = useRef(0);
  const lineRef = useRef("");

  async function lookupTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/assets?search=${encodeURIComponent(trimmed)}`);
      const data = res.ok ? await res.json() : { assets: [] };
      const match = data.assets?.[0];
      setResults((prev) => [
        { tag: trimmed, assetId: match?.id ?? null, assetCode: match?.assetCode ?? null, name: match?.name ?? null, scannedAt: new Date() },
        ...prev,
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();
    const gap = now - lastKeyTime.current;
    lastKeyTime.current = now;

    if (e.key === "Enter") {
      e.preventDefault();
      const tag = lineRef.current;
      lineRef.current = "";
      setBuffer("");
      if (tag) lookupTag(tag);
      return;
    }

    if (e.key.length === 1) {
      // RFID readers emit characters in rapid succession; a long gap means human typing
      if (gap > HUMAN_TYPING_GAP_MS) lineRef.current = "";
      lineRef.current += e.key;
      setBuffer(lineRef.current);
    }
  }

  function startScanning() {
    setActive(true);
    lineRef.current = "";
    setBuffer("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function stopScanning() {
    setActive(false);
    inputRef.current?.blur();
  }

  function clearResults() {
    setResults([]);
  }

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  const found = results.filter((r) => r.assetId).length;
  const notFound = results.length - found;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/assets"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFID Scanner</h1>
          <p className="text-sm text-gray-500">Bulk-scan RFID-tagged assets during audits using a USB/Bluetooth HID reader</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Radio className="w-4 h-4 text-orange-500" />Reader Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Connect a keyboard-wedge RFID reader, click &quot;Start Scanning&quot;, then scan tags one after another — each scan is looked up automatically.
          </p>
          <Input
            ref={inputRef}
            value={buffer}
            readOnly
            placeholder={active ? "Waiting for scan…" : "Click Start Scanning to begin"}
            onKeyDown={handleKeyDown}
            className="font-mono"
          />
          <div className="flex gap-2">
            {!active ? (
              <Button onClick={startScanning} className="bg-orange-500 hover:bg-orange-600">
                <Radio className="w-4 h-4 mr-2" />Start Scanning
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline">Stop Scanning</Button>
            )}
            {results.length > 0 && (
              <Button onClick={clearResults} variant="outline" className="text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />Clear ({results.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Scan Results</span>
            {results.length > 0 && (
              <span className="text-xs font-normal text-gray-500">
                {results.length} scanned · <span className="text-green-600 font-medium">{found} matched</span> · <span className="text-red-500 font-medium">{notFound} not found</span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No scans yet{busy ? " — looking up…" : ""}</p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {results.map((r, i) => (
                <div key={`${r.tag}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border bg-gray-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.assetId ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500 truncate">{r.tag}</p>
                      {r.assetId ? (
                        <Link href={`/assets/${r.assetId}`} className="text-sm text-blue-700 hover:underline font-medium truncate block">
                          {r.assetCode} — {r.name}
                        </Link>
                      ) : (
                        <p className="text-sm text-red-500">No matching asset</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{r.scannedAt.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
