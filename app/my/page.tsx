"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatLong } from "@/lib/calendar";

type Reservation = {
  id: number;
  date: string;
  name: string;
  personnel_number: string;
  created_at: string;
};

export default function MyDays() {
  const [name, setName] = useState("");
  const [pnum, setPnum] = useState("");
  const [list, setList] = useState<Reservation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("shift_name") || "");
    setPnum(localStorage.getItem("shift_pnum") || "");
  }, []);

  async function lookup() {
    if (!name.trim() || !pnum.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          personnelNumber: pnum.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Lookup failed.");
        setList(null);
        return;
      }
      localStorage.setItem("shift_name", name.trim());
      localStorage.setItem("shift_pnum", pnum.trim());
      setList(json.reservations);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h1>My reserved days</h1>
        <p>Look up the days you have reserved.</p>
      </div>

      <div className="card stack">
        <div>
          <div className="section-title">Find your reservations</div>
          <div className="field">
            <label htmlFor="m-name">Full name</label>
            <input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              maxLength={80}
            />
          </div>
          <div className="field">
            <label htmlFor="m-pnum">Personnel number</label>
            <input
              id="m-pnum"
              value={pnum}
              onChange={(e) => setPnum(e.target.value)}
              placeholder="e.g. 10482"
              maxLength={32}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
          </div>
          {error && (
            <p className="muted-note" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={lookup}
            disabled={busy || !name.trim() || !pnum.trim()}
          >
            {busy ? "Looking up…" : "Show my days"}
          </button>
        </div>

        {list !== null && (
          <div>
            <div className="section-title">
              {list.length} day{list.length === 1 ? "" : "s"} reserved
            </div>
            {list.length === 0 ? (
              <div className="empty-state">
                No reservations yet.{" "}
                <Link href="/" className="tag-link">
                  Pick a day →
                </Link>
              </div>
            ) : (
              <div className="res-list">
                {list.map((r) => (
                  <div key={r.id} className="res-item">
                    <div>
                      <div className="res-date">{formatLong(r.date)}</div>
                      <div className="res-meta">
                        Reserved {r.created_at.split(" ")[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </>
  );
}
