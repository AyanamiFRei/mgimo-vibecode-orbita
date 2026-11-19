"use client";
import Form from "next/form";
import { usePathname, useSearchParams } from "next/navigation";
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
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { dashboardDestination, dashboardTitles } from "@/lib/navigation-history";
import { Brand } from "./brand";
import { clearNavigationHistory, NavigationBreadcrumbs } from "./navigation-breadcrumbs";
import { NavigationLink } from "./navigation-link";
import { SelectionTrack } from "./selection-track";
import { UserAvatar } from "./user-avatar";
import { useWorkspace } from "./workspace-provider";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { href: "/dashboard", icon: House },
  { href: "/dashboard/schedule", icon: CalendarDays },
  { href: "/dashboard/grades", icon: ChartNoAxesCombined },
  { href: "/dashboard/teachers", icon: GraduationCap },
  { href: "/dashboard/chats", icon: MessageSquare },
  { href: "/dashboard/documents", icon: Files },
  { href: "/dashboard/notifications", icon: Bell },
];
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 720px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia("(max-width: 720px)").matches;

function DashboardMain({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const query = useSearchParams().toString();
  const identity = dashboardDestination(`${pathname}?${query}`)?.identity ?? pathname;
  const dialog = identity.endsWith("?new") || identity.includes("?compose=");
  const previous = useRef({ pathname, identity, dialog });
  const lastMotion = useRef<"a" | "b">("b");
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = { pathname, identity, dialog };
    const element = main.current;
    if (!element) return;

    const clearMotion = () => element.removeAttribute("data-route-motion");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      from.identity === identity ||
      (from.pathname === pathname && (from.dialog || dialog)) ||
      motionPreference.matches
    ) {
      clearMotion();
      return;
    }
    // A different name interrupts an in-flight fade without reflow or remounting the page.
    lastMotion.current = lastMotion.current === "a" ? "b" : "a";
    element.dataset.routeMotion = lastMotion.current;
    motionPreference.addEventListener("change", clearMotion);
    return () => motionPreference.removeEventListener("change", clearMotion);
  }, [pathname, query, identity, dialog]);
  return (
    <main
      ref={main}
      id="main"
      className="main-content"
      tabIndex={-1}
      onAnimationEnd={(event) => {
        const element = event.currentTarget;
        if (
          event.target === element &&
          event.animationName === `orbita-route-effects-${element.dataset.routeMotion}`
        ) {
          element.removeAttribute("data-route-motion");
        }
      }}
    >
      {children}
    </main>
  );
}

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
        <NavigationLink
          href="/dashboard"
          className="brand-link"
          aria-label="Орбита — главная"
          prefetch={false}
          onNavigate={() => setMenu(false)}
        >
          <Brand />
        </NavigationLink>
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
        <SelectionTrack
          as="nav"
          className="main-nav"
          label="Основная навигация"
          activeKey={pathname}
        >
          {navigation.map(({ href, icon: Icon }) => {
            const title = dashboardTitles[href];
            const sectionActive =
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <NavigationLink
                key={href}
                href={href}
                aria-label={title}
                className={`nav-item ${sectionActive ? "active" : ""}`}
                aria-current={pathname === href ? "page" : sectionActive ? "location" : undefined}
                onNavigate={() => setMenu(false)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{title}</span>
                {href === "/dashboard/notifications" && unread > 0 && (
                  <span className="nav-count" aria-label={`${unread} непрочитанных`}>
                    {unread}
                  </span>
                )}
              </NavigationLink>
            );
          })}
          {data.user.role === "staff" && (
            <NavigationLink
              href="/dashboard/staff"
              className={`nav-item ${pathname === "/dashboard/staff" ? "active" : ""}`}
              aria-current={pathname === "/dashboard/staff" ? "page" : undefined}
              onNavigate={() => setMenu(false)}
            >
              <UsersRound size={19} aria-hidden="true" />
              <span>Очередь деканата</span>
            </NavigationLink>
          )}
        </SelectionTrack>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-spark">
              <Sparkles size={19} aria-hidden="true" />
            </span>
            <h3>Заявка в деканат</h3>
            <p>Заказ справки или подача заявления. Статус сохраняется в документах.</p>
            <NavigationLink
              href="/dashboard/documents?new=1"
              prefetch={false}
              onNavigate={() => setMenu(false)}
            >
              Обратиться в деканат
              <ArrowUpRight size={15} aria-hidden="true" />
            </NavigationLink>
          </div>
          <div className="concept-tag">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>
              Конкурсный концепт
              <br />
              <small>Все данные вымышлены</small>
            </span>
          </div>
          <button
            className="signout"
            onClick={() => {
              clearNavigationHistory();
              void signOut({ callbackUrl: "/login" });
            }}
          >
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
            <NavigationBreadcrumbs userId={data.user.id} />
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <Form
              action="/dashboard/search"
              prefetch={false}
              className="global-search"
              role="search"
            >
              <Search size={17} aria-hidden="true" />
              <input
                name="q"
                aria-label="Поиск по кабинету"
                placeholder="Найти в кабинете…"
                autoComplete="off"
              />
              <kbd>↵</kbd>
            </Form>
            <NavigationLink
              href="/dashboard/notifications"
              className="notification-button icon-button"
              prefetch={false}
              aria-label={`Уведомления, ${unread} непрочитанных`}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </NavigationLink>
            <span className="header-divider" />
            <NavigationLink
              className="user-link"
              href="/dashboard/profile"
              prefetch={false}
              aria-label="Профиль"
            >
              <UserAvatar user={data.user} />
              <span className="user-short">
                <strong>{data.user.firstName}</strong>
                <small>{data.user.role === "staff" ? "Сотрудник деканата" : data.user.group}</small>
              </span>
            </NavigationLink>
          </div>
        </header>
        <DashboardMain pathname={pathname}>{children}</DashboardMain>
        <footer className="site-footer">
          <span>Орбита · Студенческий кабинет</span>
          <span>Неофициальный конкурсный прототип · Все данные вымышлены</span>
        </footer>
      </div>
    </div>
  );
}
