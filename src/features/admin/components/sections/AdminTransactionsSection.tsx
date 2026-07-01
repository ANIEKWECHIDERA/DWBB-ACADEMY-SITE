import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminFilterCombobox } from "@/features/admin/components/AdminFilterCombobox";
import { adminRanges } from "@/features/admin/constants";
import { cn } from "@/lib/utils";
import type { AdminRange } from "@/lib/admin-api";
import type { AdminTransaction } from "@/types/admin";
import { formatCurrencyFromKobo, formatDate, statusTone } from "@/features/admin/utils";

import { AdminPanel, EmptyState } from "../AdminPrimitives";

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
  setSelectedTransactions: (value: string[] | ((current: string[]) => string[])) => void;
  toggleSelection: (current: string[], value: string) => string[];
  transactions: AdminTransaction[];
}) {
  return (
    <AdminPanel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Transaction Ledger</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">Verified payment records</h3>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="w-full sm:w-56">
            <AdminFilterCombobox
              options={adminRanges.map((option) => ({ label: option.label, value: option.value }))}
              onChange={(value) => onRangeChange(value as AdminRange)}
              placeholder="Select time range"
              searchPlaceholder="Filter ranges..."
              value={range}
            />
          </div>
          <Button
            className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
            disabled={selectedTransactions.length === 0}
            onClick={() => onDeleteTransactions(selectedTransactions)}
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No transactions yet" description="Once payments are verified, transaction records will appear here." compact />
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                  onChange={(event) => setSelectedTransactions(event.target.checked ? transactions.map((item) => item.reference) : [])}
                  type="checkbox"
                />
                Select all
              </label>
              <span className="text-xs text-slate-500">{transactions.length} records</span>
            </div>

            {transactions.map((transaction) => (
              <div key={transaction.reference} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-start gap-3">
                    <input
                      checked={selectedTransactions.includes(transaction.reference)}
                      onChange={() => setSelectedTransactions((current) => toggleSelection(current, transaction.reference))}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{transaction.customerName}</p>
                      <p className="truncate text-xs text-slate-500">{transaction.customerEmail}</p>
                    </div>
                  </label>
                  <span className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", statusTone(transaction.status))}>
                    {transaction.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Course</p>
                    <p className="mt-1 font-medium text-slate-900">{transaction.courseTitle}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Gross</p>
                      <p className="mt-1 font-medium text-slate-900">{formatCurrencyFromKobo(transaction.chargedAmountKobo)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Net</p>
                      <p className="mt-1 font-medium text-slate-900">{formatCurrencyFromKobo(transaction.coursePriceKobo)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Paid At</p>
                    <p className="mt-1 font-medium text-slate-900">{formatDate(transaction.paidAt)}</p>
                  </div>
                </div>

                <Button className="mt-4 w-full rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0" onClick={() => onDeleteTransactions([transaction.reference])} variant="ghost">
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
                    <input
                      checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                      onChange={(event) => setSelectedTransactions(event.target.checked ? transactions.map((item) => item.reference) : [])}
                      type="checkbox"
                    />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.reference}>
                    <TableCell>
                      <input
                        checked={selectedTransactions.includes(transaction.reference)}
                        onChange={() => setSelectedTransactions((current) => toggleSelection(current, transaction.reference))}
                        type="checkbox"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-950">{transaction.customerName}</p>
                        <p className="text-xs text-slate-500">{transaction.customerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.courseTitle}</TableCell>
                    <TableCell>{formatCurrencyFromKobo(transaction.chargedAmountKobo)}</TableCell>
                    <TableCell>{formatCurrencyFromKobo(transaction.coursePriceKobo)}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", statusTone(transaction.status))}>
                        {transaction.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(transaction.paidAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0" onClick={() => onDeleteTransactions([transaction.reference])} variant="ghost">
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </AdminPanel>
  );
}
