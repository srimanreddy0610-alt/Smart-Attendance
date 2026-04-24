import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { User, Student, Stream, Course, Enrollment, Timetable } from "../lib/db/schema";
import { getDb } from "../lib/db";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please define the MONGO_URI or MONGODB_URI environment variable in .env");
  process.exit(1);
}

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected successfully.");

    // Clear existing data
    await getDb(); // Just in case, though schema import might handle it

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Stream.deleteMany({}),
      Course.deleteMany({}),
      Enrollment.deleteMany({}),
      Timetable.deleteMany({}),
    ]);

    // 1. Create Streams
    console.log("Creating 3 streams...");
    const streamNames = ["Computer Science", "Information Technology", "Electronics"];
    const streams = await Stream.create(streamNames.map(name => ({
      name,
      description: `Department of ${name}`
    })));

    // 2. Create Admins (3)
    console.log("Creating 3 admins...");
    await User.create([
      { email: "admin1@example.com", firstName: "System", lastName: "Admin", role: "admin", password: hashedPassword },
      { email: "admin2@example.com", firstName: "Staff", lastName: "Admin", role: "admin", password: hashedPassword },
      { email: "admin3@example.com", firstName: "Super", lastName: "User", role: "admin", password: hashedPassword },
    ]);

    // 3. Create Teachers (10)
    console.log("Creating 10 teachers...");
    const teacherData = Array.from({ length: 10 }).map((_, i) => ({
      email: `teacher${i + 1}@example.com`,
      firstName: ["Sarah", "David", "John", "Emma", "Michael", "Linda", "Robert", "Jennifer", "William", "Barbara"][i],
      lastName: ["Smith", "Wilson", "Jones", "Taylor", "Brown", "Miller", "Davis", "Garcia", "Rodriguez", "Martinez"][i],
      role: "teacher",
      password: hashedPassword
    }));
    const teachers = await User.create(teacherData);

    // 4. Create Courses (Many)
    console.log("Creating courses across sections...");
    const courseBaseNames = ["Web Development", "Data Structures", "Cloud Computing", "AI & ML", "Networks", "Operating Systems"];
    const sections = ["A", "B", "C"];
    const semesters = [2, 4, 6];
    
    const coursesToCreate: Record<string, unknown>[] = [];
    
    // Distribute courses across streams, semesters, and sections
    streams.forEach((stream, streamIdx) => {
      semesters.forEach(sem => {
        sections.forEach(section => {
          // Assign 2 courses per sem/sec combo
          for (let i = 0; i < 2; i++) {
            const teacherIdx = (streamIdx * 3 + i) % teachers.length;
            coursesToCreate.push({
              name: `${courseBaseNames[(streamIdx * 2 + i) % courseBaseNames.length]} - Sem ${sem}`,
              code: `${stream.name.slice(0, 2).toUpperCase()}-${sem}0${i+1}`,
              teacherId: teachers[teacherIdx]._id,
              streamId: stream._id,
              department: stream.name,
              semester: sem,
              section: section
            });
          }
        });
      });
    });
    
    const courses = await Course.create(coursesToCreate);

    // 5. Create Students (60)
    console.log("Creating 60 students and enrolling them...");
    const studentsData: Record<string, unknown>[] = [];
    const profilesToCreate: Record<string, unknown>[] = [];
    
    for (let i = 0; i < 60; i++) {
      // Logic for distribution
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const streamIdx = i % streams.length;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const semIdx = Math.floor(i / (60 / semesters.length)) % semesters.length;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const secIdx = Math.floor(i / (60 / (semesters.length * sections.length))) % sections.length;
      
      studentsData.push({
        email: `student${i + 1}@example.com`,
        firstName: `Student_${i + 1}`,
        lastName: "Test",
        role: "student",
        password: hashedPassword
      });
    }
    
    const studentUsers = await User.create(studentsData);
    
    for (let i = 0; i < 60; i++) {
      const streamIdx = i % streams.length;
      const sem = semesters[Math.floor(i / 20)]; // 20 per semester
      const section = sections[Math.floor((i % 20) / 7) % 3]; // Rotating sections
      
      profilesToCreate.push({
        user: studentUsers[i]._id,
        rollNumber: `ROLL2024${(i + 1).toString().padStart(3, '0')}`,
        department: streams[streamIdx].name,
        semester: sem,
        section: section,
        streamId: streams[streamIdx]._id
      });
    }
    
    const studentProfiles = await Student.create(profilesToCreate);

    // 6. Enroll Students & Create Timetables
    console.log("Setting up enrollments and timetables...");
    const enrollmentPromises: Promise<unknown>[] = [];
    const timetablePromises: Promise<unknown>[] = [];

    for (const student of studentProfiles) {
      // Find courses matching student's year/sem/sec
      const matchingCourses = courses.filter(c => 
        c.streamId.toString() === student.streamId.toString() && 
        c.semester === student.semester && 
        c.section === student.section
      );

      for (const course of matchingCourses) {
        enrollmentPromises.push(Enrollment.create({
          courseId: course._id,
          studentId: student._id
        }));
      }
    }
    
    // Create broad timetable for everyday usefulness
    courses.forEach((course, idx) => {
        const days = [1, 2, 3, 4, 5];
        days.forEach(day => {
            if ((idx + day) % 3 === 0) { // Spread classes
                timetablePromises.push(Timetable.create({
                    courseId: course._id,
                    dayOfWeek: day,
                    startTime: idx % 2 === 0 ? "09:00" : "11:00",
                    endTime: idx % 2 === 0 ? "11:00" : "13:00",
                    roomNumber: `Room ${100 + (idx % 10)}`
                }));
            }
        });
    });

    await Promise.all(enrollmentPromises);
    await Promise.all(timetablePromises);

    console.log("\n✅ Database scale-up complete!");
    console.log("--------------------------------");
    console.log(`Admins:   3  (admin1@example.com / password123)`);
    console.log(`Teachers: 10 (teacher1-10@example.com / password123)`);
    console.log(`Students: 60 (student1-60@example.com / password123)`);
    console.log(`Courses:  ${courses.length} distributed across streams/sections`);
    console.log("--------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
