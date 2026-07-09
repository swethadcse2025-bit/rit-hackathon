"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/ui/button";
import {
  Activity,
  Users,
  Building2,
  Settings,
  ShieldCheck,
  LogOut,
  Bell,
  Search,
  User,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // Enforce roles
  if (user.role !== "DOCTOR" && user.role !== "SYSTEM_ADMIN" && user.role !== "HOSPITAL_ADMIN") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4 bg-card border rounded-xl p-8 shadow-lg">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            This portal is restricted to clinical team members only.
          </p>
          <Button onClick={() => logout()} className="w-full">
            Log Out and Switch Account
          </Button>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/doctor/dashboard", label: "Patient Triage", icon: Users },
    { href: "/hospital/dashboard", label: "Hospital Metrics", icon: Building2 },
    ...(user.role === "SYSTEM_ADMIN"
      ? [{ href: "/admin/portal", label: "System Administration", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/80 bg-card text-card-foreground">
        <div className="h-16 flex items-center px-6 border-b border-border/40 gap-2">
          <Activity className="h-6 w-5 text-primary" />
          <span className="font-bold tracking-tight text-lg">SurgiSense AI</span>
          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">SaaS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-primary font-bold">
              {profile?.name?.slice(0, 2).toUpperCase() || "DR"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold block truncate text-slate-800 dark:text-slate-200">
                {profile?.name || user.name}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {user.role}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </Button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border/40 bg-card flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4 md:gap-0">
            {/* Mobile Sidebar Trigger (Placeholder/Compact logo) */}
            <Activity className="h-6 w-5 text-primary md:hidden" />
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patient registry, records..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary" />
            </Button>
            <div className="h-8 w-px bg-border/40" />
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold hidden sm:inline">{user.email}</span>
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {user.role[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
