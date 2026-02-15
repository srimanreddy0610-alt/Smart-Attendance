"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  CheckCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { loadFaceModels } from "@/lib/face-recognition/loader";
import {
  detectFaceDescriptor,
  captureMultipleFrames,
  averageDescriptors,
} from "@/lib/face-recognition/utils";
import { useWebcam } from "@/hooks/use-webcam";
import { useUploadThing } from "@/lib/uploadthing/client";
import Image from "next/image";

interface FaceEnrollmentWizardProps {
  hasExistingFace: boolean;
  existingPhotoUrl: string | null;
}

type Step = "choose" | "webcam" | "processing" | "done";

export function FaceEnrollmentWizard({
  hasExistingFace,
  existingPhotoUrl,
}: FaceEnrollmentWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { videoRef, isActive, start, stop, error: webcamError } = useWebcam();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("studentPhoto");

  const initModels = useCallback(async () => {
    if (modelsLoaded) return;
    setIsLoadingModels(true);
    try {
      await loadFaceModels();
      setModelsLoaded(true);
    } catch {
      toast.error("Failed to load face detection models");
    } finally {
      setIsLoadingModels(false);
    }
  }, [modelsLoaded]);

  useEffect(() => {
    initModels();
  }, [initModels]);

  const handleWebcamCapture = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    // Stay on webcam step so video element stays mounted - just show overlay
    setStep("processing");
    setProgress(10);
    setStatusMessage("Detecting face...");

    try {
      // videoRef still works because the video element is kept rendered (hidden)
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        toast.error("No face detected. Please position your face clearly.");
        setStep("webcam");
        return;
      }

      setProgress(30);
      setStatusMessage("Capturing multiple frames for verification...");

      const descriptors = await captureMultipleFrames(videoRef.current, 3, 500);
      if (descriptors.length < 2) {
        toast.error("Could not capture enough frames. Please try again.");
        setStep("webcam");
        return;
      }

      setProgress(50);
      setStatusMessage("Processing face data...");

      const avgDescriptor = averageDescriptors(descriptors);

      // Capture photo from video
      const canvas = canvasRef.current;
      if (!canvas || !videoRef.current) throw new Error("Canvas not available");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to capture"))),
          "image/jpeg",
          0.9
        );
      });

      setCapturedImage(canvas.toDataURL("image/jpeg"));
      stop();

      setProgress(70);
      setStatusMessage("Uploading photo...");

      const file = new File([blob], "face-photo.jpg", { type: "image/jpeg" });
      const uploadResult = await startUpload([file]);

      if (!uploadResult || uploadResult.length === 0) {
        throw new Error("Upload failed");
      }

      const photoUrl = uploadResult[0].ufsUrl;

      setProgress(90);
      setStatusMessage("Saving face data...");

      const res = await fetch("/api/students/face", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: avgDescriptor, photoUrl }),
      });

      if (!res.ok) throw new Error("Failed to save face data");

      setProgress(100);
      setStep("done");
      toast.success("Face registered successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
      setStep("webcam");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !modelsLoaded) return;

    setStep("processing");
    setProgress(10);
    setStatusMessage("Loading image...");

    try {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));

      setProgress(30);
      setStatusMessage("Detecting face...");

      const descriptor = await detectFaceDescriptor(img as unknown as HTMLImageElement);
      if (!descriptor) {
        toast.error("No face detected in the image. Please try another photo.");
        setStep("choose");
        return;
      }

      setCapturedImage(img.src);

      setProgress(60);
      setStatusMessage("Uploading photo...");

      const uploadResult = await startUpload([file]);
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error("Upload failed");
      }

      const photoUrl = uploadResult[0].ufsUrl;

      setProgress(85);
      setStatusMessage("Saving face data...");

      const res = await fetch("/api/students/face", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: descriptor, photoUrl }),
      });

      if (!res.ok) throw new Error("Failed to save face data");

      setProgress(100);
      setStep("done");
      toast.success("Face registered successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
      setStep("choose");
    }
  };

  if (isLoadingModels) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading face detection models...</p>
          <p className="text-sm text-muted-foreground">
            This may take a moment on first load
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Face Registered Successfully!
          </h3>
          <p className="text-muted-foreground mb-6">
            You can now mark attendance using face recognition
          </p>
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured face"
              className="w-32 h-32 rounded-full object-cover mb-4"
            />
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep("choose");
                setCapturedImage(null);
                setProgress(0);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-register
            </Button>
            <Button onClick={() => router.push("/student/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Webcam + processing view (video stays mounted so captureMultipleFrames works)
  if (step === "webcam" || step === "processing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Take Photo</CardTitle>
          <CardDescription>
            Position your face in the center of the frame
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full aspect-4/3 object-cover ${step === "processing" ? "opacity-50" : ""}`}
            />
            {step === "webcam" && (
              <div className="absolute inset-0 border-2 border-dashed border-white/30 m-8 rounded-full" />
            )}
            {step === "processing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
                <p className="font-medium text-white mb-2">{statusMessage}</p>
                <Progress value={progress} className="w-64" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          {webcamError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{webcamError}</span>
            </div>
          )}
          {step === "webcam" && (
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  stop();
                  setStep("choose");
                }}
              >
                Cancel
              </Button>
              {!isActive ? (
                <Button onClick={start}>Start Camera</Button>
              ) : (
                <Button onClick={handleWebcamCapture}>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Choose step
  return (
    <div className="space-y-4">
      {hasExistingFace && existingPhotoUrl && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Image
              src={existingPhotoUrl}
              alt="Current photo"
              width={64}
              height={64}
              className="rounded-full object-cover"
            />
            <div>
              <p className="font-medium">Face already registered</p>
              <p className="text-sm text-muted-foreground">
                You can update your face data by registering again
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            setStep("webcam");
            start();
          }}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-16 w-16 mb-4 text-primary" />
            <h3 className="text-lg font-semibold">Take Photo (Webcam)</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Use your camera to capture a photo
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-16 w-16 mb-4 text-primary" />
            <h3 className="text-lg font-semibold">Upload Photo</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Select an image file from your device
            </p>
          </CardContent>
        </Card>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
