import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminCustomer } from "@/types/admin";
import { formatCurrencyFromKobo, formatDate } from "@/features/admin/utils";

import { AdminPanel, EmptyState } from "../AdminPrimitives";

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
  setSelectedCustomers: (value: string[] | ((current: string[]) => string[])) => void;
  toggleSelection: (current: string[], value: string) => string[];
}) {
  return (
    <AdminPanel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Customers</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">Customer records mirrored from verified payments</h3>
        </div>
        <Button
          className="rounded-xl border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
          disabled={selectedCustomers.length === 0}
          onClick={() => onDeleteCustomers(selectedCustomers)}
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No customers yet" description="Customer records will appear after verified purchases are mirrored into Firestore." compact />
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
                  onChange={(event) => setSelectedCustomers(event.target.checked ? customers.map((item) => item.email) : [])}
                  type="checkbox"
                />
                Select all
              </label>
              <span className="text-xs text-slate-500">{customers.length} customers</span>
            </div>

            {customers.map((customer) => (
              <div key={customer.email} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <input checked={selectedCustomers.includes(customer.email)} onChange={() => setSelectedCustomers((current) => toggleSelection(current, customer.email))} type="checkbox" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-950">{customer.name}</p>
                    <p className="truncate text-xs text-slate-500">{customer.email}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Transactions</p>
                      <p className="mt-1 font-medium text-slate-900">{customer.totalTransactions}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Net Inflow</p>
                      <p className="mt-1 font-medium text-slate-900">{formatCurrencyFromKobo(customer.totalNetKobo)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Last Purchase</p>
                    <p className="mt-1 font-medium text-slate-900">{formatDate(customer.lastPurchaseAt)}</p>
                  </div>
                </div>

                <Button className="mt-4 w-full rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0" onClick={() => onDeleteCustomers([customer.email])} variant="ghost">
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
                      checked={selectedCustomers.length === customers.length && customers.length > 0}
                      onChange={(event) => setSelectedCustomers(event.target.checked ? customers.map((item) => item.email) : [])}
                      type="checkbox"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Net Inflow</TableHead>
                  <TableHead>Last Purchase</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.email}>
                    <TableCell>
                      <input checked={selectedCustomers.includes(customer.email)} onChange={() => setSelectedCustomers((current) => toggleSelection(current, customer.email))} type="checkbox" />
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.totalTransactions}</TableCell>
                    <TableCell>{formatCurrencyFromKobo(customer.totalNetKobo)}</TableCell>
                    <TableCell>{formatDate(customer.lastPurchaseAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0" onClick={() => onDeleteCustomers([customer.email])} variant="ghost">
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
