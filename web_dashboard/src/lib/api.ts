import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface User {
  id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "HOSPITAL_ADMIN" | "SYSTEM_ADMIN";
  name: string;
  createdAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  procedure: string;
  hospital: string;
  surgeon: string;
  comorbidities: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  consentGranted: boolean;
  consentType: string;
  recoveryPassportId: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialty: string;
  hospital: string;
  licenseNumber: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  profile: PatientProfile | DoctorProfile;
  accessToken: string;
  refreshToken: string;
}

export interface RecoveryVersion {
  id: string;
  versionNumber: number;
  recoveryScore: number;
  healingScore: number;
  painLevel: number;
  medicationCompliance: number;
  waterAdherence: number;
  exerciseAdherence: number;
  aiSummary: string;
  doctorNotes: string;
  evidenceSnapshot: any;
  doctorDecisions: any[];
  interventions: any[];
  images: any[];
  documents: any[];
  createdAt: string;
}

export interface RecoveryPassport {
  id: string;
  patientId: string;
  currentRecoveryScore: number;
  status: "ACTIVE" | "RECOVERED" | "COMPLICATED";
  versions: RecoveryVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  patientId: string;
  name: string;
  type: "MEDICATION" | "WALKING" | "HYDRATION" | "EXERCISE" | "IMAGE_UPLOAD" | "APPOINTMENT";
  description: string;
  schedule: string;
  reminders: { time: string }[];
  adheredCount: number;
  missedCount: number;
  adherenceRate: number;
  createdAt: string;
}

export interface CurvePoint {
  day: number;
  score: number;
}

export interface RecoveryTwin {
  id: string;
  patientId: string;
  expectedRecoveryCurve: CurvePoint[];
  actualRecoveryCurve: CurvePoint[];
  deviationTimeline: { date: string; deviationScore: number; severity: string }[];
  projectedRecoveryCompletionDate: string;
  deviationEvents: {
    date: string;
    metric: "HEALING" | "PAIN" | "ADHERENCE" | "INFLAMMATION";
    expectedValue: number;
    actualValue: number;
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
  }[];
  recoveryTwinConfidence: number;
}

export interface ClinicalReplay {
  patientId: string;
  patientName: string;
  procedure: string;
  versionsCount: number;
  story: {
    versionNumber: number;
    date: string;
    recoveryScore: number;
    healingScore: number;
    painLevel: number;
    narration: string;
    significantEvents: string[];
    medications: string[];
    reviews: string[];
  }[];
}

export interface BlockchainRecord {
  blockId: string;
  consentHash: string;
  predictionHash: string;
  doctorReviewHash: string;
  modelVersion: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  payloadHash: string;
  timestamp: string;
}

export interface HospitalAnalytics {
  totalPatients: number;
  averageRecoveryTimeDays: number;
  complicationRatePercentage: number;
  recoveryDistribution: { scoreRange: string; patientCount: number }[];
  procedureOutcomes: { procedure: string; avgScore: number; count: number }[];
  doctorPerformance: { doctorName: string; patientCount: number; avgScore: number }[];
  readmissionTrend: { month: string; rate: number }[];
  populationRisk: { riskLevel: string; patientCount: number }[];
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
