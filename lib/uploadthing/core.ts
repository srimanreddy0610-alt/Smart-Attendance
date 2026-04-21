import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSessionUserId } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  studentPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
