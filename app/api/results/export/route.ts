import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Mock data for export
    const results = [
      { studentName: "John Doe", testName: "Certification Exam A", score: 85, status: "Pass", date: "2025-01-15" },
      { studentName: "Jane Smith", testName: "Certification Exam B", score: 92, status: "Pass", date: "2025-01-14" },
      { studentName: "Mike Johnson", testName: "Certification Exam A", score: 65, status: "Fail", date: "2025-01-13" },
    ]

    // Generate CSV content
    const headers = ["Student Name", "Test Name", "Score", "Status", "Date"]
    const csvContent = [
      headers.join(","),
      ...results.map((r) => [r.studentName, r.testName, r.score, r.status, r.date].join(",")),
    ].join("\n")

    console.log("[v0] Generating test results export")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="test-results.csv"',
      },
    })
  } catch (error) {
    console.error("[v0] Error exporting results:", error)
    return NextResponse.json({ error: "Failed to export results" }, { status: 500 })
  }
}
