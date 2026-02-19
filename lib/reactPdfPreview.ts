"use client";

import React from "react";
import { pdf, DocumentProps } from "@react-pdf/renderer";

export async function generatePdfUrl(
  element: React.ReactElement<DocumentProps>
) {
  const blob = await pdf(element).toBlob();
  return URL.createObjectURL(blob); // ⬅️ return URL instead of download
}
