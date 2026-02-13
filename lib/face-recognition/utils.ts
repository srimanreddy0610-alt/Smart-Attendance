"use client";

import { faceapi } from "./loader";

export type FaceDescriptor = number[];

export async function detectFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDescriptor | null> {
  const detection = await faceapi
    .detectSingleFace(input)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return Array.from(detection.descriptor);
}

export function compareFaceDescriptors(
  stored: FaceDescriptor,
  captured: FaceDescriptor
): number {
  const storedFloat = new Float32Array(stored);
  const capturedFloat = new Float32Array(captured);
  const distance = faceapi.euclideanDistance(storedFloat, capturedFloat);
  const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
  return Math.round(similarity);
}

export async function captureMultipleFrames(
  video: HTMLVideoElement,
  count: number = 3,
  intervalMs: number = 500
): Promise<FaceDescriptor[]> {
  const descriptors: FaceDescriptor[] = [];

  for (let i = 0; i < count; i++) {
    const descriptor = await detectFaceDescriptor(video);
    if (descriptor) {
      descriptors.push(descriptor);
    }
    if (i < count - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return descriptors;
}

export function averageDescriptors(
  descriptors: FaceDescriptor[]
): FaceDescriptor {
  if (descriptors.length === 0) throw new Error("No descriptors to average");
  if (descriptors.length === 1) return descriptors[0];

  const len = descriptors[0].length;
  const avg = new Array(len).fill(0);

  for (const desc of descriptors) {
    for (let i = 0; i < len; i++) {
      avg[i] += desc[i];
    }
  }

  return avg.map((v) => v / descriptors.length);
}

export function checkLiveness(descriptors: FaceDescriptor[]): boolean {
  if (descriptors.length < 2) return false;

  for (let i = 1; i < descriptors.length; i++) {
    const similarity = compareFaceDescriptors(descriptors[0], descriptors[i]);
    if (similarity > 99) return false;
    if (similarity < 70) return false;
  }

  return true;
}
