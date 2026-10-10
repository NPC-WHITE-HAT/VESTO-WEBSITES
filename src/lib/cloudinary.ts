interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: {
    message?: string;
  };
}

export async function uploadImage(
  file: File,
  uploadPreset: string,
): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/szdhtxss/image/upload',
    {
      method: 'POST',
      body,
    },
  );
  const result: CloudinaryUploadResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error?.message || `Image upload failed (${response.status}).`,
    );
  }

  if (!result.secure_url) {
    throw new Error('Cloudinary did not return a secure image URL.');
  }

  return result.secure_url;
}
