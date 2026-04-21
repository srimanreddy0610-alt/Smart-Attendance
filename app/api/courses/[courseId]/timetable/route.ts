import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Timetable, User } from "@/lib/db/schema";
import { timetableSchema } from "@/lib/validations/timetable";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    await getDb();

    const entries = await Timetable.find({ courseId }).sort({ dayOfWeek: 1, startTime: 1 }).lean();
    
    const formatted = entries.map((e: any) => ({...e, id: e._id}));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[TIMETABLE_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const userRecord = await User.findById(userId);

    if (!userRecord || userRecord.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId } = await params;
    const body = await req.json();
    const parsed = timetableSchema.safeParse({ ...body, courseId: 1 }); // Bypass zod parse strictly on int if needed

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const entry = await Timetable.create({
      courseId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      roomNumber: parsed.data.roomNumber || undefined,
    });

    return NextResponse.json({ ...entry.toObject(), id: entry._id }, { status: 201 });
  } catch (error) {
    console.error("[TIMETABLE_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const userRecord = await User.findById(userId);

    if (!userRecord || userRecord.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const timetableId = searchParams.get("timetableId");

    if (!timetableId) {
      return NextResponse.json(
        { error: "Timetable ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = timetableSchema.safeParse({ ...body, courseId: 1 });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await Timetable.findByIdAndUpdate(
      timetableId,
      {
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        roomNumber: parsed.data.roomNumber || null,
      },
      { new: true }
    );

    return NextResponse.json({ ...updated?.toObject(), id: updated?._id });
  } catch (error) {
    console.error("[TIMETABLE_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const userRecord = await User.findById(userId);

    if (!userRecord || userRecord.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const timetableId = searchParams.get("timetableId");

    if (!timetableId) {
      return NextResponse.json(
        { error: "Timetable ID is required" },
        { status: 400 }
      );
    }

    await Timetable.findByIdAndDelete(timetableId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TIMETABLE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
