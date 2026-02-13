import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["teacher", "student"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "ended"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 })
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  rollNumber: varchar("roll_number", { length: 50 }).notNull().unique(),
  department: varchar("department", { length: 100 }).notNull(),
  semester: integer("semester").notNull(),
  section: varchar("section", { length: 10 }).notNull(),
  photoUrl: text("photo_url"),
  faceDescriptor: text("face_descriptor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  department: varchar("department", { length: 100 }).notNull(),
  semester: integer("semester").notNull(),
  section: varchar("section", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const timetable = pgTable("timetable", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  roomNumber: varchar("room_number", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceSessions = pgTable("attendance_sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionDate: timestamp("session_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: sessionStatusEnum("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => attendanceSessions.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  status: attendanceStatusEnum("status").notNull().default("absent"),
  markedAt: timestamp("marked_at"),
  confidenceScore: integer("confidence_score"),
  verificationFrames: integer("verification_frames"),
  isManualEntry: boolean("is_manual_entry").notNull().default(false),
  markedBy: integer("marked_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
