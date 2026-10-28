"use client";
import { ReactNode } from "react";
import Link from "next/link";

interface SidebarProps {
  badge?: ReactNode;
  children: ReactNode;
}

export default function Sidebar({ badge, children }: SidebarProps) {
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link href="/" className="brand-link">
            <div className="brand-dot">
              <svg viewBox="0 0 24 24">
                <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="brand-text">Med Clinic</span>
          </Link>
          {badge}
        </div>
        {children}
      </aside>
      <div
        className="sidebar-overlay"
        onClick={() => {
          document.querySelector(".sidebar")?.classList.remove("open");
          document.querySelector(".sidebar-overlay")?.classList.remove("open");
        }}
      ></div>
    </>
  );
}