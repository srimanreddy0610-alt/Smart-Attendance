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
      <Card className="border-border/50 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Camera View</CardTitle>
          <CardDescription>
            Center your face within the circle
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-square md:aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${step === "processing" ? "opacity-30" : "opacity-100"}`}
            />
            
            {/* Professional Guided Frame */}
            <div className="relative z-10 flex flex-col items-center">
                <div className={`w-64 h-64 md:w-80 md:h-80 border-4 border-dashed rounded-full transition-all duration-300 ${step === "processing" ? "border-primary scale-110" : "border-white/50"}`}>
                    <div className="absolute inset-0 rounded-full bg-white/5 hidden" />
                </div>
                {step === "webcam" && (
                     <p className="mt-4 text-xs font-medium text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                        Detecting Face...
                     </p>
                )}
            </div>

            {step === "processing" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="relative h-24 w-24 mb-6">
                    <Loader2 className="absolute inset-0 h-full w-full animate-spin text-primary opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white">
                        {progress}%
                    </div>
                </div>
                <p className="font-bold text-xl text-white tracking-tight mb-2">{statusMessage}</p>
                <Progress value={progress} className="w-64 h-1.5" />
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="p-6 bg-muted/30">
            {webcamError && (
              <div className="flex items-center gap-2 text-destructive text-sm mb-4 justify-center">
                <AlertCircle className="h-4 w-4" />
                <span>{webcamError}</span>
              </div>
            )}
            {step === "webcam" && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  className="h-11 px-6 font-medium"
                  onClick={() => {
                    stop();
                    setStep("choose");
                  }}
                >
                  Cancel
                </Button>
                {!isActive ? (
                  <Button onClick={start} className="h-11 px-6 shadow-lg shadow-primary/20">Start Camera</Button>
                ) : (
                  <Button onClick={handleWebcamCapture} className="h-11 px-6 shadow-lg shadow-primary/20">
                    <Camera className="h-5 w-5 mr-2" />
                    Capture Face
                  </Button>
                )}
              </div>
            )}
          </div>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-all hover:bg-primary/5 group"
          onClick={() => {
            setStep("webcam");
            start();
          }}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-4">
               <Camera className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-lg">Use Camera</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Capture photo from webcam
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-all hover:bg-primary/5 group"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-4">
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-lg">Upload Photo</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Select file from device
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
