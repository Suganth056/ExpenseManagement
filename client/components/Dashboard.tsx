"use client";
// npm i recharts
import { useEffect, useMemo, useState, ReactNode } from "react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/context/AuthContext";

type Rec = {
  id: number; date: string; type: "Income" | "Expense";
  amount: number; expense_type: string | null; remarks: string | null;
};
type User = { email: string; name?: string; picture?: string };

// All calls go through the Next.js proxy (app/api/[...path]/route.ts), which
// reads the httpOnly session cookie on the server and forwards it to FastAPI
// as a Bearer token. The browser never talks to the backend domain directly.
const API = "/api/add-expense";
const CATS = ["food", "rent", "clothes", "house", "travel","food-outside", "health","Mobile Recharge","Own Expenses","others"];
const COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#10b981", "#0ea5e9", "#94a3b8", "#f43f5e", "#8b5cf6", "#f97316", "#eab308"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const inr = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

// The "[&_*]:outline-none" removes the focus outline/border Recharts draws
// around the chart (svg, sectors, bars) when you click on it.
const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
    <h2 className="mb-3 text-sm font-semibold text-slate-600">{title}</h2>
    <div className="h-64 select-none [&_*]:outline-none">{children}</div>
  </section>
);

const Empty = () => (
  <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>
);

function MonthBars({ data, color }: { data: { name: string; v: number }[]; color: string }) {
  if (!data.some((d) => d.v)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} accessibilityLayer={false}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(v) => inr(Number(v))} />
        <Bar dataKey="v" name="Amount" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut chart of expenses by category (used for both the year and the month view).
