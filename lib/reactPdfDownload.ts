"use client";

import React from "react";
import { pdf, DocumentProps } from "@react-pdf/renderer";

export async function downloadReactPdf({
  element,
  filename,
}: {
  element: React.ReactElement<DocumentProps>;
  filename: string;
}) {
  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
