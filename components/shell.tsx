"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House,
  CalendarDays,
  ChartNoAxesCombined,
  Files,
  Bell,
  ArrowUpRight,
  Search,
  LogOut,
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  UsersRound,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Brand } from "./brand";
import { useWorkspace } from "./workspace-provider";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { href: "/dashboard", title: "Главная", icon: House },
  { href: "/dashboard/schedule", title: "Расписание", icon: CalendarDays },
  { href: "/dashboard/grades", title: "Успеваемость", icon: ChartNoAxesCombined },
  { href: "/dashboard/teachers", title: "Преподаватели", icon: GraduationCap },
  { href: "/dashboard/chats", title: "Чаты", icon: MessageSquare },
  { href: "/dashboard/documents", title: "Документы", icon: Files },
  { href: "/dashboard/notifications", title: "Уведомления", icon: Bell },
];
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 720px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia("(max-width: 720px)").matches;
export function Shell({ children }: { children: React.ReactNode }) {
  const { data } = useWorkspace();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);
  const sidebar = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile || !menu) return;
    const restoreTrigger = trigger.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") || [],
      ).filter((element) => element.getClientRects().length > 0);
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key === "Tab") {
        const elements = controls();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      restoreTrigger?.focus();
    };
  }, [mobile, menu]);
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={`sidebar ${menu ? "sidebar-open" : ""}`}
        inert={mobile && !menu}
        role={mobile && menu ? "dialog" : undefined}
        aria-modal={mobile && menu ? true : undefined}
        aria-label="Навигация кабинета"
      >
        <Link
          href="/dashboard"
          className="brand-link"
          aria-label="Орбита — главная"
          onClick={() => setMenu(false)}
        >
          <Brand />
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setMenu(false)}
          aria-label="Закрыть меню"
        >
          <X size={21} />
        </button>
        <div className="university-name">
          <span className="university-mark">УНГ</span>
          <span>
            Университет
            <br />
            новых горизонтов
          </span>
        </div>
        <div className="nav-caption">РАЗДЕЛЫ КАБИНЕТА</div>
        <nav className="main-nav" aria-label="Основная навигация">
          {navigation.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={title}
              className={`nav-item ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{title}</span>
              {title === "Уведомления" && unread > 0 && (
                <span className="nav-count" aria-label={`${unread} непрочитанных`}>
                  {unread}
                </span>
              )}
            </Link>
          ))}
          {data.user.role === "staff" && (
            <Link
              href="/dashboard/staff"
              className={`nav-item ${pathname === "/dashboard/staff" ? "active" : ""}`}
              onClick={() => setMenu(false)}
            >
              <UsersRound size={19} aria-hidden="true" />
              <span>Очередь деканата</span>
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-spark">
              <Sparkles size={19} aria-hidden="true" />
            </span>
            <h3>Заявка в деканат</h3>
            <p>Заказ справки или подача заявления. Статус сохраняется в документах.</p>
            <Link href="/dashboard/documents?new=1" onClick={() => setMenu(false)}>
              Обратиться в деканат
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="concept-tag">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>
              Конкурсный концепт
              <br />
              <small>Все данные вымышлены</small>
            </span>
          </div>
          <button className="signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={16} aria-hidden="true" />
            Выйти из кабинета
          </button>
        </div>
      </aside>
      <div className="app-content" inert={mobile && menu}>
        <header className="topbar">
          <div className="header-left">
            <button
              ref={trigger}
              className="menu-button icon-button"
              aria-label="Открыть меню"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Личный кабинет <span>/</span>{" "}
              <strong>
                {navigation.find((n) => n.href === pathname)?.title ||
                  (pathname.endsWith("profile")
                    ? "Профиль"
                    : pathname.endsWith("staff")
                      ? "Деканат"
                      : "Поиск")}
              </strong>
            </span>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <form action="/dashboard/search" className="global-search" role="search">
              <Search size={17} aria-hidden="true" />
              <input
                name="q"
                aria-label="Поиск по кабинету"
                placeholder="Найти в кабинете…"
                autoComplete="off"
              />
              <kbd>↵</kbd>
            </form>
            <Link
              href="/dashboard/notifications"
              className="notification-button icon-button"
              aria-label={`Уведомления, ${unread} непрочитанных`}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </Link>
            <span className="header-divider" />
            <Link className="user-link" href="/dashboard/profile">
              <span className="avatar">
                {data.user.firstName.slice(0, 1)}
                {data.user.name.split(" ")[0]?.slice(0, 1)}
              </span>
              <span className="user-short">
                <strong>{data.user.firstName}</strong>
                <small>{data.user.role === "staff" ? "Сотрудник деканата" : data.user.group}</small>
              </span>
            </Link>
          </div>
        </header>
        <main id="main" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <span>Орбита · Студенческий кабинет</span>
          <span>Неофициальный конкурсный прототип · Все данные вымышлены</span>
        </footer>
      </div>
    </div>
  );
}
