"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatLong } from "@/lib/calendar";

type Reservation = {
  id: number;
  date: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
};

export default function MyDays() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [list, setList] = useState<Reservation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFirstName(localStorage.getItem("shift_first") || "");
    setLastName(localStorage.getItem("shift_last") || "");
    setPhone(localStorage.getItem("shift_phone") || "");
  }, []);

  async function lookup() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Lookup failed.");
        setList(null);
        return;
      }
      localStorage.setItem("shift_first", firstName.trim());
      localStorage.setItem("shift_last", lastName.trim());
      localStorage.setItem("shift_phone", phone.trim());
      setList(json.reservations);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const canLookup = firstName.trim() && lastName.trim() && phone.trim();

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
            <label htmlFor="m-first">First name</label>
            <input
              id="m-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              maxLength={80}
            />
          </div>
          <div className="field">
            <label htmlFor="m-last">Last name</label>
            <input
              id="m-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              maxLength={80}
            />
          </div>
          <div className="field">
            <label htmlFor="m-phone">Phone number</label>
            <input
              id="m-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 081-234-5678"
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
            disabled={busy || !canLookup}
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
