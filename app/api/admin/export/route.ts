import { NextRequest, NextResponse } from "next/server";
import { getAllReservations } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const rows = await getAllReservations();

  const sheets: Record<string, { Date: string; "First Name": string; "Last Name": string; Phone: string; "Reserved At": string }[]> = {};
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    if (!sheets[month]) sheets[month] = [];
    sheets[month].push({
      Date: r.date,
      "First Name": r.first_name,
      "Last Name": r.last_name,
      Phone: r.phone,
      "Reserved At": r.created_at,
    });
  }

  const wb = XLSX.utils.book_new();
  const months = Object.keys(sheets).sort();

  if (months.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["No Reservations", "", "", "", ""], ["Date", "First Name", "Last Name", "Phone", "Reserved At"]]);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, "No Reservations");
  } else {
    for (const month of months) {
      const [y, m] = month.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const dataRows = sheets[month].map((r) => [r.Date, r["First Name"], r["Last Name"], r.Phone, r["Reserved At"]]);
      const aoa = [[label, "", "", "", ""], ["Date", "First Name", "Last Name", "Phone", "Reserved At"], ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
      ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 22 }];
      const sheetName = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }

  const years = [...new Set(months.map((m) => m.slice(0, 4)))].join("-");
  const filename = `shift-reservations-${years || new Date().getFullYear()}.xlsx`;
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
