"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { faceapi } from "@/lib/face-recognition/loader";

interface FaceDetectionResult {
  isDetecting: boolean;
  faceDetected: boolean;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

export function useFaceDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean = true,
  intervalMs: number = 500
): FaceDetectionResult {
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [boundingBox, setBoundingBox] = useState<FaceDetectionResult["boundingBox"]>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!enabled || !videoRef.current) {
      setFaceDetected(false);
      setBoundingBox(null);
      return;
    }

    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      setIsDetecting(true);

      try {
        const detection = await faceapi.detectSingleFace(videoRef.current);
        if (detection) {
          setFaceDetected(true);
          const box = detection.box;
          setBoundingBox({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          });
        } else {
          setFaceDetected(false);
          setBoundingBox(null);
        }
      } catch {
        setFaceDetected(false);
        setBoundingBox(null);
      } finally {
        setIsDetecting(false);
      }
    };

    intervalRef.current = setInterval(detect, intervalMs);
    detect();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, videoRef, intervalMs]);

  return { isDetecting, faceDetected, boundingBox };
}
