import { type NextRequest, NextResponse } from "next/server"

// Mock organization data
let organizationData = {
  name: "Tech Academy International",
  logo: "/tech-academy-logo.jpg",
}

export async function GET() {
  console.log("[v0] Fetching organization details")
  return NextResponse.json({
    success: true,
    data: organizationData,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, logo } = body

    organizationData = {
      ...organizationData,
      ...(name && { name }),
      ...(logo && { logo }),
    }

    console.log("[v0] Organization details updated:", organizationData)

    return NextResponse.json({
      success: true,
      message: "Organization updated successfully",
      data: organizationData,
    })
  } catch (error) {
    console.error("[v0] Error updating organization:", error)
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 })
  }
}
