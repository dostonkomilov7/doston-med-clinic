"use client";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, notFound } from "next/navigation";
import "./appointment-management.style.css";
import { getCookie, AUTH_COOKIE, getUserData, apiUrl, signOut, apiErrorMessage } from "../../lib/utils";
import {
  ManagedAppointment, filterAppointments, sortAppointments, nextStatus, canCancel, bookingRef, formatApptDate,
} from "../../lib/appointments";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

const COLORS = ["#1D9E75","#378ADD","#D85A30","#EF9F27","#8B7EF8"];
const PER_PAGE = 10;
const STATUSES = ["Pending","Confirmed","Completed","Cancelled"];
const STATUS_CLASS: Record<string,string> = {Pending:"pending",Confirmed:"confirmed",Completed:"completed",Cancelled:"cancelled"};

function statusPill(status: string) {
  return <span className={`s-pill ${STATUS_CLASS[status] ?? "inactive"}`}>{status}</span>;
}

type PendingAction = { type: "advance" | "cancel"; id: number } | null;

type AdminProfile = { users?: { full_name?: string }[] } | null;

export default function AppointmentManagementPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<AdminProfile>(null);
  const [rows, setRows] = useState<ManagedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sort, setSort] = useState<"newest"|"oldest">("newest");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = useCallback((msg: string, type = "info") => {
    setToast({msg,type});
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(null), 3200);
  }, []);

  const fetchAppointments = useCallback(async (): Promise<ManagedAppointment[]> => {
    const res = await fetch(`${apiUrl}/appointments/management`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, "Failed to load appointments."));
    return data.appointments ?? [];
  }, []);

  const reloadAppointments = async (silent = false) => {
    if (!silent) { setLoading(true); setLoadError(false); }
    try {
      setRows(await fetchAppointments());
      setLoadError(false);
    } catch (e) {
      console.error("Failed to load appointments:", e);
      if (!silent) setLoadError(true);
      showToast("Failed to load appointments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getCookie(AUTH_COOKIE)) { router.push("/login"); return; }
    if (getCookie("role") !== "Admin") {
      notFound();
    }
    getUserData().then(setUserData).catch((e) => console.error("Failed to load the admin profile:", e));
    fetchAppointments()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load appointments:", e);
        setLoadError(true);
        showToast("Failed to load appointments.", "error");
      })
      .finally(() => setLoading(false));
  }, [router, fetchAppointments, showToast]);

  const doctorOptions = Array.from(
    new Map(rows.filter((r) => r.doctor?.id != null).map((r) => [String(r.doctor.id), r.doctor.full_name] as const)),
    ([id, name]) => ({ id, name }),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = sortAppointments(
    filterAppointments(rows, { search, status: statusFilter, doctorId: doctorFilter, date: dateFilter }),
    sort,
  );
  const hasFilters = !!(search || statusFilter || doctorFilter || dateFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length/PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageList = filtered.slice((safePage-1)*PER_PAGE, safePage*PER_PAGE);
  const start = (safePage-1)*PER_PAGE+1;
  const end = Math.min(safePage*PER_PAGE, filtered.length);
  const firstNum = Math.max(1, Math.min(safePage-3, totalPages-6));
  const pageNums = Array.from({length: Math.min(7, totalPages)}, (_, i) => firstNum+i);

  const clearFilters = () => {
    setSearch(""); setStatusFilter(""); setDoctorFilter(""); setDateFilter(""); setPage(1);
  };

  const advance = async (id: number) => {
    const row = rows.find((r) => r.id === id);
    const newStatus = row ? nextStatus(row.status) : null;
    if (!row || !newStatus) { setPendingAction(null); return; }
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        showToast(apiErrorMessage(body, "Could not update the appointment."), "error");
        reloadAppointments(true);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
      showToast(`${bookingRef(id)} is now ${newStatus}.`, "success");
    } catch (e) {
      console.error("Failed to update the appointment:", e);
      showToast("Something went wrong.", "error");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const cancelAppointment = async (id: number) => {
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl}/appointments/${id}`, { method: "DELETE", credentials: "include" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        showToast(apiErrorMessage(body, "Could not cancel the appointment."), "error");
        reloadAppointments(true);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Cancelled" } : r)));
      showToast(`${bookingRef(id)} has been cancelled.`, "success");
    } catch (e) {
      console.error("Failed to cancel the appointment:", e);
      showToast("Something went wrong.", "error");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const adminName = userData?.users?.[0]?.full_name ?? "";
  const fullDate = new Date().toDateString();
  const target = pendingAction ? rows.find((r) => r.id === pendingAction.id) : undefined;
  const targetNext = target ? nextStatus(target.status) : null;

  return (
    <div className="page-appointment-management">
    <div className="app">
      <Sidebar badge={<span className="admin-chip">Admin</span>}>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <Link prefetch={false} className="nav-item" href="/admin-dashboard">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span className="lbl">Dashboard</span>
          </Link>
          <Link prefetch={false} className="nav-item" href="/all-users">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span className="lbl">All Users</span>
          </Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Management</p>
          <Link prefetch={false} className="nav-item" href="/doctor-management"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="lbl">Doctors</span></Link>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span className="lbl">Appointments</span></a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">System</p>
          <a className="nav-item" onClick={signOut} style={{cursor:"pointer"}}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span className="lbl">Sign out</span></a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-av">{adminName?.[0]?.toUpperCase()}</div>
          <div className="admin-meta"><p className="name">{adminName}</p><p className="role">Super Administrator</p></div>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </Sidebar>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <HamburgerToggle />
            <div className="topbar-title">Appointment <span>Management</span></div>
            <div className="topbar-sub">Med Clinic Admin Panel · {fullDate}</div>
          </div>
          <div className="topbar-right">
            <div className="admin-av topbar-av">{adminName?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left">
              <h1>Manage <em>Appointments</em></h1>
              <p>Review every booking, move it along its status, or cancel it.</p>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search patient, phone, doctor, MB-ref…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
            </div>
            <select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="filter-select" aria-label="Filter by doctor" value={doctorFilter} onChange={e=>{setDoctorFilter(e.target.value);setPage(1);}}>
              <option value="">All Doctors</option>
              {doctorOptions.map(d=><option key={d.id} value={d.id}>Dr. {d.name}</option>)}
            </select>
            <input className="filter-date" type="date" aria-label="Filter by date" value={dateFilter} onChange={e=>{setDateFilter(e.target.value);setPage(1);}}/>
            <select className="filter-select" aria-label="Sort order" value={sort} onChange={e=>{setSort(e.target.value as "newest"|"oldest");setPage(1);}}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            {hasFilters && <button className="clear-filters" onClick={clearFilters}>Clear filters</button>}
            <div className="toolbar-right">
              <span className="results-count">Showing {filtered.length>0?`${start}–${end}`:"0"} of {filtered.length}</span>
            </div>
          </div>

          {loading && <div className="appt-table-wrap"><div className="table-state">Loading appointments…</div></div>}
          {!loading && loadError && (
            <div className="appt-table-wrap">
              <div className="table-state">
                We couldn&apos;t load the appointments.
                <button className="btn-secondary" onClick={()=>reloadAppointments()}>Try again</button>
              </div>
            </div>
          )}

          {!loading && !loadError && filtered.length > 0 && (
            <div className="appt-table-wrap">
              <table className="appt-table" data-cards>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date &amp; Time</th>
                    <th>Status</th>
                    <th style={{textAlign:"right"}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageList.map((r) => {
                    const next = nextStatus(r.status);
                    return (
                      <tr key={r.id}>
                        <td data-cell="main">
                          <div className="user-cell">
                            <div className="user-av" style={{background:COLORS[Number(r.patient?.id)%COLORS.length]}}>{r.patient?.full_name?.[0]?.toUpperCase() ?? "?"}</div>
                            <div>
                              <div className="user-name">{r.patient?.full_name ?? "Unknown patient"}</div>
                              <div className="user-phone">{r.patient?.phone || "—"}</div>
                              <div className="user-id">{bookingRef(r.id)}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Doctor">
                          <div className="doc-name">Dr. {r.doctor?.full_name ?? "—"}</div>
                          <div className="doc-spec">{r.doctor?.specialization}</div>
                        </td>
                        <td data-label="Date & Time">
                          <div className="dt-date">{formatApptDate(r.appointment_date)}</div>
                          <div className="dt-time">{r.appointment_time}</div>
                        </td>
                        <td data-label="Status">{statusPill(r.status)}</td>
                        <td data-cell="actions">
                          <div className="tbl-actions">
                            {next && (
                              <button className={`act-btn ${next==="Confirmed"?"confirm":"complete"}`} disabled={busy} onClick={()=>setPendingAction({type:"advance",id:r.id})}>
                                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{next==="Confirmed"?"Confirm":"Complete"}
                              </button>
                            )}
                            {canCancel(r.status) && (
                              <button className="act-btn cancel" disabled={busy} onClick={()=>setPendingAction({type:"cancel",id:r.id})}>
                                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancel
                              </button>
                            )}
                            {!next && !canCancel(r.status) && <span className="no-actions">—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="empty-state" style={{display:"block"}}>
              <div className="empty-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              {rows.length === 0 ? (
                <>
                  <h3>No appointments yet</h3>
                  <p>Bookings will show up here as soon as patients make them.</p>
                </>
              ) : (
                <>
                  <h3>No appointments found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                  {hasFilters && <button className="clear-filters" onClick={clearFilters}>Clear filters</button>}
                </>
              )}
            </div>
          )}

          {!loading && !loadError && filtered.length > 0 && (
            <div className="pagination" style={{display:"flex"}}>
              <button className="pg-btn" aria-label="Previous page" onClick={()=>setPage(Math.max(1,safePage-1))} disabled={safePage<=1}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
              <div className="pg-pages">
                {pageNums.map(n=>(
                  <button key={n} className={`pg-num${n===safePage?" active":""}`} onClick={()=>setPage(n)}>{n}</button>
                ))}
              </div>
              <button className="pg-btn" aria-label="Next page" onClick={()=>setPage(Math.min(totalPages,safePage+1))} disabled={safePage>=totalPages}><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
              <span className="pg-info">Page {safePage} of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {pendingAction && target && (
        <div className="modal-overlay open" onClick={e=>{if(!busy&&(e.target as HTMLElement).classList.contains("modal-overlay"))setPendingAction(null);}}>
          <div className="modal">
            <div className="modal-inner">
              {pendingAction.type === "cancel" ? (
                <>
                  <div className="modal-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
                  <h3>Cancel Appointment</h3>
                  <p>Cancel <strong>{bookingRef(target.id)}</strong> for <strong>{target.patient?.full_name}</strong> with <strong>Dr. {target.doctor?.full_name}</strong> on <strong>{formatApptDate(target.appointment_date)} at {target.appointment_time}</strong>?</p>
                  <p className="modal-sub">The record stays in the list, marked as Cancelled, and the time slot opens up again.</p>
                </>
              ) : (
                <>
                  <div className="modal-icon status"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <h3>{targetNext==="Confirmed"?"Confirm Appointment":"Complete Appointment"}</h3>
                  <p>Mark <strong>{bookingRef(target.id)}</strong> for <strong>{target.patient?.full_name}</strong> with <strong>Dr. {target.doctor?.full_name}</strong> on <strong>{formatApptDate(target.appointment_date)} at {target.appointment_time}</strong> as <strong>{targetNext}</strong>?</p>
                  <p className="modal-sub">The patient and the doctor are notified on Telegram if they have linked it.</p>
                </>
              )}
            </div>
            <div className="modal-footer-btns">
              <button className="btn-mcancel" disabled={busy} onClick={()=>setPendingAction(null)}>{pendingAction.type==="cancel"?"Keep Appointment":"Not Now"}</button>
              {pendingAction.type === "cancel" ? (
                <button className="btn-mdelete" disabled={busy} onClick={()=>cancelAppointment(target.id)}>{busy?"Cancelling…":"Cancel Appointment"}</button>
              ) : (
                <button className="btn-mconfirm" disabled={busy} onClick={()=>advance(target.id)}>{busy?"Saving…":targetNext==="Confirmed"?"Confirm":"Mark Completed"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
    </div>
  );
}
