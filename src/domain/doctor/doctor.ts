import { Entity } from "../common/entity";

interface DoctorProps {
  userId: string;
  name: string;
  specialty: string;
  hospital: string;
  licenseNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Doctor extends Entity<DoctorProps> {
  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get specialty(): string {
    return this.props.specialty;
  }

  get hospital(): string {
    return this.props.hospital;
  }

  get licenseNumber(): string {
    return this.props.licenseNumber;
  }

  public static create(props: DoctorProps, id?: string): Doctor {
    return new Doctor(props, id);
  }
}
