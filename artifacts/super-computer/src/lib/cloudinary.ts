const CLOUD_NAME = "nf1nkaaf";
const UPLOAD_PRESET = "ml_default";

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  if (!data.secure_url) throw new Error("No URL returned");
  return data.secure_url;
}
