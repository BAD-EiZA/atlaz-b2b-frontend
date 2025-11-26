import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are supported" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    console.log("[v0] Processing bulk import, found", lines.length, "records")

    // Parse CSV (basic parsing, can be enhanced)
    const students = lines
      .slice(1)
      .map((line, index) => {
        const [name, email, studentId] = line.split(",").map((s) => s.trim())
        return {
          id: index,
          name,
          email,
          studentId,
          status: "Active",
        }
      })
      .filter((s) => s.name && s.email)

    return NextResponse.json({
      success: true,
      message: `${students.length} students imported successfully`,
      imported: students.length,
      data: students,
    })
  } catch (error) {
    console.error("[v0] Error processing bulk import:", error)
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 })
  }
}
