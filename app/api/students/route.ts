import { type NextRequest, NextResponse } from "next/server"

// Mock database
const studentsDb: any[] = [
  { id: 1, name: "John Doe", email: "john@example.com", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", status: "Active" },
]

export async function GET() {
  console.log("[v0] Fetching students list")
  return NextResponse.json({
    success: true,
    data: studentsDb,
    total: studentsDb.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      email, 
      username,
      password,
      role,
      test_name,
      test_type_id,
      quota,
      currency,
      expired_date
    } = body

    // Validation for user data
    if (!name || !email || !username) {
      return NextResponse.json(
        { error: "Name, email, and username are required" }, 
        { status: 400 }
      )
    }

    // Validation for quota data
    if (!test_name || !test_type_id || !quota) {
      return NextResponse.json(
        { error: "Test name, test type ID, and quota are required" }, 
        { status: 400 }
      )
    }

    // Check for duplicate email or username
    if (studentsDb.some((s) => s.email === email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    if (studentsDb.some((s) => s.username === username)) {
      return NextResponse.json({ error: "Username already registered" }, { status: 409 })
    }

    const newStudent = {
      id: studentsDb.length + 1,
      name,
      email,
      username,
      role: role || "User",
      status: "Active",
      quota: {
        test_name,
        test_type_id,
        quota,
        currency: currency || "IDR",
        expired_date: expired_date || null,
      },
      createdAt: new Date().toISOString(),
    }

    studentsDb.push(newStudent)
    console.log("[v0] New student added with quota:", newStudent)

    return NextResponse.json(
      {
        success: true,
        message: "Student added successfully",
        data: newStudent,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error adding student:", error)
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 })
  }
}
