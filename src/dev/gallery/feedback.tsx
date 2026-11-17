"use client";

import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/feedback/toast";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import {
  CardGridSkeleton,
  DetailSkeleton,
  FormSkeleton,
  PageSkeleton,
  SkeletonBar,
} from "@/components/feedback/page-skeleton";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressSteps } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Demo, Section } from "./section";

const BADGES = ["default", "secondary", "outline", "destructive"] as const;
const STATUSES = ["positive", "negative", "warning", "neutral"] as const;
const PEOPLE = [
  { name: "Ayu Lestari" },
  { name: "Budi Santoso" },
  { name: "Citra Dewi" },
  { name: "Dimas Pratama" },
  { name: "Eka Putri" },
  { name: "Fajar Nugroho" },
];

function LiveProgress() {
  const [value, setValue] = useState(10);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => (v >= 100 ? 0 : v + 10));
    }, 600);
    return () => {
      clearInterval(id);
    };
  }, []);
  return <Progress value={value} label="Importing contacts" />;
}

function PendingSubmit() {
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setTimeout(() => {
          setPending(false);
        }, 1500);
      }}
    >
      <SubmitButton pending={pending}>Save changes</SubmitButton>
    </form>
  );
}

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
        <Demo label="Status">
          {STATUSES.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </Demo>
        <Demo label="Status with dot">
          <Badge variant="positive" dot>
            Active
          </Badge>
          <Badge variant="warning" dot>
            Invited
          </Badge>
          <Badge variant="negative" dot>
            Suspended
          </Badge>
          <Badge variant="neutral" dot>
            Archived
          </Badge>
        </Demo>
      </Section>

      <Section id="avatar" title="Avatar" source="src/components/ui/avatar.tsx">
        <Demo label="Sizes">
          <Avatar name="Ayu Lestari" size="sm" />
          <Avatar name="Ayu Lestari" />
          <Avatar name="Ayu Lestari" size="lg" />
        </Demo>
        <Demo label="Broken image falls back to initials">
          <Avatar name="Budi Santoso" src="/does-not-exist.png" />
        </Demo>
        <Demo label="Group (max 4)">
          <AvatarGroup people={PEOPLE} label="6 people with access" />
        </Demo>
      </Section>

      <Section id="alert" title="Alert" source="src/components/ui/alert.tsx">
        <div className="flex flex-col gap-stack-sm">
          <Alert tone="info" title="Scheduled maintenance">
            Sign-in may be slow on Sunday from 02:00 to 03:00.
          </Alert>
          <Alert tone="positive">Your domain is verified.</Alert>
          <Alert
            tone="warning"
            title="You have used 9 of 10 seats"
            action={
              <Button size="sm" variant="outline">
                Add seats
              </Button>
            }
          >
            Invites stop working when every seat is taken.
          </Alert>
          <Alert
            tone="negative"
            title="Sync failed"
            action={<Button size="sm">Retry</Button>}
          >
            We could not reach the calendar service.
          </Alert>
        </div>
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
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Note deleted", {
                action: { label: "Undo", onClick: () => undefined },
              })
            }
          >
            With action
          </Button>
        </Demo>
        <Demo label="Errors stay until dismissed; others close after 4s">
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise((_, reject) =>
                  setTimeout(() => {
                    reject(new Error("offline"));
                  }, 1500),
                ),
                {
                  loading: "Saving…",
                  success: "Saved",
                  error: "Couldn't save",
                },
              )
            }
          >
            Loading then error
          </Button>
          <Button variant="outline" onClick={() => toast.dismiss()}>
            Dismiss all
          </Button>
        </Demo>
      </Section>

      <Section
        id="progress"
        title="Progress and spinner"
        source="src/components/ui/progress.tsx, spinner.tsx"
      >
        <Demo label="Known amount">
          <div className="flex w-full max-w-md flex-col gap-stack-sm">
            <Progress value={30} label="Upload" />
            <LiveProgress />
          </div>
        </Demo>
        <Demo label="Unknown amount">
          <div className="w-full max-w-md">
            <Progress value={null} label="Preparing export" />
          </div>
        </Demo>
        <Demo label="Steps">
          <ProgressSteps
            label="Workspace setup"
            steps={["Company", "Invite team", "Billing", "Done"]}
            current={1}
          />
        </Demo>
        <Demo label="Spinner and pending submit">
          <Spinner />
          <Spinner label="Searching" className="size-5" />
          <PendingSubmit />
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
        <Demo label="Table page">
          <PageSkeleton rows={3} className="w-full" />
        </Demo>
        <Demo label="Card grid">
          <CardGridSkeleton cards={3} className="w-full" />
        </Demo>
        <Demo label="Detail">
          <DetailSkeleton fields={3} className="w-full" />
        </Demo>
        <Demo label="Form">
          <FormSkeleton fields={2} className="w-full" />
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
