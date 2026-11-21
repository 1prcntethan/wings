import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../config/auth-context.jsx";
import "./tabbar.css";

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function IconLog() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function IconSkills() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="16" cy="17" r="2.2" />
      <path d="M8 12h5.5M14.2 8.6 8.2 11.2M14.2 15.4 8.2 12.8" />
    </svg>
  );
}

function IconLearn() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h7.2a2 2 0 0 1 2 2V19a2 2 0 0 0-2-1.2H4zM20 6.5h-7.2a2 2 0 0 0-2 2V19a2 2 0 0 1 2-1.2H20z" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="3" />
      <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function activeTab(pathname, signedIn) {
  if (pathname.startsWith("/workoutlog")) return "log";
  if (pathname.startsWith("/skilltree") || pathname.startsWith("/skillvis")) return "skills";
  if (
    pathname.startsWith("/learn") ||
    pathname.startsWith("/training") ||
    pathname.startsWith("/tutorials") ||
    pathname.startsWith("/terminology") ||
    pathname.startsWith("/howtouse")
  ) {
    return "learn";
  }
  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/createaccount") ||
    pathname.startsWith("/resetpassword")
  ) {
    return "account";
  }
  if (pathname.startsWith("/dashboard")) return "home";
  if (pathname === "/") return signedIn ? "marketing" : "home";
  return "";
}

export default function TabBar() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const current = activeTab(pathname, Boolean(currentUser));
  const homeTab = currentUser ? "/dashboard" : "/";
  const items = [
    { id: "home", label: "Home", to: homeTab, icon: <IconHome /> },
    { id: "log", label: "Log", to: "/workoutlog", icon: <IconLog /> },
    { id: "skills", label: "Skills", to: "/skilltree", icon: <IconSkills /> },
    { id: "learn", label: "Learn", to: "/learn", icon: <IconLearn /> },
    { id: "account", label: "Account", to: currentUser ? "/settings" : "/login", icon: <IconAccount /> },
  ];

  return (
    <nav className="tabbar" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className="tabbar-item"
          aria-current={current === item.id ? "page" : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
