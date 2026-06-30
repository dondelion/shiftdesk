"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LavaLoader } from "./loaders";
import {
  WEEKDAYS,
  buildGrid,
  currentMonth,
  dayNum,
  formatDateTime,
  formatLong,
  monthLabel,
  shiftMonth,
} from "@/lib/calendar";

type Availability = {
  month: string;
  today: string;
  limit: number;
  holidayLimit: number;
  reservations: Record<string, string>;
  blocked: Record<string, string>;
  holidays: Record<string, string>;
  open: boolean;
  openMode: "default" | "open" | "closed" | "scheduled";
  openAt: string | null;
  closeAt: string | null;
};

type Status = "available" | "taken" | "blocked" | "past";

export default function Home() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Availability | null>(null);
  const monthOverridden = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(
    null
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: string, msg: string) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(async (m: string, silent = false) => {
    if (!silent) setData((d) => (d && d.month === m ? d : null));
    try {
      const res = await fetch(`/api/availability?month=${m}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json: Availability = await res.json();
      setData((cur) => (cur && cur.month !== json.month && silent ? cur : json));
    } catch {
      /* offline — keep showing last data */
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  // On first load, jump to whichever month is open or opening within 24h.
  useEffect(() => {
    if (monthOverridden.current) return;
    fetch("/api/active-month")
      .then((r) => r.json())
      .then((j: { month: string | null }) => {
        if (j.month && j.month !== currentMonth()) {
          monthOverridden.current = true;
          setMonth(j.month);
        }
      })
      .catch(() => {});
  }, []);

  // Live refresh so the grid stays current while several people book.
  useEffect(() => {
    const id = setInterval(() => load(month, true), 10000);
    return () => clearInterval(id);
  }, [month, load]);

  function statusOf(date: string): Status {
    if (!data) return "available";
    // Mon (1), Sat (6), Sun (0) are not shift days in this schedule.
    const [y, m, d] = date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0 || dow === 1 || dow === 6) return "blocked";
    if (date in data.blocked) return "blocked";
    if (date in data.reservations) return "taken";
    if (date < data.today) return "past";
    return "available";
  }

  const cells = buildGrid(month);

  return (
    <>
      <div className="page-intro">
        <h1>Cancer Shift — Reserve your day</h1>
        <p>
          Pick an open Tuesday–Friday below. One person per day — first come, first served.
        </p>
      </div>

      <div className="card">
        <div className="month-bar">
          <button
            className="icon-btn"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <div style={{ textAlign: "center" }}>
            <div className="month-title">{monthLabel(month)}</div>
            {data && (
              <div className="month-sub">
                Up to {data.limit} day{data.limit === 1 ? "" : "s"} per person
                {data.holidayLimit > 0 &&
                  ` · max ${data.holidayLimit} weekend/holiday`}
              </div>
            )}
          </div>
          <button
            className="icon-btn"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {data && !data.open && (
          <div className={`banner ${data.openAt ? "info" : "closed"}`}>
            {data.openAt
              ? `Reservations for ${monthLabel(month)} open on ${formatDateTime(data.openAt)}.`
              : `Reservations for ${monthLabel(month)} are closed.`}
          </div>
        )}
        {data && data.open && data.closeAt && (
          <div className="banner info">
            Reservations for {monthLabel(month)} close on {formatDateTime(data.closeAt)}.
          </div>
        )}

        <div className="weekday-row">
          {WEEKDAYS.map((w) => (
            <div key={w} className="weekday">
              {w}
            </div>
          ))}
        </div>

        {!data ? (
          <LavaLoader />
        ) : (
          <div className="day-grid">
            {cells.map((date, i) => {
              if (!date) return <div key={`e${i}`} className="day-cell empty" />;
              const status = statusOf(date);
              const holidayName = data.holidays[date];
              const isHol = !!holidayName;
              const reservable = status === "available" && data.open;
              const locked = status === "available" && !data.open;
              return (
                <button
                  key={date}
                  className={[
                    "day-cell",
                    status,
                    isHol ? "is-holiday" : "",
                    locked ? "locked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!reservable}
                  title={
                    status === "blocked"
                      ? data.blocked[date] || "Not available"
                      : status === "taken"
                        ? `Reserved by ${data.reservations[date]}`
                        : isHol
                          ? `${holidayName} — public holiday`
                          : undefined
                  }
                  onClick={() => reservable && setSelected(date)}
                >
                  {isHol && (
                    <span className="holiday-star" aria-hidden="true">
                      ★
                    </span>
                  )}
                  <span className="day-num">{dayNum(date)}</span>
                  <span className="day-icon">
                    {status === "available" && "○"}
                    {status === "taken" && "●"}
                    {status === "blocked" && "✕"}
                  </span>
                  {status === "taken" && (
                    <span className="day-label">
                      {data.reservations[date]}
                    </span>
                  )}
                  {status === "blocked" && (
                    <span className="day-label">
                      {data.blocked[date] || "Blocked"}
                    </span>
                  )}
                  {status === "available" && isHol && (
                    <span className="day-label">{holidayName}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="legend">
          <div className="legend-item">
            <span className="swatch available" /> Available
          </div>
          <div className="legend-item">
            <span className="swatch holiday" /> Holiday
          </div>
          <div className="legend-item">
            <span className="swatch taken" /> Taken
          </div>
          <div className="legend-item">
            <span className="swatch blocked" /> Not a shift day
          </div>
          <div className="legend-item">
            <span className="swatch past" /> Past
          </div>
        </div>
      </div>

      {selected && data && (
        <ReserveModal
          date={selected}
          holidayName={data.holidays[selected]}
          holidayLimit={data.holidayLimit}
          onClose={() => setSelected(null)}
          onDone={(type, msg) => {
            setSelected(null);
            showToast(type, msg);
            load(month, true);
          }}
          onConflict={(msg) => {
            setSelected(null);
            showToast("error", msg);
            load(month, true);
          }}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

function ReserveModal({
  date,
  holidayName,
  holidayLimit,
  onClose,
  onDone,
  onConflict,
}: {
  date: string;
  holidayName?: string;
  holidayLimit: number;
  onClose: () => void;
  onDone: (type: string, msg: string) => void;
  onConflict: (msg: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    setFirstName(localStorage.getItem("shift_first") || "");
    setLastName(localStorage.getItem("shift_last") || "");
    setPhone(localStorage.getItem("shift_phone") || "");
  }, []);

  async function submit() {
    if (submitting.current || !firstName.trim() || !lastName.trim() || !phone.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem("shift_first", firstName.trim());
        localStorage.setItem("shift_last", lastName.trim());
        localStorage.setItem("shift_phone", phone.trim());
        onDone("success", `Reserved ${formatLong(date)} — you're all set.`);
        return;
      }
      if (json.code === "TAKEN") {
        onConflict(json.error || "That day was just taken.");
        return;
      }
      setError(json.error || "Could not reserve that day.");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  const canSubmit = firstName.trim() && lastName.trim() && phone.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          Reserve <span className="modal-date">{formatLong(date)}</span>
        </h3>
        {holidayName && (
          <div className="modal-holiday">
            ★ {holidayName} — public holiday. Counts toward your weekend/holiday limit
            {holidayLimit > 0
              ? ` (max ${holidayLimit} weekend/holiday day per month).`
              : "."}
          </div>
        )}
        <p className="modal-hint">
          Enter your details to claim this day.
        </p>
        <div className="field">
          <label htmlFor="r-first">First name</label>
          <input
            id="r-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            maxLength={80}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="r-last">Last name</label>
          <input
            id="r-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Smith"
            maxLength={80}
          />
        </div>
        <div className="field">
          <label htmlFor="r-phone">Phone number</label>
          <input
            id="r-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 081-234-5678"
            maxLength={32}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        {error && (
          <p className="muted-note" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={busy || !canSubmit}
          >
            {busy ? "Reserving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
