"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemLabel: string;
  entityType: string;
  deleting?: boolean;
  error?: string | null;
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, itemLabel, entityType, deleting, error }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !deleting) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete {entityType}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-gray-700">
            You are about to permanently delete <span className="font-semibold">{itemLabel}</span>.
            {" "}If other records are linked to it, deletion will be blocked and the reason will appear below.
          </p>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting || !!error}>
            {deleting ? "Deleting…" : "Yes, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
