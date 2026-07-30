import type { SupabaseClient } from "@supabase/supabase-js";

export const shelterDocumentBucket = "shelter-verification-documents";
export const maxShelterDocumentBytes = 10 * 1024 * 1024;

const allowedDocumentTypes: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function validateShelterDocument(file: File) {
  if (!file.name || file.size === 0) {
    throw new Error("A shelter registration document is required.");
  }

  const extension = allowedDocumentTypes[file.type];
  if (!extension) {
    throw new Error("The document must be a PDF, JPG, or PNG file.");
  }

  if (file.size > maxShelterDocumentBytes) {
    throw new Error("The document must be 10 MB or smaller.");
  }

  return extension;
}

async function ensureDocumentBucket(supabase: SupabaseClient) {
  const { data, error } = await supabase.storage.getBucket(
    shelterDocumentBucket,
  );

  if (data) return;
  if (error && !/not found/i.test(error.message)) throw error;

  const { error: createError } = await supabase.storage.createBucket(
    shelterDocumentBucket,
    {
      public: false,
      fileSizeLimit: maxShelterDocumentBytes,
      allowedMimeTypes: Object.keys(allowedDocumentTypes),
    },
  );

  if (createError && !/already exists/i.test(createError.message)) {
    throw createError;
  }
}

export async function uploadShelterDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File,
) {
  const extension = validateShelterDocument(file);
  await ensureDocumentBucket(supabase);

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(shelterDocumentBucket)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return path;
}

export async function removeShelterDocument(
  supabase: SupabaseClient,
  path: string,
) {
  const { error } = await supabase.storage
    .from(shelterDocumentBucket)
    .remove([path]);
  if (error) throw error;
}

export async function createShelterDocumentUrl(
  supabase: SupabaseClient,
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(shelterDocumentBucket)
    .createSignedUrl(path, 60 * 10);

  if (error) return null;
  return data.signedUrl;
}