// Amounts are drawn next to each slice by default, no hover needed.
function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  // Every category's amount is shown in the legend, so slice labels are only
  // drawn for slices big enough (>= 5%) to avoid overlapping text.
  const amounts = Object.fromEntries(data.map((x) => [x.name, x.value]));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart accessibilityLayer={false}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
          label={({ x, y, value, percent, textAnchor }:any) =>
            percent >= 0.05 ? (
              <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fontSize={11} fontWeight={600} fill="#334155">
                {inr(Number(value))}
              </text>
            ) : null
          }
          labelLine={false}
        >
          {data.map((p) => <Cell key={p.name} fill={COLORS[CATS.indexOf(p.name)]} />)}
        </Pie>
        <Tooltip formatter={(v) => inr(Number(v))} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => `${v} · ${inr(amounts[String(v)] ?? 0)}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EntryForm({ init, onClose, onSaved }: { init: Partial<Rec>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    id: init.id ?? 0,
    type: init.type ?? "Expense",
    date: init.date ?? today(),
    amount: String(init.amount ?? ""),
    expense_type: init.expense_type ?? "food",
    remarks: init.remarks ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(f.id ? `${API}/${f.id}` : API, {
        method: f.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: f.date, type: f.type, amount: Number(f.amount),
          expense_type: f.type === "Expense" ? f.expense_type : null,
          remarks: f.remarks || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail ?? body?.error ?? "Could not save the entry.");
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={f.id ? "Edit entry" : "Add entry"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
          {["Income", "Expense"].map((t) => (
            <button type="button" key={t} onClick={() => set("type", t)}
              className={`rounded-md py-2 ${f.type === t ? (t === "Income" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "text-slate-600"}`}>
              {t}
            </button>
          ))}
        </div>
        <input type="date" required className={input} value={f.date} onChange={(e) => set("date", e.target.value)} />
        <input type="number" required min="0" step="0.01" placeholder="Amount" className={input}
          value={f.amount} onChange={(e) => set("amount", e.target.value)} />
        {f.type === "Expense" && (
          <select className={`${input} capitalize`} value={f.expense_type} onChange={(e) => set("expense_type", e.target.value)}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
        <textarea rows={2} placeholder="Remarks" className={input} value={f.remarks} onChange={(e) => set("remarks", e.target.value)} />
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl ${wide ? "max-w-4xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Dashboard({ user }: { user: User }) {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const now = new Date();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  // Text shown in the year input; `year` only updates once it is a valid 4-digit year.
  const [yearText, setYearText] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(now.getMonth());
  const [form, setForm] = useState<Partial<Rec> | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [search, setSearch] = useState("");
  // True when the edit form was opened from the records list, so the list
  // can come back after the form is saved or cancelled.
  const [returnToRecords, setReturnToRecords] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      const response = await fetch(API);
      if (!response.ok) throw new Error("Could not load dashboard entries.");
      setRecs(await response.json());
      setLoadError("");
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Could not load dashboard entries.");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(API, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load dashboard entries.");
        return response.json();
      })
      .then((entries: Rec[]) => {
        setRecs(entries);
        setLoadError("");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(cause instanceof Error ? cause.message : "Could not load dashboard entries.");
        }
      });
    return () => controller.abort();
  }, []);

  const d = useMemo(() => {
    const inYear = recs.filter((r) => +r.date.slice(0, 4) === year);
    const inMonth = inYear.filter((r) => +r.date.slice(5, 7) - 1 === month);
    const m = MONTHS.map((name, i) => {
      const rows = inYear.filter((r) => +r.date.slice(5, 7) - 1 === i);
      const income = rows.filter((r) => r.type === "Income").reduce((s, r) => s + r.amount, 0);
      const expense = rows.filter((r) => r.type === "Expense").reduce((s, r) => s + r.amount, 0);
      return { name, income, expense, savings: income - expense };
    });
    const pieOf = (rows: Rec[]) =>
      CATS.map((c) => ({
        name: c,
        value: rows.filter((r) => r.type === "Expense" && (r.expense_type ?? "others") === c).reduce((s, r) => s + r.amount, 0),
      })).filter((x) => x.value > 0);
    const pie = pieOf(inYear);
    const pieMonth = pieOf(inMonth);
    const days = new Date(year, month + 1, 0).getDate();
    const daily = Array.from({ length: days }, (_, i) => ({
      name: String(i + 1),
      v: inMonth.filter((r) => r.type === "Expense" && +r.date.slice(8, 10) === i + 1)
        .reduce((s, r) => s + r.amount, 0),
    }));
    const income = recs.filter((r) => r.type === "Income").reduce((s, r) => s + r.amount, 0);
    const expense = recs.filter((r) => r.type === "Expense").reduce((s, r) => s + r.amount, 0);
    return { m, pie, pieMonth, daily, income, expense };
  }, [recs, year, month]);

  // Records for the selected month/year only; the search box filters within that month.
  const monthRecs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recs
      .filter((r) => +r.date.slice(0, 4) === year && +r.date.slice(5, 7) - 1 === month)
      .filter((r) =>
        !q ||
        [r.date, r.type, r.expense_type ?? "", r.remarks ?? "", String(r.amount)]
          .some((v) => v.toLowerCase().includes(q))
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [recs, year, month, search]);

  const stats = [
    // { label: "Total turnover", value: d.income + d.expense, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Income", value: d.income, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Expense", value: d.expense, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Savings", value: d.income - d.expense, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const sel = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  const onYearChange = (v: string) => {
    setYearText(v);
    if (/^\d{4}$/.test(v)) setYear(+v);
  };

  const closeRecords = () => {
    setShowRecords(false);
    setSearch("");
  };

  // Close the form; if it was opened from the records list, bring the list back.
  const closeForm = () => {
    setForm(null);
    if (returnToRecords) {
      setShowRecords(true);
      setReturnToRecords(false);
    }
  };

  // Edit from the records list: hide the list first so the form isn't covered.
  const startEdit = (r: Rec) => {
    setShowRecords(false);
    setReturnToRecords(true);
    setForm(r);
  };

  async function del(id: number) {
    if (!confirm("Delete this record?")) return;
    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete the entry.");
      await load();
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Could not delete the entry.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-indigo-600">💸 Expense Tracker</span>
            <nav className="hidden gap-4 text-sm font-medium sm:flex">
              <Link href="/" className="text-indigo-600">Dashboard</Link>
              {/* <Link href="/investment" className="text-slate-600 hover:text-indigo-600">Investment</Link> */}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* <Link href="/investment" className="text-sm font-medium text-slate-600 sm:hidden">Investment</Link> */}
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.picture
              ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full ring-2 ring-indigo-100" />
              : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">{user.name?.[0] ?? "U"}</div>}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
            >
              {loggingOut ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className=" space-y-4 p-2 sm:p-6">
        {/* Actions + filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setForm({ type: "Income" })} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">+ Add Income</button>
            <button onClick={() => setForm({ type: "Expense" })} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">+ Add Expense</button>
            <button onClick={() => setShowRecords(true)} className="rounded-lg border border-slate-300 bg-orange-200 px-4 py-2 text-sm font-semibold hover:bg-yellow-100">View Records</button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              placeholder="Year"
              aria-label="Year"
              className={`${sel} w-24`}
              value={yearText}
              onChange={(e) => onYearChange(e.target.value)}
              onBlur={() => { if (!/^\d{4}$/.test(yearText)) setYearText(String(year)); }}
            />
            <select className={sel} value={month} onChange={(e) => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
        {loadError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p>}

        {/* Row 1: stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 ring-1 ring-slate-200 ${s.bg} border-l-4 ${s.color}`}>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={`mt-1 text-xl font-bold sm:text-2xl ${s.color}`}>{inr(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Row 2: category pies (year + selected month) and monthly expense */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Card title={`Expense by category · ${year}`}>
            <CategoryPie data={d.pie} />
          </Card>
          <Card title={`Expense by category · ${MONTHS[month]} ${year}`}>
            <CategoryPie data={d.pieMonth} />
          </Card>
          <Card title={`Monthly expense · ${year}`}>
            <MonthBars data={d.m.map((x) => ({ name: x.name, v: x.expense }))} color="#f43f5e" />
          </Card>
        </div>

        {/* Row 3 */}
        <Card title={`Daily expense · ${MONTHS[month]} ${year}`}>
          <MonthBars data={d.daily} color="#6366f1" />
        </Card>

        {/* Row 4 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`Monthly income · ${year}`}>
            <MonthBars data={d.m.map((x) => ({ name: x.name, v: x.income }))} color="#10b981" />
          </Card>
          <Card title={`Monthly savings · ${year}`}>
            <MonthBars data={d.m.map((x) => ({ name: x.name, v: x.savings }))} color="#f59e0b" />
          </Card>
        </div>
      </main>

      {form && (
        <EntryForm
          init={form}
          onClose={closeForm}
          onSaved={() => { closeForm(); load(); }}
        />
      )}

      {showRecords && (
        <Modal title={`Records · ${MONTHS[month]} ${year}`} wide onClose={closeRecords}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <input
              type="search"
              autoFocus
              placeholder={`Search in ${MONTHS[month]} ${year} (category, remarks, amount…)`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <p className="text-xs text-slate-500">{monthRecs.length} record{monthRecs.length === 1 ? "" : "s"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr><th className="py-2">Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Remarks</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthRecs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{r.date}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.type === "Income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.type}</span></td>
                    <td className="capitalize">{r.expense_type ?? "—"}</td>
                    <td className="font-medium">{inr(r.amount)}</td>
                    <td className="max-w-[200px] truncate text-slate-500">{r.remarks}</td>
                    <td className="space-x-3 text-right">
                      <button onClick={() => startEdit(r)} className="font-medium text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => del(r.id)} className="font-medium text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {monthRecs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {search ? "No matching records this month" : "No records this month"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}