"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function DashboardMobileShell({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleDrawerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, [data-close-drawer]")) {
      setOpen(false);
    }
  };

  return (
    <>
      <div className="dashboard-mobile-topbar">
        <button
          type="button"
          className="dashboard-mobile-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="dashboard-mobile-drawer"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="dashboard-mobile-topbar-title">{title}</div>
      </div>

      <div
        className={`dashboard-mobile-overlay${open ? " open" : ""}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <div
        id="dashboard-mobile-drawer"
        className={`dashboard-mobile-drawer${open ? " open" : ""}`}
      >
        <div className="dashboard-mobile-drawer-inner" onClick={handleDrawerClick}>
          {children}
        </div>
      </div>
    </>
  );
}
