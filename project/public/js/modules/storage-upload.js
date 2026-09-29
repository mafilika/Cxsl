import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { storage, auth } from "../firebase-config.js";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Admin-only uploads (contractors don't have their own accounts in this
 * simplified build) — storage.rules should restrict the contractors/ path
 * to the admin role accordingly. */
export async function uploadContractorImage(file, contractorId, kind = "gallery") {
  if (!auth.currentUser) throw new Error("You must be signed in as admin to upload images.");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Please upload a JPG, PNG, or WEBP image.");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5MB.");

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
  const path = `contractors/${contractorId}/${kind}/${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
