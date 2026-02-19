"use client";

import { X } from "lucide-react";

interface Props {
  open: boolean;
  url: string | null;
  onClose: () => void;
}

export default function PdfPreviewModal({ open, url, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center">
      <div className="bg-white w-[90vw] h-[90vh] rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold">Certificate Preview</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* PDF */}
        <iframe src={url ?? ""} className="flex-1 w-full" />
      </div>
    </div>
  );
}
