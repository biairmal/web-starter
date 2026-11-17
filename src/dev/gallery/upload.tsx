"use client";

import { useState } from "react";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import { fakeUploader } from "../fixtures";
import { Demo, Section } from "./section";

const uploader = fakeUploader();
const flakyUploader = fakeUploader(true);
const MB = 1_000_000;

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-stack-xs">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Value({ value }: { value: readonly UploadedFile[] }) {
  return (
    <Text variant="mono" className="break-all text-muted-foreground">
      {JSON.stringify(value.map((file) => file.id))}
    </Text>
  );
}

export function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([
    { id: "file_report", name: "quarterly-report.pdf", size: 2_400_000 },
  ]);
  const [one, setOne] = useState<UploadedFile[]>([]);
  const [photo, setPhoto] = useState<UploadedFile[]>([]);
  const [flaky, setFlaky] = useState<UploadedFile[]>([]);

  return (
    <Section
      id="upload"
      title="File upload"
      source="src/components/ui/file-upload.tsx"
    >
      <Demo label="Several files (images and PDFs, up to 5 MB, at most 4)">
        <Field id="up-many" label="Attachments">
          <FileUpload
            id="up-many"
            multiple
            accept="image/*,.pdf"
            maxSize={5 * MB}
            maxFiles={4}
            hint="Images or PDF"
            value={files}
            onValueChange={setFiles}
            onUpload={uploader}
          />
          <Value value={files} />
        </Field>
      </Demo>
      <Demo label="One file (a new one replaces it)">
        <Field id="up-one" label="Contract">
          <FileUpload
            id="up-one"
            accept=".pdf"
            maxSize={10 * MB}
            hint="PDF"
            value={one}
            onValueChange={setOne}
            onUpload={uploader}
          />
        </Field>
      </Demo>
      <Demo label="Avatar">
        <Field id="up-photo" label="Profile photo">
          <FileUpload
            id="up-photo"
            variant="avatar"
            name="Ayu Lestari"
            accept="image/png,image/jpeg"
            maxSize={2 * MB}
            hint="PNG or JPG"
            value={photo}
            onValueChange={setPhoto}
            onUpload={uploader}
          />
        </Field>
      </Demo>
      <Demo label="Each file's first try fails (shows Retry)">
        <Field id="up-flaky" label="Receipts">
          <FileUpload
            id="up-flaky"
            multiple
            value={flaky}
            onValueChange={setFlaky}
            onUpload={flakyUploader}
          />
          <Value value={flaky} />
        </Field>
      </Demo>
      <Demo label="Disabled">
        <Field id="up-off" label="Attachments">
          <FileUpload
            id="up-off"
            disabled
            value={[]}
            onValueChange={() => undefined}
            onUpload={uploader}
          />
        </Field>
      </Demo>
    </Section>
  );
}
