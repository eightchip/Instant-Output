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

interface MessageDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  variant?: "default" | "success" | "error" | "warning";
  onRetry?: () => void;
}

export default function MessageDialog({
  isOpen,
  title,
  message,
  onClose,
  variant = "default",
  onRetry,
}: MessageDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          {onRetry && (
            <Button
              onClick={() => {
                onRetry();
                onClose();
              }}
              variant="default"
            >
              再試行
            </Button>
          )}
          <Button onClick={onClose} variant={variant === "error" ? "destructive" : "default"}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

