"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "danger";
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button onClick={onCancel} variant="outline">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant={variant === "danger" ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


