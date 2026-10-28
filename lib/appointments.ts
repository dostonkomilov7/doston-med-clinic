// Framework-free helpers for appointment data, shared by the admin pages
// (dashboard snapshot, Appointment Management) and the booking wizard.

export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

// One row of GET /appointments/management.
export type ManagedAppointment = {
  id: number;
  status: AppointmentStatus | string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // "9:30 AM"
  urgency?: string;
  reason?: string | null;
  patient: { id: number; full_name: string; phone: string | null };
  doctor: { id: number; full_name: string; specialization: string };
};

// Same forward-only flow the backend enforces: Pending → Confirmed →
// Completed. Cancelling is a separate action, and Completed/Cancelled are final.
const NEXT_STATUS: Record<string, AppointmentStatus> = { Pending: "Confirmed", Confirmed: "Completed" };

export const nextStatus = (status: string): AppointmentStatus | null => NEXT_STATUS[status] ?? null;

// Only an appointment that is still open can be cancelled.
export const canCancel = (status: string): boolean => status === "Pending" || status === "Confirmed";

// The reference patients see after booking ("Booking Reference: MB-42").
export const bookingRef = (id: number | string): string => `MB-${id}`;

/** "9:30 AM" → 570, "12:00 AM" → 0, "1:00 PM" → 780; null if it isn't a 12-hour time. */
export const timeToMinutes = (time: string): number | null => {
  const match = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(time ?? "");
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 1 || hours > 12 || minutes > 59) return null;
  return (hours % 12) * 60 + minutes + (match[3].toUpperCase() === "PM" ? 12 * 60 : 0);
};

const pad = (n: number) => String(n).padStart(2, "0");

/** True when the slot has already started (or starts this very minute), by the browser's clock. */
export const isSlotInPast = (date: string, time: string, now: Date = new Date()): boolean => {
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (date < today) return true;
  if (date > today) return false;
  const minutes = timeToMinutes(time);
  return minutes !== null && minutes <= now.getHours() * 60 + now.getMinutes();
};

export type AppointmentFilters = {
  search: string; // patient name, phone, doctor name or booking reference
  status: string; // "" = any
  doctorId: string; // "" = any
  date: string; // YYYY-MM-DD, "" = any
};

const digitsOf = (text: string) => text.replace(/\D/g, "");

export const filterAppointments = <T extends ManagedAppointment>(rows: T[], f: AppointmentFilters): T[] => {
  const q = f.search.trim().toLowerCase();
  const qDigits = digitsOf(q);

  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.doctorId && String(r.doctor?.id) !== f.doctorId) return false;
    if (f.date && r.appointment_date !== f.date) return false;
    if (!q) return true;

    const phone = r.patient?.phone ?? "";
    return (
      (r.patient?.full_name ?? "").toLowerCase().includes(q) ||
      (r.doctor?.full_name ?? "").toLowerCase().includes(q) ||
      bookingRef(r.id).toLowerCase().includes(q) ||
      // "90 123", "+998 90…" and "(90)123" should all find the same phone.
      (qDigits.length >= 3 && digitsOf(phone).includes(qDigits)) ||
      phone.toLowerCase().includes(q)
    );
  });
};

// Date first, then the time of day as minutes ("10:00 AM" must sort after
// "9:00 AM", which plain string comparison gets wrong).
const sortKey = (r: ManagedAppointment) =>
  `${r.appointment_date} ${String(timeToMinutes(r.appointment_time) ?? 0).padStart(4, "0")}`;

export const sortAppointments = <T extends ManagedAppointment>(rows: T[], order: "newest" | "oldest"): T[] => {
  const dir = order === "newest" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka !== kb) return ka < kb ? -dir : dir;
    return (a.id - b.id) * dir;
  });
};

export type StatusCounts = { total: number; pending: number; confirmed: number; completed: number; cancelled: number };

export const countByStatus = (rows: { status: string }[]): StatusCounts => {
  const counts: StatusCounts = { total: rows.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const r of rows) {
    if (r.status === "Pending") counts.pending++;
    else if (r.status === "Confirmed") counts.confirmed++;
    else if (r.status === "Completed") counts.completed++;
    else if (r.status === "Cancelled") counts.cancelled++;
  }
  return counts;
};

/** "2031-03-05" → "Mar 5, 2031" without letting the browser's time zone shift the day. */
export const formatApptDate = (date: string): string => {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
