"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, LayoutGrid, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminStreamsPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newStream, setNewStream] = useState({ name: "", description: "" });
  const [open, setOpen] = useState(false);

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/streams");
      const data = await res.json();
      setStreams(data);
    } catch (error) {
      toast.error("Failed to fetch streams");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleCreate = async () => {
    if (!newStream.name) return toast.error("Stream name is required");
    setIsCreating(true);
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStream),
      });
      if (!res.ok) throw new Error("Failed to create stream");
      toast.success("Stream created successfully");
      setNewStream({ name: "", description: "" });
      setOpen(false);
      fetchStreams();
    } catch (error) {
      toast.error("Error creating stream");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stream Management</h1>
          <p className="text-muted-foreground">Manage academic streams and departments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" />
              New Stream
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Stream</DialogTitle>
              <DialogDescription>
                Group your courses by creating a new academic stream (e.g., Computer Science, Business).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stream Name</label>
                <Input 
                  placeholder="e.g. B.Tech Computer Science" 
                  value={newStream.name}
                  onChange={(e) => setNewStream({...newStream, name: e.target.value})}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input 
                  placeholder="e.g. 4-year undergraduate program"
                  value={newStream.description}
                  onChange={(e) => setNewStream({...newStream, description: e.target.value})}
                  className="h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Stream
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream) => (
            <Card key={stream._id} className="hover:shadow-xl transition-all border-border/50 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">{stream.name}</CardTitle>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {stream.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">0</span> Courses
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">0</span> Students
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {streams.length === 0 && (
            <div className="col-span-full text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
              <p className="text-muted-foreground">No streams created yet.</p>
              <Button variant="link" onClick={() => setOpen(true)}>Create your first stream</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

