export default function Changelog() {
  return (
    <>
      <div className="page-intro">
        <h1>What&rsquo;s new</h1>
        <p>Recent fixes and improvements to Cancer Shift.</p>
      </div>

      <div className="card">
        <div className="cl-list">

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">28 Jun 2026</span>
              <span className="cl-tag fix">Fix</span>
            </div>
            <div className="cl-title">Scheduled registration now opens at the correct time</div>
            <div className="cl-body">
              Scheduled open/close windows were triggering 7 hours late because the server
              (Vercel, UTC) was comparing times in UTC instead of Bangkok time (UTC+7).
              All date and time comparisons now use <strong>Asia/Bangkok</strong> timezone,
              so a window set to 09:00 actually opens at 09:00.
            </div>
          </div>

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">28 Jun 2026</span>
              <span className="cl-tag feature">Feature</span>
            </div>
            <div className="cl-title">Dark theme</div>
            <div className="cl-body">
              Cancer Shift now uses a dark theme with a deep slate background and
              cyan accent colour — clearly distinct from the Ramasri Shift site
              so users can tell them apart at a glance.
            </div>
          </div>

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">28 Jun 2026</span>
              <span className="cl-tag improvement">Improvement</span>
            </div>
            <div className="cl-title">Scoreboard</div>
            <div className="cl-body">
              New <strong>Scoreboard</strong> tab shows reservation totals per person,
              split into weekday days and weekend/holiday days. Filter by month or view
              all-time history. Click any row to expand the full date list.
            </div>
          </div>

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">28 Jun 2026</span>
              <span className="cl-tag improvement">Improvement</span>
            </div>
            <div className="cl-title">My Days — view only</div>
            <div className="cl-body">
              The <strong>My Days</strong> tab now only shows your reservations —
              cancellation has been removed to prevent accidental deletions.
              Contact your admin if you need to cancel a booking.
            </div>
          </div>

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">27 Jun 2026</span>
              <span className="cl-tag feature">Feature</span>
            </div>
            <div className="cl-title">Scheduled registration windows</div>
            <div className="cl-body">
              Admins can now set a specific <strong>open date/time</strong> and
              <strong> close date/time</strong> per month. The calendar shows a banner
              counting down to the opening or warning when reservations are about to close.
              Default state for new months is closed until the admin acts.
            </div>
          </div>

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">27 Jun 2026</span>
              <span className="cl-tag fix">Fix</span>
            </div>
            <div className="cl-title">Weekend / holiday quota logic corrected</div>
            <div className="cl-body">
              The monthly quota now correctly allows up to <strong>3 days total</strong>,
              with a sub-limit of <strong>1 weekend or public holiday</strong> day within
              that 3. Previously weekend days were incorrectly counted only against
              a separate bucket.
            </div>
          </div>

          <div className="cl-entry">
            <div className="cl-meta">
              <span className="cl-date">26 Jun 2026</span>
              <span className="cl-tag feature">Feature</span>
            </div>
            <div className="cl-title">Initial launch — Tuesday to Friday only</div>
            <div className="cl-body">
              Cancer Shift launches for Tuesday–Friday schedules only.
              Monday, Saturday, and Sunday are automatically blocked.
              One reservation per day, first come first served,
              personnel number required to book.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
