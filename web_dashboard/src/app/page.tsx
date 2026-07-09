"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

export default function RootIndexPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === "DOCTOR") {
          router.push("/doctor/dashboard");
        } else if (user.role === "HOSPITAL_ADMIN") {
          router.push("/hospital/dashboard");
        } else if (user.role === "SYSTEM_ADMIN") {
          router.push("/admin/portal");
        } else {
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
