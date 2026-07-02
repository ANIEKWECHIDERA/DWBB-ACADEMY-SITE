import { useEffect, useMemo, useState } from "react";
import { Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminFilterCombobox } from "@/features/admin/components/AdminFilterCombobox";
import { adminRanges } from "@/features/admin/constants";
import { cn } from "@/lib/utils";
import type { AdminRange } from "@/lib/admin-api";
import type { AdminTransaction } from "@/types/admin";
import {
  formatCurrencyFromKobo,
  formatDate,
  statusTone,
} from "@/features/admin/utils";

import { AdminPanel, ConfirmDialog, EmptyState, PaginationControls } from "../AdminPrimitives";

const PAGE_SIZE_OPTIONS = ["10", "20", "30", "50", "all"] as const;

type TransactionColumnKey = "customer" | "course" | "gross" | "net" | "status" | "paidAt";

const defaultVisibility: Record<TransactionColumnKey, boolean> = {
  customer: true,
  course: true,
  gross: true,
  net: true,
  status: true,
  paidAt: true,
};

function paginateItems<T>(items: T[], currentPage: number, pageSize: string) {
  if (pageSize === "all") {
    return items;
  }

  const size = Number(pageSize);
  const startIndex = (currentPage - 1) * size;
  return items.slice(startIndex, startIndex + size);
}

