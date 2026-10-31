import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getNavItemsForRole } from '../config/navConfig.js';
import Badge from '../components/Badge.jsx';
import {
  Menu,
  X,
  LogOut,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Desktop collapsible state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('brightloop_nav_collapsed') === 'true';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Toggle and persist desktop collapse
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('brightloop_nav_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = getNavItemsForRole(user?.role);

  // Generate breadcrumbs from pathname
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentTitle = pathParts[pathParts.length - 1]
    ? pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Dashboard';

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col md:flex-row antialiased overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Fixed Sidebar: Strictly Locked to Screen Length (h-screen) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 h-screen shrink-0 flex flex-col bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 text-white border-r border-slate-800/80 shadow-2xl transition-[width,transform] duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand Header (Fixed Top of Sidebar) */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-slate-800/80">
          <Link
            to="/"
            className="flex items-center gap-3 overflow-hidden group focus:outline-none"
            title="Brightloop"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>

            <div
              className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'
              }`}
            >
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Brightloop
              </span>
              <div className="text-[10px] font-medium text-indigo-400/80 tracking-wider uppercase">
                Subscription Engine
              </div>
            </div>
          </Link>

          {/* Desktop Collapse Toggle on Header */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className="shrink-0 px-4 pt-4 pb-1">
          <div
            className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-opacity duration-200 ${
              isCollapsed ? 'md:text-center md:tracking-normal' : 'px-3'
            }`}
          >
            {isCollapsed ? (
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500/50" />
            ) : user?.role === 'CUSTOMER' ? (
              'Customer Portal'
            ) : (
              'Workspace Hub'
            )}
          </div>
        </div>

        {/* Scrollable Navigation Items Inside Sidebar */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`));

            return (
              <div key={item.path} className="relative group">
                <Link
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />

                  <span
                    className={`whitespace-nowrap transition-all duration-200 ${
                      isCollapsed ? 'md:hidden' : 'inline-block'
                    }`}
                  >
                    {item.name}
                  </span>

                  {isActive && !isCollapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </Link>

                {/* Floating Tooltip when Sidebar is Collapsed */}
                {isCollapsed && (
                  <div className="hidden md:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 items-center gap-2">
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Quick Collapse Footer Bar (Desktop) */}
        <div className="shrink-0 hidden md:flex items-center justify-between px-3.5 py-2.5 border-t border-slate-800/60 bg-slate-950/30">
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Toggle Collapse (Ctrl+B)"
          >
            {isCollapsed ? (
              <ChevronsRight className="w-4 h-4 text-indigo-400" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-[11px]">Collapse View</span>
                <kbd className="ml-auto px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                  Ctrl+B
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* User Card in Sidebar Footer */}
        <div className="shrink-0 p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div
            className={`flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800/40 transition-colors ${
              isCollapsed ? 'md:justify-center' : ''
            }`}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 text-indigo-300 flex items-center justify-center font-bold text-sm border border-slate-600/60 shadow-sm shrink-0">
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>

            <div
              className={`flex-1 min-w-0 transition-all duration-200 ${
                isCollapsed ? 'md:hidden' : 'block'
              }`}
            >
              <p className="text-xs font-semibold text-white truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
              </p>
              <div className="mt-0.5">
                <Badge status={user?.role} className="text-[9px] px-1.5 py-0" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area: Strictly Locked to Screen Length */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Fixed Top Navbar */}
        <header className="h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Quick Nav Toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition-all"
              title={isCollapsed ? 'Expand navigation (Ctrl+B)' : 'Collapse navigation (Ctrl+B)'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* Page Title */}
            <div className="flex items-center ml-1">
              <span className="font-semibold text-slate-900 bg-slate-100/90 text-xs sm:text-sm px-2.5 py-1 rounded-lg border border-slate-200/60">
                {currentTitle}
              </span>
            </div>
          </div>

          {/* Right Header: System Status & User Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Status Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Engine</span>
            </div>

            {/* User Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full sm:rounded-xl hover:bg-slate-100/80 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white">
                  {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <span className="text-xs font-semibold text-slate-800 block leading-tight">
                    {user?.first_name || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize block">
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'User Account'}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                      <div className="mt-2">
                        <Badge status={user?.role} />
                      </div>
                    </div>

                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Viewport: ONLY this area scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
          <div className="max-w-7xl w-full mx-auto pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
