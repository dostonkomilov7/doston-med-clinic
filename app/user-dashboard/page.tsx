"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import "./user-dashboard.style.css";
import { getCookie, AUTH_COOKIE, getUserData, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

const METRIC_LABELS: Record<string, string> = {
  bloodPressure: "Blood Pressure",
  heartRate: "Heart Rate",
  bloodSugar: "Blood Sugar",
  bmi: "BMI",
  weight: "Weight",
  cholesterol: "Cholesterol",
};
const METRIC_COLORS: Record<string, string> = {
  bloodPressure: "coral",
  heartRate: "amber",
  bloodSugar: "blue",
  bmi: "green",
  weight: "blue",
  cholesterol: "coral",
};
const MED_DOT_COLORS = ["green", "blue", "coral"];

export default function UserDashboardPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [detailAppt, setDetailAppt] = useState<any | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const upcomingAppointments = appointments.filter((a: any) => a.status === "Pending" || a.status === "Confirmed");

  useEffect(() => {
    if (!getCookie(AUTH_COOKIE)) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Admin" && role !== "User") {
      notFound();
    }
    init();
  }, [router]);

  const init = async () => {
    const userData = await getUserData();
    if (!userData) return;
    const user = userData.users[0];

    const setEl = (sel: string, val: string) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    };

    setEl(".headers", user.full_name);
    setEl(".intro", user.full_name);
    setEl(".name", user.full_name);
    setEl(".topbar-avatar", user.full_name[0].toUpperCase());
    setEl(".user-avatar", user.full_name[0].toUpperCase());
    setEl(".role", `${user.role === "User" ? "Patient" : user.role} • ID #${user.id}`);

    const fullDate = String(new Date().toDateString()).split(" ");
    setEl(".date", fullDate.join(", "));

    await Promise.all([getAppointments(), fetchHealthMetrics(), fetchMedications()]);
  };

  const fetchHealthMetrics = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/health-metrics/${userId}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setHealthMetrics(data.metrics ?? []);
    } catch (e) {
      console.error("Failed to load health metrics:", e);
    }
  };

  const fetchMedications = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/medications/${userId}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setMedications(data.medications ?? []);
    } catch (e) {
      console.error("Failed to load medications:", e);
    }
  };

  const getAppointments = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/appointments/${userId}`, { credentials: "include" });
      const data = await res.json();
      const rows = data.appointments?.rows ?? [];
      setAppointments(rows);
      const totalAppointments = document.querySelector(".stat-value");
      if (totalAppointments) totalAppointments.textContent = String(data.appointments?.count ?? rows.length);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="page-user-dashboard">
    <div className="app">
      <Sidebar>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></a>
          <Link prefetch={false} className="nav-item" href="/my-appointments"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Appointments</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Health</p>
          <Link prefetch={false} className="nav-item" href="/medical-records"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>Medical Records</span></Link>
          <Link prefetch={false} className="nav-item" href="/health-metrics"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span>Health Metrics</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Account</p>
          <a className="nav-item" style={{ cursor: "pointer" }} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg><span>Sign out</span></a>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">U</div>
          <div className="user-meta">
            <p className="name">User</p>
            <p className="role">User · ID #777</p>
          </div>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        </div>
      </Sidebar>

      <div className="main">
        <header className="topbar">
          <HamburgerToggle />
          <h1 className="topbar-title">Good morning, <span className="headers"></span> 👋</h1>
          <div className="topbar-actions">
            <div className="topbar-avatar">U</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-banner">
            <div className="welcome-copy">
              <p className="date"></p>
              <h2>Welcome back, <em className="intro"></em></h2>
            </div>
            <div className="welcome-actions">
              <Link href="/book-appointment"><button className="btn-white">+ Book Appointment</button></Link>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon teal"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
              </div>
              <div className="stat-value">0</div>
              <div className="stat-label">Total Appointments</div>
            </div>
            <Link href="/medical-records">
              <div className="stat-card stat-card-link">
                <div className="stat-card-top"><div className="stat-icon blue"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div></div>
                <div className="stat-value">{medications.length}</div>
                <div className="stat-label">Medications on File</div>
              </div>
            </Link>
            <Link href="/health-metrics">
              <div className="stat-card stat-card-link">
                <div className="stat-card-top"><div className="stat-icon amber"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div></div>
                <div className="stat-value">{healthMetrics.length}</div>
                <div className="stat-label">Health Metrics Logged</div>
              </div>
            </Link>
          </div>

          <div className="main-grid">
            <div>
              <div className="section-head"><h3>Upcoming Appointments</h3><Link href="/my-appointments">View all →</Link></div>
              <div className="table-card">
                <table data-cards>
                  <thead><tr><th>Doctor</th><th>Date & Time</th><th>Type</th><th>Status</th><th></th></tr></thead>
                  <tbody className="app-list">
                    {upcomingAppointments.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "20px 0", color: "var(--gray-400)" }}>Appointments not found</td></tr>
                    ) : upcomingAppointments.map((a: any) => (
                      <tr key={a.id} onClick={() => setDetailAppt(a)}>
                        <td data-cell="main">
                          <div className="doctor-cell">
                            <div className="doc-avatar a">{a.doctor.user.full_name[0]}</div>
                            <div>
                              <div className="doc-name">Dr. {a.doctor.user.full_name}</div>
                              <div className="doc-spec">{a.doctor.specialization}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Date & Time">
                          <div className="apt-date">{a.appointment_date}</div>
                          <div className="apt-time">{a.appointment_time}</div>
                        </td>
                        <td data-label="Type"><span className="type-tag in-person">In-person</span></td>
                        <td data-label="Status"><span className={`status-pill ${a.status?.toLowerCase()}`}>{a.status}</span></td>
                        <td data-cell="actions"><button className="row-action" onClick={(e) => { e.stopPropagation(); setDetailAppt(a); }}>Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="section-head"><h3>Quick Actions</h3></div>
              <div className="quick-grid">
                <Link href="/book-appointment"><button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></div><span>Book a new appointment</span></button></Link>
                <Link href="/medical-records"><button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div><span>View medical records</span></button></Link>
                <Link href="/health-metrics"><button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div><span>View health metrics</span></button></Link>
              </div>
            </div>
            <div className="right-col">
              <div className="card">
                <div className="section-head"><h3>Health Summary</h3><Link href="/health-metrics">View →</Link></div>
                {healthMetrics.length === 0 ? (
                  <div className="empty-preview">
                    <p>No health metrics logged yet.</p>
                  </div>
                ) : (
                  <div className="health-items">
                    {healthMetrics.slice(0, 4).map((m: any) => (
                      <div className="health-item" key={m.id}>
                        <div className="health-row">
                          <span className="health-name">{METRIC_LABELS[m.type] ?? m.type}</span>
                          <span className="health-val">{m.value}{m.unit ? ` ${m.unit}` : ""}</span>
                        </div>
                        <div className="health-bar"><div className={`health-fill ${METRIC_COLORS[m.type] ?? "green"}`} style={{ width: "100%" }}></div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <div className="section-head"><h3>Medications</h3><Link href="/medical-records">View →</Link></div>
                {medications.length === 0 ? (
                  <div className="empty-preview">
                    <p>No medications on file yet.</p>
                  </div>
                ) : (
                  <div className="med-list">
                    {medications.slice(0, 4).map((m: any, i: number) => (
                      <div className="med-item" key={m.id}>
                        <div className={`med-dot ${MED_DOT_COLORS[i % MED_DOT_COLORS.length]}`}></div>
                        <div className="med-info">
                          <div className="med-name">{m.name}</div>
                          {m.notes && <div className="med-dose">{m.notes}</div>}
                        </div>
                        <span className="med-time">{m.schedule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {detailAppt && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains("modal-overlay")) setDetailAppt(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Appointment Details</h2>
                <p>Dr. {detailAppt.doctor?.user?.full_name} · {detailAppt.appointment_date}</p>
              </div>
              <button className="modal-close" onClick={() => setDetailAppt(null)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="modal-body">
              <div className="detail-doc-row">
                <div className="detail-doc-avatar">{detailAppt.doctor?.user?.full_name?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="detail-doc-name">Dr. {detailAppt.doctor?.user?.full_name}</div>
                  <div className="detail-doc-spec">{detailAppt.doctor?.specialization}</div>
                </div>
                <span className={`status-pill ${detailAppt.status?.toLowerCase()}`} style={{ marginLeft: "auto" }}>{detailAppt.status}</span>
              </div>
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-val">{detailAppt.appointment_date}</div></div>
                <div className="detail-item"><div className="detail-label">Time</div><div className="detail-val">{detailAppt.appointment_time}</div></div>
                <div className="detail-item"><div className="detail-label">Department</div><div className="detail-val">{detailAppt.doctor?.department ?? "—"}</div></div>
                <div className="detail-item"><div className="detail-label">Room</div><div className="detail-val">{detailAppt.doctor?.room_number ?? "—"}</div></div>
                <div className="detail-item"><div className="detail-label">Urgency</div><div className="detail-val">{detailAppt.urgency || "Routine"}</div></div>
                <div className="detail-item"><div className="detail-label">Reason for Visit</div><div className="detail-val">{detailAppt.reason || "Not specified"}</div></div>
                <div className="detail-item full"><div className="detail-label">Notes</div><div className="detail-val">{detailAppt.notes || "—"}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setDetailAppt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
