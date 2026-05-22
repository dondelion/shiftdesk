"use client";

import { useCallback, useEffect, useState } from "react";
import { currentMonth, formatLong, monthLabel, shiftMonth } from "@/lib/calendar";

type DayRecord = { date: string; dayType: "weekday" | "weekend_holiday" };

type Entry = {
  name: string;
  personnel_number: string;
  total: number;
  weekdays: number;
  weekendsHolidays: number;
  reservations: DayRecord[];
};

export default function Scoreboard() {
  const [month, setMonth] = useState<string>("all");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    setEntries(null);
    const url = m === "all" ? "/api/scoreboard" : `/api/scoreboard?month=${m}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setEntries(json.entries ?? []);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const cur = currentMonth();

  return (
    <>
      <div className="page-intro">
        <h1>Scoreboard</h1>
        <p>Reservation history for all staff — weekdays and weekends/holidays tracked separately.</p>
      </div>

      <div className="card">
        {/* Month filter */}
        <div className="month-bar" style={{ marginBottom: 18 }}>
          <button
            className="icon-btn"
            onClick={() => setMonth((m) => m === "all" ? cur : shiftMonth(m, -1))}
            aria-label="Previous"
          >‹</button>
          <div style={{ textAlign: "center" }}>
            <div className="month-title">
              {month === "all" ? "All time" : monthLabel(month)}
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setMonth((m) => m === "all" ? cur : shiftMonth(m, 1))}
            aria-label="Next"
          >›</button>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}>
          <button
            className={`btn ${month === "all" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 13 }}
            onClick={() => setMonth("all")}
          >All time</button>
          <button
            className={`btn ${month === cur ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 13 }}
            onClick={() => setMonth(cur)}
          >This month</button>
        </div>

        {entries === null ? (
          <div className="spinner-line">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">No reservations found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Name</th>
                <th style={{ textAlign: "center" }}>Total</th>
                <th style={{ textAlign: "center" }}>Weekdays</th>
                <th style={{ textAlign: "center" }}>Wknd / Hol</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const key = e.personnel_number;
                const isOpen = expanded === key;
                return (
                  <>
                    <tr key={key} style={{ cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : key)}>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>#{e.personnel_number}</div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{e.total}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="status-pill open">{e.weekdays}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="status-pill scheduled">{e.weekendsHolidays}</span>
                      </td>
                      <td style={{ textAlign: "right", fontSize: 18, color: "var(--muted)" }}>
                        {isOpen ? "▲" : "▼"}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${key}-detail`}>
                        <td colSpan={6} style={{ padding: "0 0 12px 0", background: "none" }}>
                          <div style={{ padding: "10px 14px", background: "var(--bg)", borderRadius: 8, margin: "0 4px" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>
                              RESERVATION HISTORY
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {e.reservations.map((r) => (
                                <span
                                  key={r.date}
                                  title={r.dayType === "weekday" ? "Weekday" : "Weekend / Holiday"}
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    background: r.dayType === "weekday"
                                      ? "var(--available-soft)"
                                      : "var(--holiday-soft)",
                                    color: r.dayType === "weekday"
                                      ? "var(--available)"
                                      : "var(--holiday)",
                                    border: `1px solid ${r.dayType === "weekday" ? "var(--available-line)" : "var(--holiday-line)"}`,
                                  }}
                                >
                                  {formatLong(r.date)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
