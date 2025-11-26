
import uploadFileToS3 from "@/helper/s3Folder";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.type == "image/webp") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = await uploadFileToS3(buffer, file.name, "logo", "image/webp");
      return NextResponse.json(
        { success: true, folder: "cover", url: fileName.url },
        { status: 200 }
      );
    }
    if (file.type == "image/png") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = await uploadFileToS3(buffer, file.name, "logo", "image/png");
      return NextResponse.json(
        { success: true, folder: "cover", url: fileName.url },
        { status: 200 }
      );
    }

    if (file.type == "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = await uploadFileToS3(buffer, file.name, "scope", "application/pdf");
      return NextResponse.json(
        { success: true, folder: "scope", url: fileName.url },
        { status: 200 }
      );
    }
    if (file.type == "audio/mpeg") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = await uploadFileToS3(buffer, file.name, "audio", "audio/mpeg");
      return NextResponse.json(
        { success: true, folder: "audio", url: fileName.url },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
