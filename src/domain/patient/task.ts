import { Entity } from "../common/entity";

export enum TaskType {
  MEDICATION = "MEDICATION",
  WALKING = "WALKING",
  HYDRATION = "HYDRATION",
  EXERCISE = "EXERCISE",
  IMAGE_UPLOAD = "IMAGE_UPLOAD",
  APPOINTMENT = "APPOINTMENT"
}

export interface TaskReminder {
  time: string; // e.g. "08:00", "14:00", "20:00"
}

export interface CompletionEntry {
  completedAt: Date;
  adhered: boolean;
}

interface TaskProps {
  patientId: string;
  name: string;
  type: TaskType;
  description: string;
  schedule: string; // e.g. "DAILY", "WEEKLY"
  reminders: TaskReminder[];
  completionHistory: CompletionEntry[];
  adherenceScore: number; // 0 - 100
  createdAt?: Date;
  updatedAt?: Date;
}

export class Task extends Entity<TaskProps> {
  get patientId(): string {
    return this.props.patientId;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): TaskType {
    return this.props.type;
  }

  get description(): string {
    return this.props.description;
  }

  get schedule(): string {
    return this.props.schedule;
  }

  get reminders(): TaskReminder[] {
    return this.props.reminders;
  }

  get completionHistory(): CompletionEntry[] {
    return this.props.completionHistory;
  }

  get adherenceScore(): number {
    return this.props.adherenceScore;
  }

  public logCompletion(completedAt: Date, adhered: boolean): void {
    this.props.completionHistory.push({ completedAt, adhered });
    this.calculateAdherence();
    this.props.updatedAt = new Date();
  }

  private calculateAdherence(): void {
    if (this.props.completionHistory.length === 0) {
      this.props.adherenceScore = 100;
      return;
    }
    const adheredCount = this.props.completionHistory.filter(h => h.adhered).length;
    this.props.adherenceScore = Math.round((adheredCount / this.props.completionHistory.length) * 100);
  }

  public static create(props: TaskProps, id?: string): Task {
    return new Task(props, id);
  }
}
