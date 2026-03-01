"use client";

import { useRef, useState } from "react";

type Props = {
  jobDescription: string;
  onChange: (text: string) => void;
  onGenerate: () => Promise<void> | void;
  generating: boolean;
  onClearAll: () => void;
};

export function JobDescriptionPanel({
  jobDescription,
  onChange,
  onGenerate,
  generating,
  onClearAll,
}: Props) {
  const [fileStatus, setFileStatus] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setFileStatus("Please upload a .txt file for now.");
      return;
    }
    setFileStatus("Reading file…");
    const text = await file.text();
    onChange(text);
    setFileStatus(`Loaded ${file.name}`);
  };

  const canGenerate = jobDescription.trim().length >= 20;

  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-semibold text-foreground">
        1) Job Description
      </h2>
      <p className="mt-1 text-xs text-muted">
        Paste the job description. We’ll generate flashcard-style questions from it.
      </p>

      <textarea
        className="mt-3 w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted"
        rows={10}
        placeholder="Paste job description here…"
        value={jobDescription}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onGenerate()}
          disabled={generating || !canGenerate}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          title={!canGenerate ? "Paste a bit more text first." : "Generate questions"}
        >
          {generating ? "Generating…" : "Generate Questions"}
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          Upload .txt (optional)
        </button>

        <button
          type="button"
          onClick={onClearAll}
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
        >
          Clear Workspace
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {fileStatus ? (
        <p className="mt-2 text-xs text-muted">{fileStatus}</p>
      ) : null}
    </section>
  );
}
