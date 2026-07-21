import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  bulletPoints?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "destructive" | "default";
}

export function CustomAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  bulletPoints = [],
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
}: CustomAlertDialogProps) {
  const confirmButtonClass =
    variant === "destructive"
      ? "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full text-sm cursor-pointer"
      : "bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm cursor-pointer";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="lg:max-w-md p-5! bg-[#FFFFFF] dark:bg-[#222222]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-700 dark:text-gray-400 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {bulletPoints.length > 0 && (
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-400 -mt-1">
            {bulletPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <AlertDialogCancel className="px-3 py-1 rounded-full border text-sm cursor-pointer">
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