export function AdminTransactionsSection({
  onDeleteTransactions,
  onRangeChange,
  range,
  selectedTransactions,
  setSelectedTransactions,
  toggleSelection,
  transactions,
}: {
  onDeleteTransactions: (references: string[]) => Promise<void>;
  onRangeChange: (range: AdminRange) => void;
  range: AdminRange;
  selectedTransactions: string[];
  setSelectedTransactions: (
    value: string[] | ((current: string[]) => string[]),
  ) => void;
  toggleSelection: (current: string[], value: string) => string[]; 
  transactions: AdminTransaction[];
}) {
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [columnVisibility, setColumnVisibility] = useState(defaultVisibility);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const pageCount = useMemo(() => {
    if (transactions.length === 0) {
      return 0;
    }

    if (pageSize === "all") {
      return 1;
    }

    return Math.ceil(transactions.length / Number(pageSize));
  }, [pageSize, transactions.length]);

  const paginatedTransactions = useMemo(
    () => paginateItems(transactions, currentPage, pageSize),
    [currentPage, pageSize, transactions],
  );

  const allSelected = transactions.length > 0 && selectedTransactions.length === transactions.length;
  const someSelected = selectedTransactions.length > 0 && !allSelected;

  useEffect(() => {
    if (pageCount === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  return (
    <AdminPanel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-sm">
            Transaction Ledger
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
            Verified payment records
          </h3>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[15rem]">
          <AdminFilterCombobox
            options={adminRanges.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            onChange={(value) => onRangeChange(value as AdminRange)}
            placeholder="Select time range"
            searchPlaceholder="Filter ranges..."
            value={range}
          />

          <div className="flex items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-none hover:bg-slate-50 hover:translate-y-0 sm:text-sm" variant="ghost">
                  <Settings2 className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="shadow-none">
                <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {([
                  ["customer", "Customer"],
                  ["course", "Course"],
                  ["gross", "Gross"],
                  ["net", "Net"],
                  ["status", "Status"],
                  ["paidAt", "Paid At"],
                ] as Array<[TransactionColumnKey, string]>).map(([key, label]) => (
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility[key]}
                    key={key}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((current) => ({ ...current, [key]: checked === true }))
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {allSelected ? (
              <Button
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0 sm:text-sm"
                onClick={() => setPendingDelete(selectedTransactions)}
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
                Delete All Selected
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No transactions yet"
            description="Once payments are verified, transaction records will appear here."
            compact
          />
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-3 text-xs font-medium text-slate-700 sm:text-sm">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) =>
                    setSelectedTransactions(
                      checked === true ? transactions.map((item) => item.reference) : [],
                    )
                  }
                />
                Select all
              </label>
              <span className="text-xs text-slate-500">
                {transactions.length} records
              </span>
            </div>

            {paginatedTransactions.map((transaction) => (
              <div
                key={transaction.reference}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-start gap-3">
                    <Checkbox
                      checked={selectedTransactions.includes(transaction.reference)}
                      onCheckedChange={() =>
                        setSelectedTransactions((current) =>
                          toggleSelection(current, transaction.reference),
                        )
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {transaction.customerName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                        {transaction.customerEmail}
                      </p>
                    </div>
                  </label>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      statusTone(transaction.status),
                    )}
                  >
                    {transaction.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Course
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {transaction.courseTitle}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Gross
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {formatCurrencyFromKobo(transaction.chargedAmountKobo)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Net
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {formatCurrencyFromKobo(transaction.coursePriceKobo)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Paid At
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatDate(transaction.paidAt)}
                    </p>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
                  onClick={() => setPendingDelete([transaction.reference])}
                  variant="ghost"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) =>
                        setSelectedTransactions(
                          checked === true ? transactions.map((item) => item.reference) : [],
                        )
                      }
                    />
                  </TableHead>
                  {columnVisibility.customer ? <TableHead>Customer</TableHead> : null}
                  {columnVisibility.course ? <TableHead>Course</TableHead> : null}
                  {columnVisibility.gross ? <TableHead>Gross</TableHead> : null}
                  {columnVisibility.net ? <TableHead>Net</TableHead> : null}
                  {columnVisibility.status ? <TableHead>Status</TableHead> : null}
                  {columnVisibility.paidAt ? <TableHead>Paid At</TableHead> : null}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.reference}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.reference)}
                        onCheckedChange={() =>
                          setSelectedTransactions((current) =>
                            toggleSelection(current, transaction.reference),
                          )
                        }
                      />
                    </TableCell>
                    {columnVisibility.customer ? (
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {transaction.customerName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {transaction.customerEmail}
                          </p>
                        </div>
                      </TableCell>
                    ) : null}
                    {columnVisibility.course ? <TableCell>{transaction.courseTitle}</TableCell> : null}
                    {columnVisibility.gross ? (
                      <TableCell>
                        {formatCurrencyFromKobo(transaction.chargedAmountKobo)}
                      </TableCell>
                    ) : null}
                    {columnVisibility.net ? (
                      <TableCell>
                        {formatCurrencyFromKobo(transaction.coursePriceKobo)}
                      </TableCell>
                    ) : null}
                    {columnVisibility.status ? (
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                            statusTone(transaction.status),
                          )}
                        >
                          {transaction.status}
                        </span>
                      </TableCell>
                    ) : null}
                    {columnVisibility.paidAt ? <TableCell>{formatDate(transaction.paidAt)}</TableCell> : null}
                    <TableCell className="text-right">
                      <Button
                        className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
                        onClick={() => setPendingDelete([transaction.reference])}
                        variant="ghost"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4">
            <PaginationControls
              currentPage={currentPage}
              itemLabel="transactions"
              onPageChange={setCurrentPage}
              onPageSizeChange={(value) => {
                setPageSize(value as (typeof PAGE_SIZE_OPTIONS)[number]);
                setCurrentPage(1);
              }}
              pageCount={pageCount}
              pageSize={pageSize}
              totalCount={transactions.length}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        confirmLabel="Delete records"
        description={
          pendingDelete?.length === 1
            ? "This transaction record will be removed from the mirrored ledger."
            : `These ${pendingDelete?.length || 0} transaction records will be removed from the mirrored ledger.`
        }
        onConfirm={async () => {
          if (!pendingDelete?.length) {
            return;
          }

          await onDeleteTransactions(pendingDelete);
          setPendingDelete(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={Boolean(pendingDelete?.length)}
        title={pendingDelete?.length === 1 ? "Delete transaction?" : "Delete selected transactions?"}
      />
    </AdminPanel>
  );
}
