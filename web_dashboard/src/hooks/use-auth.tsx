"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, User, PatientProfile, DoctorProfile } from "../lib/api";

interface AuthContextType {
  user: User | null;
  profile: PatientProfile | DoctorProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  sessions: any[];
  devices: any[];
  refreshAuth: () => Promise<void>;
  fetchSessionsAndDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | DoctorProfile | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const hydrateState = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedProfile = localStorage.getItem("profile");
      const storedToken = localStorage.getItem("accessToken");

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
      }
    } catch (err) {
      console.error("Failed to hydrate auth state", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hydrateState();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { user: loggedUser, profile: userProfile, accessToken, refreshToken } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(loggedUser));
      localStorage.setItem("profile", JSON.stringify(userProfile));

      setUser(loggedUser);
      setProfile(userProfile);

      // Route based on role
      if (loggedUser.role === "DOCTOR") {
        router.push("/doctor/dashboard");
      } else if (loggedUser.role === "HOSPITAL_ADMIN") {
        router.push("/hospital/dashboard");
      } else if (loggedUser.role === "SYSTEM_ADMIN") {
        router.push("/admin/portal");
      } else {
        // Patient dashboard is Flutter app, but in web we can redirect or show generic dashboard
        router.push("/");
      }
    } catch (err: any) {
      localStorage.clear();
      throw err.response?.data?.error || err.message || "Login failed";
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/register", data);
      const { user: registeredUser, profile: userProfile, accessToken, refreshToken } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(registeredUser));
      localStorage.setItem("profile", JSON.stringify(userProfile));

      setUser(registeredUser);
      setProfile(userProfile);

      if (registeredUser.role === "DOCTOR") {
        router.push("/doctor/dashboard");
      } else if (registeredUser.role === "HOSPITAL_ADMIN") {
        router.push("/hospital/dashboard");
      } else if (registeredUser.role === "SYSTEM_ADMIN") {
        router.push("/admin/portal");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      throw err.response?.data?.error || err.message || "Registration failed";
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Auth logout endpoint error", err);
    } finally {
      localStorage.clear();
      setUser(null);
      setProfile(null);
      setSessions([]);
      setDevices([]);
      setIsLoading(false);
      router.push("/login");
    }
  };

  const fetchSessionsAndDevices = async () => {
    try {
      const [sessionsRes, devicesRes] = await Promise.all([
        api.get("/auth/sessions"),
        api.get("/auth/devices"),
      ]);
      setSessions(sessionsRes.data || []);
      setDevices(devicesRes.data || []);
    } catch (err) {
      console.error("Failed to query sessions or devices", err);
    }
  };

  const refreshAuth = async () => {
    // Attempt state check or token refresh
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      // We can trigger profile query if we want to synchronize info, otherwise keep hydrated
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        sessions,
        devices,
        refreshAuth,
        fetchSessionsAndDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
