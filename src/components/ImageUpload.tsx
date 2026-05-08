"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRef, useState } from "react";

export function ImageUpload({
  onUpload,
  label = "Bild hochladen",
  small = false,
  multiple = false,
}: {
  onUpload: (imageId: Id<"_storage">) => Promise<void>;
  label?: string;
  small?: boolean;
  multiple?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        await onUpload(storageId);
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        ref={fileInput}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className={
          small
            ? "px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded transition-colors disabled:opacity-50"
            : "px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
        }
      >
        {uploading ? "Wird hochgeladen..." : label}
      </button>
    </>
  );
}
