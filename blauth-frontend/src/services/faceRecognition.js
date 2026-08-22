import * as faceapi from "@vladmandic/face-api";

export const FACE_MATCH_THRESHOLD = 0.6;

let modelsPromise;

export class FaceRecognitionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FaceRecognitionError";
    this.code = code;
  }
}

// Models and all inference stay in the browser. Nothing from this service is uploaded.
export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]).catch((error) => {
      modelsPromise = undefined;
      throw error;
    });
  }
  return modelsPromise;
}

export async function getFaceDescriptor(input) {
  const detections = await faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) {
    throw new FaceRecognitionError("NO_FACE", "No face was detected. Center your face in the guide and try again.");
  }
  if (detections.length > 1) {
    throw new FaceRecognitionError("MULTIPLE_FACES", "More than one face was detected. Make sure only you are in view.");
  }

  return Array.from(detections[0].descriptor);
}

export function compareFaceDescriptors(reference, current) {
  if (!Array.isArray(reference) || !Array.isArray(current) || reference.length !== current.length || !reference.length) {
    throw new FaceRecognitionError("INVALID_DESCRIPTOR", "The local face descriptor is unavailable or invalid.");
  }

  const distance = Math.sqrt(reference.reduce((total, value, index) => total + ((value - current[index]) ** 2), 0));
  return { distance, isMatch: distance < FACE_MATCH_THRESHOLD };
}
