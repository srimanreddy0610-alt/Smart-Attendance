import mongoose, { Document, Model, Schema } from 'mongoose';

// Enums
export const USER_ROLES = ["teacher", "student", "admin", "parent"] as const;
export const SESSION_STATUSES = ["active", "ended"] as const;
export const ATTENDANCE_STATUSES = ["present", "absent"] as const;

// --- User Schema ---
export interface IUser extends Document {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role: typeof USER_ROLES[number];
  createdAt: Date;
}
const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, enum: USER_ROLES, default: "student", required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

// --- Student Schema ---
export interface IStudent extends Document {
  user: mongoose.Types.ObjectId | IUser | string; 
  rollNumber: string;
  department: string;
  semester: number;
  section: string;
  streamId: mongoose.Types.ObjectId | IStream | string;
  photoUrl?: string;
  faceDescriptor?: string;
  createdAt: Date;
}
const studentSchema = new Schema<IStudent>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rollNumber: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  semester: { type: Number, required: true },
  section: { type: String, required: true },
  streamId: { type: Schema.Types.ObjectId, ref: "Stream", required: true },
  photoUrl: { type: String },
  faceDescriptor: { type: String },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>("Student", studentSchema);

// --- Stream Schema ---
export interface IStream extends Document {
  name: string;
  description?: string;
  createdAt: Date;
}
const streamSchema = new Schema<IStream>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const Stream: Model<IStream> = mongoose.models.Stream || mongoose.model<IStream>("Stream", streamSchema);

// --- Course Schema ---
export interface ICourse extends Document {
  name: string;
  code: string;
  teacherId: mongoose.Types.ObjectId | IUser | string;
  streamId: mongoose.Types.ObjectId | IStream | string;
  department: string;
  semester: number;
  section: string;
  createdAt: Date;
}
const courseSchema = new Schema<ICourse>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  streamId: { type: Schema.Types.ObjectId, ref: "Stream", required: true },
  department: { type: String, required: true },
  semester: { type: Number, required: true },
  section: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>("Course", courseSchema);

// --- Enrollment Schema ---
export interface IEnrollment extends Document {
  courseId: mongoose.Types.ObjectId | ICourse | string;
  studentId: mongoose.Types.ObjectId | IStudent | string;
  enrolledAt: Date;
}
const enrollmentSchema = new Schema<IEnrollment>({
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  enrolledAt: { type: Date, default: Date.now, required: true },
});
export const Enrollment: Model<IEnrollment> = mongoose.models.Enrollment || mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);

// --- Timetable Schema ---
export interface ITimetable extends Document {
  courseId: mongoose.Types.ObjectId | ICourse | string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  createdAt: Date;
}
const timetableSchema = new Schema<ITimetable>({
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  dayOfWeek: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  roomNumber: { type: String },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const Timetable: Model<ITimetable> = mongoose.models.Timetable || mongoose.model<ITimetable>("Timetable", timetableSchema);

// --- AttendanceSession Schema ---
export interface IAttendanceSession extends Document {
  courseId: mongoose.Types.ObjectId | ICourse | string;
  teacherId: mongoose.Types.ObjectId | IUser | string;
  sessionDate: Date;
  startTime: Date;
  endTime?: Date;
  status: typeof SESSION_STATUSES[number];
  accessCode?: string;
  qrUrl?: string; 
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
const attendanceSessionSchema = new Schema<IAttendanceSession>({
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sessionDate: { type: Date, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: SESSION_STATUSES, default: "active", required: true },
  accessCode: { type: String },
  qrUrl: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const AttendanceSession: Model<IAttendanceSession> = mongoose.models.AttendanceSession || mongoose.model<IAttendanceSession>("AttendanceSession", attendanceSessionSchema);

// --- AttendanceRecord Schema ---
export interface IAttendanceRecord extends Document {
  sessionId: mongoose.Types.ObjectId | IAttendanceSession | string;
  studentId: mongoose.Types.ObjectId | IStudent | string;
  status: typeof ATTENDANCE_STATUSES[number];
  markedAt?: Date;
  confidenceScore?: number;
  verificationFrames?: number;
  isManualEntry: boolean;
  markedBy?: mongoose.Types.ObjectId | IUser | string;
  createdAt: Date;
}
const attendanceRecordSchema = new Schema<IAttendanceRecord>({
  sessionId: { type: Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  status: { type: String, enum: ATTENDANCE_STATUSES, default: "absent", required: true },
  markedAt: { type: Date },
  confidenceScore: { type: Number },
  verificationFrames: { type: Number },
  isManualEntry: { type: Boolean, default: false, required: true },
  markedBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now, required: true },
});
export const AttendanceRecord: Model<IAttendanceRecord> = mongoose.models.AttendanceRecord || mongoose.model<IAttendanceRecord>("AttendanceRecord", attendanceRecordSchema);

// --- Parent Schema ---
export interface IParent extends Document {
  user: mongoose.Types.ObjectId | IUser | string;
  linkedStudents: (mongoose.Types.ObjectId | IStudent | string)[];
  createdAt: Date;
}

const parentSchema = new Schema<IParent>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  linkedStudents: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  createdAt: { type: Date, default: Date.now, required: true },
});

export const Parent: Model<IParent> = mongoose.models.Parent || mongoose.model<IParent>("Parent", parentSchema);

// --- ParentLinkOTP Schema ---
export interface IParentLinkOTP extends Document {
  parentId: mongoose.Types.ObjectId | IUser | string;
  studentId: mongoose.Types.ObjectId | IStudent | string;
  otp: string;
  expiresAt: Date;
}

const parentLinkOTPSchema = new Schema<IParentLinkOTP>({
  parentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, 
});

export const ParentLinkOTP: Model<IParentLinkOTP> = mongoose.models.ParentLinkOTP || mongoose.model<IParentLinkOTP>("ParentLinkOTP", parentLinkOTPSchema);
