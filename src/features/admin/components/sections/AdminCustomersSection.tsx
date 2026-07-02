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
import type { AdminCustomer } from "@/types/admin";
import { formatCurrencyFromKobo, formatDate } from "@/features/admin/utils";

import { AdminPanel, ConfirmDialog, EmptyState, PaginationControls } from "../AdminPrimitives";

const PAGE_SIZE_OPTIONS = ["10", "20", "30", "50", "all"] as const;

type CustomerColumnKey = "name" | "email" | "transactions" | "net" | "lastPurchase";

const defaultVisibility: Record<CustomerColumnKey, boolean> = {
  name: true,
  email: true,
  transactions: true,
  net: true,
  lastPurchase: true,
};

function paginateItems<T>(items: T[], currentPage: number, pageSize: string) {
  if (pageSize === "all") {
    return items;
  }

  const size = Number(pageSize);
  const startIndex = (currentPage - 1) * size;
  return items.slice(startIndex, startIndex + size);
}

export function AdminCustomersSection({
  customers,
  onDeleteCustomers,
  selectedCustomers,
  setSelectedCustomers,
  toggleSelection,
}: {
  customers: AdminCustomer[];
  onDeleteCustomers: (emails: string[]) => Promise<void>;
  selectedCustomers: string[];
  setSelectedCustomers: (
    value: string[] | ((current: string[]) => string[]),
  ) => void;
  toggleSelection: (current: string[], value: string) => string[];
}) {
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [columnVisibility, setColumnVisibility] = useState(defaultVisibility);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const pageCount = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    if (pageSize === "all") {
      return 1;
    }

    return Math.ceil(customers.length / Number(pageSize));
  }, [customers.length, pageSize]);

  const paginatedCustomers = useMemo(
    () => paginateItems(customers, currentPage, pageSize),
    [currentPage, customers, pageSize],
  );

  const allSelected = customers.length > 0 && selectedCustomers.length === customers.length;
  const someSelected = selectedCustomers.length > 0 && !allSelected;

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
            Customers
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
            Customer records mirrored from verified payments
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
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
                ["name", "Name"],
                ["email", "Email"],
                ["transactions", "Transactions"],
                ["net", "Net Inflow"],
                ["lastPurchase", "Last Purchase"],
              ] as Array<[CustomerColumnKey, string]>).map(([key, label]) => (
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
              onClick={() => setPendingDelete(selectedCustomers)}
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
              Delete All Selected
            </Button>
          ) : null}
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No customers yet"
            description="Customer records will appear after verified purchases are mirrored into Firestore."
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
                    setSelectedCustomers(
                      checked === true ? customers.map((item) => item.email) : [],
                    )
                  }
                />
                Select all
              </label>
              <span className="text-xs text-slate-500">
                {customers.length} customers
              </span>
            </div>

            {paginatedCustomers.map((customer) => (
              <div
                key={customer.email}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedCustomers.includes(customer.email)}
                    onCheckedChange={() =>
                      setSelectedCustomers((current) =>
                        toggleSelection(current, customer.email),
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">
                      {customer.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                      {customer.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Transactions
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {customer.totalTransactions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Net Inflow
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {formatCurrencyFromKobo(customer.totalNetKobo)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Last Purchase
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatDate(customer.lastPurchaseAt)}
                    </p>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
                  onClick={() => setPendingDelete([customer.email])}
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
                        setSelectedCustomers(
                          checked === true ? customers.map((item) => item.email) : [],
                        )
                      }
                    />
                  </TableHead>
                  {columnVisibility.name ? <TableHead>Name</TableHead> : null}
                  {columnVisibility.email ? <TableHead>Email</TableHead> : null}
                  {columnVisibility.transactions ? <TableHead>Transactions</TableHead> : null}
                  {columnVisibility.net ? <TableHead>Net Inflow</TableHead> : null}
                  {columnVisibility.lastPurchase ? <TableHead>Last Purchase</TableHead> : null}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow key={customer.email}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.email)}
                        onCheckedChange={() =>
                          setSelectedCustomers((current) =>
                            toggleSelection(current, customer.email),
                          )
                        }
                      />
                    </TableCell>
                    {columnVisibility.name ? <TableCell>{customer.name}</TableCell> : null}
                    {columnVisibility.email ? <TableCell>{customer.email}</TableCell> : null}
                    {columnVisibility.transactions ? <TableCell>{customer.totalTransactions}</TableCell> : null}
                    {columnVisibility.net ? (
                      <TableCell>
                        {formatCurrencyFromKobo(customer.totalNetKobo)}
                      </TableCell>
                    ) : null}
                    {columnVisibility.lastPurchase ? <TableCell>{formatDate(customer.lastPurchaseAt)}</TableCell> : null}
                    <TableCell className="text-right">
                      <Button
                        className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
                        onClick={() => setPendingDelete([customer.email])}
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
              itemLabel="customers"
              onPageChange={setCurrentPage}
              onPageSizeChange={(value) => {
                setPageSize(value as (typeof PAGE_SIZE_OPTIONS)[number]);
                setCurrentPage(1);
              }}
              pageCount={pageCount}
              pageSize={pageSize}
              totalCount={customers.length}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        confirmLabel="Delete records"
        description={
          pendingDelete?.length === 1
            ? "This customer record will be removed from the mirrored customer directory."
            : `These ${pendingDelete?.length || 0} customer records will be removed from the mirrored customer directory.`
        }
        onConfirm={async () => {
          if (!pendingDelete?.length) {
            return;
          }

          await onDeleteCustomers(pendingDelete);
          setPendingDelete(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={Boolean(pendingDelete?.length)}
        title={pendingDelete?.length === 1 ? "Delete customer?" : "Delete selected customers?"}
      />
    </AdminPanel>
  );
}
