const DATABASE_NAME = "blauth-biometric";
const STORE_NAME = "descriptors";
const DESCRIPTOR_KEY = "enrolled";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEnrolledDescriptor(descriptor) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(Array.from(descriptor), DESCRIPTOR_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getEnrolledDescriptor() {
  const database = await openDatabase();
  const descriptor = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(DESCRIPTOR_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return descriptor;
}

export async function createBiometricCommitment(descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length === 0 || descriptor.some((value) => !Number.isFinite(value))) {
    throw new Error("The local biometric descriptor is invalid.");
  }

  const bytes = new Uint8Array(descriptor.length * 4);
  const view = new DataView(bytes.buffer);
  descriptor.forEach((value, index) => view.setFloat32(index * 4, value, false));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")}`;
}
