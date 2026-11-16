"use client";

import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton, SkeletonBar } from "@/components/feedback/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Demo, Section } from "./section";

const BADGES = ["default", "secondary", "outline", "destructive"] as const;

export function Feedback() {
  return (
    <>
      <Section id="badge" title="Badge" source="src/components/ui/badge.tsx">
        <Demo label="Variants">
          {BADGES.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </Demo>
      </Section>

      <Section id="toast" title="Toast" source="src/components/ui/sonner.tsx">
        <Demo label="Kinds">
          <Button variant="outline" onClick={() => toast.success("Note saved")}>
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Invite sent to 3 people")}
          >
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Couldn't save the note")}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise((resolve) => setTimeout(resolve, 1500)),
                {
                  loading: "Saving…",
                  success: "Saved",
                  error: "Couldn't save",
                },
              )
            }
          >
            Loading then success
          </Button>
        </Demo>
      </Section>

      <Section
        id="skeleton"
        title="Skeleton"
        source="src/components/feedback/page-skeleton.tsx"
      >
        <Demo label="Bars">
          <div className="flex w-full max-w-md flex-col gap-stack-sm">
            <SkeletonBar className="h-4 w-1/2" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-3/4" />
          </div>
        </Demo>
        <Demo label="Page">
          <PageSkeleton rows={3} className="w-full" />
        </Demo>
      </Section>

      <Section
        id="states"
        title="Empty and error"
        source="src/components/feedback/ (forbidden-state is a whole page: see /forbidden)"
      >
        <EmptyState
          icon={Inbox}
          title="No notes yet"
          description="Notes you write appear here."
          action={<Button>New note</Button>}
        />
        <ErrorState
          title="Couldn't load notes."
          error={new Error("Network request failed")}
          onRetry={() => undefined}
        />
      </Section>
    </>
  );
}
