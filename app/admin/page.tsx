"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentMonth, formatDateTime, formatLong } from "@/lib/calendar";

type Reservation = {
  id: number;
  date: string;
  name: string;
  personnel_number: string;
  created_at: string;
};

type MonthSetting = {
  month: string;
  mode: "open" | "closed" | "scheduled";
  open_at: string | null;
  close_at: string | null;
};

type AdminData = {
  reservations: Reservation[];
  blocked: { date: string; reason: string }[];
  holidays: { date: string; name: string }[];
  monthSettings: MonthSetting[];
  limit: number;
  holidayLimit: number;
  today: string;
};

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(
    null
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: string, msg: string) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (res.ok) {
      setData(await res.json());
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function login() {
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword("");
      loadData();
    } else {
      const json = await res.json().catch(() => ({}));
      setLoginError(json.error || "Login failed.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setData(null);
  }

  if (authed === null) {
    return <div className="spinner-line">Loading…</div>;
  }

  if (!authed) {
    return (
      <>
        <div className="page-intro">
          <h1>Admin sign in</h1>
          <p>Enter the admin password to manage shifts.</p>
        </div>
        <div className="card" style={{ maxWidth: 380, margin: "0 auto" }}>
          <div className="field">
            <label htmlFor="a-pw">Password</label>
            <input
              id="a-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              autoFocus
            />
          </div>
          {loginError && (
            <p className="muted-note" style={{ color: "var(--danger)" }}>
              {loginError}
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={login}
            disabled={!password}
          >
            Sign in
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-intro">
        <h1>Admin dashboard</h1>
        <p>Manage limits, reservation windows, holidays, and bookings.</p>
      </div>
      <div className="stack">
        <SettingsCard data={data} reload={loadData} toast={showToast} />
        <MonthOpeningCard data={data} reload={loadData} toast={showToast} />
        <HolidaysCard data={data} reload={loadData} toast={showToast} />
        <BlockedCard data={data} reload={loadData} toast={showToast} />
        <ReservationsCard data={data} reload={loadData} toast={showToast} />
        <div style={{ textAlign: "center" }}>
          <button className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

type CardProps = {
  data: AdminData | null;
  reload: () => void;
  toast: (type: string, msg: string) => void;
};

function SettingsCard({ data, reload, toast }: CardProps) {
  const [limit, setLimit] = useState("");
  const [holidayLimit, setHolidayLimit] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setLimit(String(data.limit));
      setHolidayLimit(String(data.holidayLimit));
    }
  }, [data]);

  async function save() {
    setBusy(true);
    const payload: Record<string, unknown> = {
      perPersonLimit: Number(limit),
      holidayLimit: Number(holidayLimit),
    };
    if (pw.trim()) payload.adminPassword = pw.trim();
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setPw("");
      toast("success", "Settings saved.");
      reload();
    } else {
      toast("error", json.error || "Could not save settings.");
    }
  }

  return (
    <div className="card">
      <div className="section-title">Limits &amp; password</div>
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="s-limit">Max days per person / month</label>
          <input
            id="s-limit"
            type="number"
            min={1}
            max={31}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="s-hlimit">Max holidays per person / month</label>
          <input
            id="s-hlimit"
            type="number"
            min={0}
            max={31}
            value={holidayLimit}
            onChange={(e) => setHolidayLimit(e.target.value)}
          />
        </div>
      </div>
      <p className="muted-note" style={{ marginBottom: 14 }}>
        Holidays count toward the day limit — e.g. 3 days total, of which at most
        1 may be a holiday.
      </p>
      <div className="field">
        <label htmlFor="s-pw">Change admin password (optional)</label>
        <input
          id="s-pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Leave blank to keep current"
        />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function MonthOpeningCard({ data, reload, toast }: CardProps) {
  const [month, setMonth] = useState(currentMonth());
  const [mode, setMode] = useState<"open" | "closed" | "scheduled">("closed");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");

  async function save() {
    if (!month) {
      toast("error", "Pick a month.");
      return;
    }
    const res = await fetch("/api/admin/month", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        mode,
        openAt: mode === "scheduled" ? (openAt || null) : null,
        closeAt: mode === "scheduled" ? (closeAt || null) : null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      toast("success", "Reservation window updated.");
      reload();
    } else {
      toast("error", json.error || "Could not save.");
    }
  }

  async function reset(m: string) {
    const res = await fetch("/api/admin/month", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: m }),
    });
    if (res.ok) {
      toast("success", "Month reset to default (closed).");
      reload();
    } else {
      toast("error", "Could not reset month.");
    }
  }

  const settings = data?.monthSettings ?? [];

  return (
    <div className="card">
      <div className="section-title">Reservation window</div>
      <p className="muted-note" style={{ marginBottom: 14 }}>
        Control when each month is open for booking. Months not listed here are
        closed by default.
      </p>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="field">
          <label htmlFor="mo-month">Month</label>
          <input
            id="mo-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="mo-mode">Status</label>
          <select
            id="mo-mode"
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "open" | "closed" | "scheduled")
            }
          >
            <option value="closed">Closed</option>
            <option value="open">Open now</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>
      {mode === "scheduled" && (
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="field">
            <label htmlFor="mo-open-at">Opens at (optional)</label>
            <input
              id="mo-open-at"
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="mo-close-at">Closes at (optional)</label>
            <input
              id="mo-close-at"
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
            />
          </div>
        </div>
      )}
      <button className="btn btn-primary" onClick={save}>
        Save window
      </button>

      {settings.length > 0 && (
        <table className="data-table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.month}>
                <td>{monthName(s.month)}</td>
                <td>
                  {s.mode === "open" && (
                    <span className="status-pill open">Open</span>
                  )}
                  {s.mode === "closed" && (
                    <span className="status-pill closed">Closed</span>
                  )}
                  {s.mode === "scheduled" && (
                    <span className="status-pill scheduled">
                      {s.open_at && `Opens ${formatDateTime(s.open_at)}`}
                      {s.open_at && s.close_at && " · "}
                      {s.close_at && `Closes ${formatDateTime(s.close_at)}`}
                      {!s.open_at && !s.close_at && "Scheduled"}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => reset(s.month)}
                  >
                    Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HolidaysCard({ data, reload, toast }: CardProps) {
  const [syncing, setSyncing] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");

  async function sync() {
    setSyncing(true);
    const res = await fetch("/api/admin/holidays/sync", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);
    if (res.ok) {
      toast("success", `Synced ${json.count} Thai public holidays.`);
      reload();
    } else {
      toast("error", json.error || "Sync failed.");
    }
  }

  async function add() {
    if (!date) return;
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, name }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setDate("");
      setName("");
      toast("success", "Holiday added.");
      reload();
    } else {
      toast("error", json.error || "Could not add holiday.");
    }
  }

  async function remove(d: string) {
    const res = await fetch("/api/admin/holidays", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: d }),
    });
    if (res.ok) {
      toast("success", "Holiday removed.");
      reload();
    } else {
      toast("error", "Could not remove holiday.");
    }
  }

  const all = data?.holidays ?? [];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const upcoming = all.filter((h) => h.date >= yearStart);

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="section-title" style={{ marginBottom: 0 }}>
          Public holidays ({all.length})
        </div>
        <button className="btn btn-ghost" onClick={sync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync Thai holidays"}
        </button>
      </div>
      <p className="muted-note" style={{ marginBottom: 14 }}>
        Pulled from Google Calendar&apos;s Thailand holiday feed. Holidays are
        reservable but capped per person.
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="h-date">Add a holiday</label>
          <input
            id="h-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="h-name">Name</label>
          <input
            id="h-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Company anniversary"
            maxLength={60}
          />
        </div>
        <button className="btn btn-primary" onClick={add} disabled={!date}>
          Add
        </button>
      </div>
      {upcoming.length === 0 ? (
        <div className="empty-state">
          No holidays yet — click “Sync Thai holidays”.
        </div>
      ) : (
        <div className="scroll-box">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {upcoming.map((h) => (
                <tr key={h.date}>
                  <td>{formatLong(h.date)}</td>
                  <td>{h.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => remove(h.date)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BlockedCard({ data, reload, toast }: CardProps) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  async function add() {
    if (!date) return;
    const res = await fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setDate("");
      setReason("");
      toast("success", "Day blocked.");
      reload();
    } else {
      toast("error", json.error || "Could not block that day.");
    }
  }

  async function remove(d: string) {
    const res = await fetch("/api/admin/blocked", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: d }),
    });
    if (res.ok) {
      toast("success", "Day unblocked.");
      reload();
    } else {
      toast("error", "Could not unblock that day.");
    }
  }

  return (
    <div className="card">
      <div className="section-title">Blocked days</div>
      <p className="muted-note" style={{ marginBottom: 14 }}>
        Blocked days cannot be reserved at all (non-shift days, closures).
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="b-date">Date</label>
          <input
            id="b-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="b-reason">Reason</label>
          <input
            id="b-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Office closed"
            maxLength={40}
          />
        </div>
        <button className="btn btn-primary" onClick={add} disabled={!date}>
          Block
        </button>
      </div>
      {!data || data.blocked.length === 0 ? (
        <div className="empty-state">No blocked days.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reason</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.blocked.map((b) => (
              <tr key={b.date}>
                <td>{formatLong(b.date)}</td>
                <td>{b.reason || "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => remove(b.date)}
                  >
                    Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReservationsCard({ data, reload, toast }: CardProps) {
  async function del(date: string, name: string) {
    if (!confirm(`Remove ${name}'s reservation for ${formatLong(date)}?`))
      return;
    const res = await fetch("/api/admin/reservations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (res.ok) {
      toast("success", "Reservation removed.");
      reload();
    } else {
      toast("error", "Could not remove reservation.");
    }
  }

  const rows = data?.reservations ?? [];

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div className="section-title" style={{ marginBottom: 0 }}>
          All reservations ({rows.length})
        </div>
        <a className="btn btn-ghost" href="/api/admin/export">
          Export Excel
        </a>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">No reservations yet.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Personnel #</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatLong(r.date)}</td>
                <td>{r.name}</td>
                <td>{r.personnel_number}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => del(r.date, r.name)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
