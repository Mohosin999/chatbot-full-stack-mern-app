import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
}: ConfirmDialogProps) {
  const confirmButtonClass =
    variant === "destructive"
      ? "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full text-sm cursor-pointer select-none active:scale-105"
      : "bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm cursor-pointer select-none active:scale-105";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="lg:max-w-md p-5! bg-[#FFFFFF] dark:bg-[#222222]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-700 dark:text-gray-400 mt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <AlertDialogCancel className="px-3 py-1 rounded-full border text-sm cursor-pointer select-none active:scale-105">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={confirmButtonClass}
          >
            {confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
