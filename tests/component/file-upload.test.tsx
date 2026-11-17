// @vitest-environment jsdom
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  acceptsFile,
  FileUpload,
  type UploadedFile,
  type UploadFile,
} from "@/components/ui/file-upload";
import { renderWithIntl } from "../helpers/intl";

const pdf = (name = "report.pdf", size = 2000) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf" });

/** An upload the test finishes or fails by hand. */
function controlledUpload() {
  const calls: {
    file: File;
    progress: (fraction: number) => void;
    resolve: (result: { id: string }) => void;
    reject: (error: Error) => void;
    signal: AbortSignal;
  }[] = [];
  const onUpload: UploadFile = (file, { onProgress, signal }) =>
    new Promise((resolve, reject) => {
      calls.push({ file, progress: onProgress, resolve, reject, signal });
    });
  return { calls, onUpload };
}

function Harness({
  onUpload,
  initial = [],
  onChange,
  ...props
}: Partial<React.ComponentProps<typeof FileUpload>> & {
  onUpload: UploadFile;
  initial?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <FileUpload
      aria-label="Attachments"
      {...props}
      value={value}
      onValueChange={(files) => {
        setValue(files);
        onChange?.(files);
      }}
      onUpload={onUpload}
    />
  );
}

const fileInput = (container: HTMLElement) => {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("no file input");
  }
  return input;
};

describe("acceptsFile", () => {
  it("matches extensions, wildcards and exact types", () => {
    const png = new File([""], "a.PNG", { type: "image/png" });
    expect(acceptsFile(png, undefined)).toBe(true);
    expect(acceptsFile(png, ".png")).toBe(true);
    expect(acceptsFile(png, "image/*")).toBe(true);
    expect(acceptsFile(png, "image/jpeg, .pdf")).toBe(false);
    expect(acceptsFile(pdf(), "image/*,.pdf")).toBe(true);
  });
});

describe("FileUpload", () => {
  it("uploads a chosen file with progress and adds it to the value", async () => {
    const user = userEvent.setup();
    const { calls, onUpload } = controlledUpload();
    const onChange = vi.fn();
    const { container } = renderWithIntl(
      <Harness onUpload={onUpload} onChange={onChange} multiple />,
    );
    await user.upload(fileInput(container), pdf());
    act(() => {
      calls[0]?.progress(0.4);
    });
    expect(
      screen.getByRole("progressbar", { name: "Uploading report.pdf" }),
    ).toHaveAttribute("aria-valuenow", "40");
    await act(async () => {
      calls[0]?.resolve({ id: "f1" });
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { id: "f1", name: "report.pdf", size: 2000 },
    ]);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove report.pdf" }),
    ).toBeInTheDocument();
  });

  it("rejects a wrong type or a file over the size limit without sending it", () => {
    const { calls, onUpload } = controlledUpload();
    const { container } = renderWithIntl(
      <Harness
        onUpload={onUpload}
        multiple
        accept=".pdf"
        maxSize={1_000_000}
      />,
    );
    // userEvent.upload drops files that don't match accept; fire change directly.
    const input = fileInput(container);
    fireEvent.change(input, {
      target: {
        files: [
          new File(["x"], "notes.txt", { type: "text/plain" }),
          pdf("big.pdf", 2_000_000),
        ],
      },
    });
    expect(screen.getByText("This type of file isn’t allowed")).toBeVisible();
    expect(screen.getByText("Larger than 1 MB")).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  it("rejects files past maxFiles, counting the stored ones", async () => {
    const user = userEvent.setup();
    const { calls, onUpload } = controlledUpload();
    const { container } = renderWithIntl(
      <Harness
        onUpload={onUpload}
        multiple
        maxFiles={2}
        initial={[{ id: "old", name: "old.pdf", size: 10 }]}
      />,
    );
    await user.upload(fileInput(container), [pdf("a.pdf"), pdf("b.pdf")]);
    expect(calls.map((call) => call.file.name)).toEqual(["a.pdf"]);
    expect(screen.getByText("Only 2 files allowed")).toBeVisible();
  });

  it("retries a failed upload", async () => {
    const user = userEvent.setup();
    const { calls, onUpload } = controlledUpload();
    const { container } = renderWithIntl(<Harness onUpload={onUpload} />);
    await user.upload(fileInput(container), pdf());
    await act(async () => {
      calls[0]?.reject(new Error("offline"));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t upload");
    await user.click(screen.getByRole("button", { name: "Retry report.pdf" }));
    expect(calls).toHaveLength(2);
    expect(
      screen.getByRole("progressbar", { name: "Uploading report.pdf" }),
    ).toBeInTheDocument();
  });

  it("cancels an upload in progress", async () => {
    const user = userEvent.setup();
    const { calls, onUpload } = controlledUpload();
    const onChange = vi.fn();
    const { container } = renderWithIntl(
      <Harness onUpload={onUpload} onChange={onChange} />,
    );
    await user.upload(fileInput(container), pdf());
    await user.click(
      screen.getByRole("button", { name: "Cancel upload of report.pdf" }),
    );
    expect(calls[0]?.signal.aborted).toBe(true);
    await act(async () => {
      calls[0]?.resolve({ id: "late" });
      await Promise.resolve();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("replaces the stored file in single mode and removes it", async () => {
    const user = userEvent.setup();
    const { calls, onUpload } = controlledUpload();
    const onChange = vi.fn();
    const { container } = renderWithIntl(
      <Harness
        onUpload={onUpload}
        onChange={onChange}
        initial={[{ id: "old", name: "old.pdf", size: 10 }]}
      />,
    );
    await user.upload(fileInput(container), pdf("new.pdf"));
    await act(async () => {
      calls[0]?.resolve({ id: "new" });
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { id: "new", name: "new.pdf", size: 2000 },
    ]);
    await user.click(screen.getByRole("button", { name: "Remove new.pdf" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("takes a pasted file", () => {
    const { calls, onUpload } = controlledUpload();
    renderWithIntl(<Harness onUpload={onUpload} />);
    fireEvent.paste(screen.getByRole("button", { name: "Attachments" }), {
      clipboardData: { files: [pdf("pasted.pdf")] },
    });
    expect(calls.map((call) => call.file.name)).toEqual(["pasted.pdf"]);
  });

  it("takes a dropped file", () => {
    const { calls, onUpload } = controlledUpload();
    renderWithIntl(<Harness onUpload={onUpload} />);
    const zone = screen.getByRole("button", { name: "Attachments" });
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
    expect(zone).toHaveAttribute("data-dragging", "true");
    fireEvent.drop(zone, { dataTransfer: { files: [pdf("dropped.pdf")] } });
    expect(zone).not.toHaveAttribute("data-dragging");
    expect(calls.map((call) => call.file.name)).toEqual(["dropped.pdf"]);
  });

  it("offers to change or remove the photo in avatar mode", async () => {
    const user = userEvent.setup();
    const { onUpload } = controlledUpload();
    const onChange = vi.fn();
    renderWithIntl(
      <Harness
        onUpload={onUpload}
        onChange={onChange}
        variant="avatar"
        name="Ayu Lestari"
        aria-label={undefined}
        initial={[{ id: "p", name: "me.png", size: 10, url: "data:," }]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Change photo" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(
      screen.getByRole("button", { name: "Upload photo" }),
    ).toBeInTheDocument();
  });
});
