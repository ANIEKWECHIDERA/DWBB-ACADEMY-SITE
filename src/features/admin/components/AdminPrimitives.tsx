import { Activity } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function AdminPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("rounded-lg border-slate-200 p-4 shadow-none sm:p-5 lg:p-6", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

export function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm font-semibold text-slate-950 sm:text-base">{label}</span>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
    </label>
  );
}

export function MetricCard({ icon: Icon, label, value, compact = false }: { icon: typeof Activity; label: string; value: string; compact?: boolean }) {
  return (
    <AdminPanel>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-sm">{label}</p>
        <Icon className="h-5 w-5 text-brand-gold" />
      </div>
      <p className={cn("mt-4 font-bold text-slate-950", compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl")}>{value}</p>
    </AdminPanel>
  );
}

export function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <AdminPanel className={cn("border-dashed text-center", compact ? "bg-slate-50" : "bg-white")}>
      <p className="text-base font-semibold text-slate-950 sm:text-xl">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500 sm:leading-7">{description}</p>
    </AdminPanel>
  );
}

export function ConfirmDialog({
  confirmLabel = "Continue",
  description,
  onConfirm,
  open,
  onOpenChange,
  title,
}: {
  confirmLabel?: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="shadow-none">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PaginationControls({
  currentPage,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageCount,
  pageSize,
  totalCount,
}: {
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: string) => void;
  pageCount: number;
  pageSize: string;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500 sm:text-sm">
        {totalCount} {itemLabel}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 sm:text-sm">Rows</span>
          <Select className="h-10 rounded-lg py-2 text-xs shadow-none sm:text-sm" onChange={(event) => onPageSizeChange(event.target.value)} value={pageSize}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="all">All</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            type="button"
          >
            Previous
          </button>
          <span className="min-w-20 text-center text-xs font-medium text-slate-500 sm:text-sm">
            Page {pageCount === 0 ? 0 : currentPage} of {pageCount}
          </span>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
