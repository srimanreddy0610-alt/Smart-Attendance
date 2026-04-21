import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { 
  User, 
  Student, 
  Parent, 
  Stream, 
  Course, 
  Enrollment, 
  Timetable,
  AttendanceSession,
  AttendanceRecord
} from "@/lib/db/schema";

const STREAMS = [
  { name: "Computer Science", desc: "Department of CSE" },
  { name: "Electronics Engineering", desc: "Department of ECE" },
  { name: "Mechanical Engineering", desc: "Department of ME" },
  { name: "Information Technology", desc: "Department of IT" }
];

const DEPTS = ["CSE", "ECE", "ME", "IT"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ["A", "B", "C"];

const FIRST_NAMES = ["Amit", "Sneha", "Rahul", "Priya", "Vikram", "Anjali", "Karan", "Ishita", "Arjun", "Kavya", "Suresh", "Meena", "Rohan", "Sonal", "Deepak", "Aditi", "Manoj", "Tanvi", "Rajesh", "Pooja"];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Malhotra", "Reddy", "Iyer", "Patel", "Singh", "Das", "Nair", "Joshi", "Kapoor", "Chopra", "Bose", "Menon", "Prasad", "Rao", "Mishra", "Pandey", "Saxena"];

export async function GET() {
  try {
    await getDb();
    const hashedPassword = await bcrypt.hash("password123", 10);

    console.log("[SEED] Clearing database...");
    // 1. Clear ALL data for a fresh start
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Parent.deleteMany({}),
      Stream.deleteMany({}),
      Course.deleteMany({}),
      Enrollment.deleteMany({}),
      Timetable.deleteMany({}),
      AttendanceSession.deleteMany({}),
      AttendanceRecord.deleteMany({})
    ]);

    // 2. Create Streams
    const createdStreams = await Stream.insertMany(
      STREAMS.map(s => ({ name: s.name, description: s.desc }))
    );

    // 3. Create Admins (3)
    for (let i = 1; i <= 3; i++) {
        await User.create({
            email: `admin${i}@smart.com`,
            password: hashedPassword,
            firstName: "System",
            lastName: `Admin${i}`,
            role: "admin"
        });
    }

    // 4. Create Teachers (15)
    const createdTeachers = [];
    for (let i = 0; i < 15; i++) {
        const email = `teacher${i}@smart.com`;
        const fName = FIRST_NAMES[i % FIRST_NAMES.length];
        const lName = LAST_NAMES[i % LAST_NAMES.length];
        
        const teacher = await User.create({
            email,
            password: hashedPassword,
            firstName: fName,
            lastName: lName,
            role: "teacher"
        });
        createdTeachers.push(teacher);
    }

    // 5. Create Courses (30 total)
    const courseData = [];
    const subjects = ["Mathematics", "Physics", "Thermodynamics", "Data Structures", "Algorithms", "Database Systems", "Operating Systems", "Networking", "Artificial Intelligence", "Machine Learning", "Digital Electronics", "Microprocessors", "Strength of Materials", "Fluid Mechanics", "Economics", "Management", "Software Engineering", "Cloud Computing", "Cyber Security", "Embedded Systems", "VLSI Design", "Control Systems", "Analog Circuits", "Communication Systems", "Power Systems", "Manufacturing", "Robotics", "HCI", "Data Science", "Mobile Development"];
    
    for (let i = 0; i < 30; i++) {
        const stream = createdStreams[i % createdStreams.length];
        const teacher = createdTeachers[i % createdTeachers.length];
        const semester = SEMESTERS[i % SEMESTERS.length];
        const section = SECTIONS[i % SECTIONS.length];

        courseData.push({
            name: subjects[i],
            code: `${DEPTS[i % DEPTS.length]}${100 + i}`,
            teacherId: teacher._id,
            streamId: stream._id,
            department: DEPTS[i % DEPTS.length],
            semester: semester,
            section: section
        });
    }
    const createdCourses = await Course.insertMany(courseData);

    // 6. Create Students (60)
    const createdStudentProfiles = [];
    for (let i = 0; i < 60; i++) {
        const email = `student${i}@smart.com`;
        const fName = FIRST_NAMES[(i + 5) % FIRST_NAMES.length];
        const lName = LAST_NAMES[(i + 5) % LAST_NAMES.length];
        const stream = createdStreams[i % createdStreams.length];
        
        const studentUser = await User.create({
            email,
            password: hashedPassword,
            firstName: fName,
            lastName: lName,
            role: "student"
        });

        const profile = await Student.create({
            user: studentUser._id,
            rollNumber: `${DEPTS[i % DEPTS.length]}${2024000 + i}`,
            department: DEPTS[i % DEPTS.length],
            semester: SEMESTERS[i % SEMESTERS.length],
            section: SECTIONS[i % SECTIONS.length],
            streamId: stream._id,
        });
        createdStudentProfiles.push(profile);
    }

    // 7. Create Enrollments
    // Strategy: Match students to courses by Stream, Semester, and Section
    const enrollmentData = [];
    for (const student of createdStudentProfiles) {
        // Find courses that match the student's criteria
        const matchingCourses = createdCourses.filter(c => 
            c.streamId.toString() === student.streamId.toString() &&
            c.semester === student.semester &&
            c.section === student.section
        );
        
        for (const course of matchingCourses) {
            enrollmentData.push({
                courseId: course._id,
                studentId: student._id
            });
        }
    }
    await Enrollment.insertMany(enrollmentData);

    // 8. Create Parents (40)
    for (let i = 0; i < 40; i++) {
        const email = `parent${i}@smart.com`;
        const fName = FIRST_NAMES[(i + 10) % FIRST_NAMES.length];
        const lName = LAST_NAMES[(i + 10) % LAST_NAMES.length];

        const parentUser = await User.create({
            email,
            password: hashedPassword,
            firstName: fName,
            lastName: lName,
            role: "parent"
        });

        const student1 = createdStudentProfiles[i];
        const student2 = i + 20 < createdStudentProfiles.length ? createdStudentProfiles[i + 20] : null;
        
        await Parent.create({
            user: parentUser._id,
            linkedStudents: [student1._id, ...(student2 ? [student2._id] : [])]
        });
    }

    // 9. Add some Timetable entries for Today
    const today = new Date().getDay() || 7;
    const timetableData = [];
    // Just add 15 random timetable entries for today
    for (let i = 0; i < 15; i++) {
        timetableData.push({
            courseId: createdCourses[i % createdCourses.length]._id,
            dayOfWeek: today,
            startTime: "09:00",
            endTime: "10:30",
            roomNumber: `CR-${101 + i}`
        });
    }
    await Timetable.insertMany(timetableData);

    return NextResponse.json({
      message: "COMPLEX Database seeded successfully with LOCAL AUTH!",
      stats: {
        streams: createdStreams.length,
        admins: 3,
        teachers: createdTeachers.length,
        courses: createdCourses.length,
        students: createdStudentProfiles.length,
        enrollments: enrollmentData.length,
        parentsCount: 40,
        timetableForToday: timetableData.length
      },
      credentials_example: [
        { role: "Teacher", email: "teacher0@smart.com", password: "password123" },
        { role: "Student", email: "student0@smart.com", password: "password123" },
        { role: "Parent", email: "parent0@smart.com", password: "password123" },
        { role: "Admin", email: "admin1@smart.com", password: "password123" },
      ],
      note: "All accounts use 'password123'. Email format is role + index + '@smart.com'. Example: teacher0@smart.com, teacher1... teacher14@smart.com"
    });
  } catch (error: any) {
    console.error("Complex seeding error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

