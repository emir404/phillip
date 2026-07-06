import { useState } from "react";
import { IconChat, IconFunnel, IconGear, IconGrid, IconUsers } from "./icons";

const NAV = [
  { id: "overview", label: "Overview", icon: IconGrid, href: "#overview" },
  { id: "leads", label: "Leads", icon: IconUsers, href: "#leads" },
  { id: "funnel", label: "Funnel", icon: IconFunnel, href: "#funnel" },
  { id: "conversations", label: "Conversations", icon: IconChat, soon: true },
  { id: "settings", label: "Settings", icon: IconGear, soon: true },
];

export function Sidebar({ active }: { active: string }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {logoFailed ? (
          <span className="sidebar-logo-fallback">nutz</span>
        ) : (
          <img
            src="/logo.png"
            alt="nutz"
            className="sidebar-logo-img"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <nav className="sidebar-nav" aria-label="dashboard sections">
        {NAV.map((n) => {
          const Icon = n.icon;
          if (n.soon) {
            return (
              <span key={n.id} className="sidebar-link is-soon" aria-disabled="true">
                <Icon size={17} />
                {n.label}
                <span className="sidebar-soon">soon</span>
              </span>
            );
          }
          return (
            <a
              key={n.id}
              href={n.href}
              className={`sidebar-link${active === n.id ? " is-active" : ""}`}
            >
              <Icon size={17} />
              {n.label}
            </a>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-workspace">
          <span className="sidebar-workspace-dot" />
          <div className="sidebar-workspace-text">
            <span className="sidebar-workspace-name">nutz.inc</span>
            <span className="sidebar-workspace-env">production</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
