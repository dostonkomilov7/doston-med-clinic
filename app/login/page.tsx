"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./login.style.css";
import { setCookie, getCookie, apiUrl, AUTH_COOKIE } from "../../lib/utils";

export default function LoginPage() {
  const router = useRouter();

  const completeLogin = (response: { userId: string | number; role: string }) => {

    setCookie("userId", String(response.userId));
    setCookie("role", response.role);
    setCookie(AUTH_COOKIE, "1");
    if (response.role === "Doctor") window.location.href = "/doctor-dashboard";
    else if (response.role === "User") window.location.href = "/user-dashboard";
    else window.location.href = "/admin-dashboard";
  };

  useEffect(() => {
    const redirectIfAuth = () => {
      if (getCookie(AUTH_COOKIE)) {
        const role = getCookie("role");
        if (role === "Doctor") window.location.href = "/doctor-dashboard";
        else if (role === "User") window.location.href = "/user-dashboard";
        else if (role === "Admin") window.location.href = "/admin-dashboard";
        else router.push("/");
      }
    };

    redirectIfAuth();

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  const togglePw = () => {
    const input = document.getElementById("password") as HTMLInputElement;
    const icon = document.getElementById("pw-icon") as HTMLElement;
    if (input.type === "password") {
      input.type = "text";
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      input.type = "password";
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };

  const handleLogin = async () => {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const pwInput = document.getElementById("password") as HTMLInputElement | null;
    const alertEl = document.getElementById("alert") as HTMLElement | null;
    const submitBtn = document.getElementById("login-submit") as HTMLButtonElement | null;
    if (!emailInput || !pwInput || !alertEl || !submitBtn) return;

    const email = emailInput.value.trim();
    const pw = pwInput.value;

    if (!email || !pw) {
      alertEl.textContent = "Please fill in all fields.";
      alertEl.style.display = "block";
      return;
    }
    if (submitBtn.classList.contains("loading")) return;
    alertEl.style.display = "none";
    submitBtn.classList.add("loading");
    submitBtn.setAttribute("disabled", "true");

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password: pw }),
      });
      const response = await res.json();

      if (!res.ok || !response.success) {
        alertEl.textContent = response.message || "Incorrect email or password. Please try again.";
        alertEl.style.display = "block";
        return;
      }

      completeLogin(response);
    } catch (error) {
      console.error(error);
      alertEl.textContent = "Something went wrong. Please check your connection and try again.";
      alertEl.style.display = "block";
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.removeAttribute("disabled");
    }
  };

  return (
    <div className="page-login">
      <div className="panel-left">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L12 7M12 17L12 22M7 12L2 12M22 12L17 12M12 12m-2 0a2 2 0 104 0 2 2 0 00-4 0" />
              <path d="M17.5 6.5L14 10M10 14L6.5 17.5M17.5 17.5L14 14M10 10L6.5 6.5" />
            </svg>
          </div>
          <span className="brand-name">Med Clinic</span>
        </div>

        <div className="panel-copy">
          <h1>Your health,<br /><em>beautifully</em><br />organized.</h1>
          <p>Book appointments, track your medical history, and connect with top specialists — all in one place.</p>
        </div>

        <div className="stats-row">
          <div className="stat"><span className="stat-num">12k+</span><span className="stat-label">Patients</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-num">340</span><span className="stat-label">Doctors</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-num">98%</span><span className="stat-label">Satisfaction</span></div>
        </div>
      </div>

      <div className="panel-right">
        <div className="form-card">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Don't have an account? <Link href="/register">Create one</Link></p>
          </div>

          <div className="alert" id="alert" style={{ display: "none" }}>Incorrect email or password. Please try again.</div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <input type="email" id="email" placeholder="you@example.com" autoComplete="email" />
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input type="password" id="password" placeholder="••••••••" autoComplete="current-password" />
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <button className="toggle-pw" type="button" onClick={togglePw} aria-label="Show password">
                <svg id="pw-icon" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input type="checkbox" id="remember" />
              Remember me
            </label>
          </div>

          <button className="btn-primary" id="login-submit" onClick={handleLogin}>
            <span className="spinner"></span>
            <span className="btn-label">Sign in to Med Clinic</span>
          </button>
        </div>
      </div>
    </div>
  );
}
