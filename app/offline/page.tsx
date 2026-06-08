import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
        <WifiOff className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">You&apos;re offline</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        FAMS couldn&apos;t reach the server. Check your connection and try again — pages you&apos;ve already visited may still be available.
      </p>
    </div>
  );
}
