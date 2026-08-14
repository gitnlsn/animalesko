"use client";

import { Button, Input, Label, cn, toast } from "@animalesko/ui";
import { upload } from "@vercel/blob/client";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { usePlus } from "~/lib/org-context.tsx";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Omitted inside `ImageUploadList`, which labels the group instead. */
  label?: string;
  description?: string;
  /** PDFs are allowed for verification documents, not for listing photos. */
  accept?: string;
  disabled?: boolean;
}

/**
 * One file, uploaded straight to Vercel Blob.
 *
 * Degrades to a URL field when the workspace has no Blob store. That matters
 * because this repo otherwise runs entirely on local Docker via `pnpm setup` —
 * requiring a Vercel account before a shelter can add a photo would make two
 * screens dead on a fresh clone. The contract is a URL either way, so the
 * mutation below never knows which path produced it.
 */
export function ImageUpload({
  value,
  onChange,
  label,
  description,
  accept = "image/jpeg,image/png,image/webp",
  disabled,
}: ImageUploadProps) {
  const { uploadsEnabled } = usePlus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob",
      });

      onChange(blob.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
      // Clears the picker so re-selecting the same file fires `change` again.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!uploadsEnabled) {
    return (
      <div className="space-y-2">
        {label ? <Label>{label}</Label> : null}
        <Input
          type="url"
          placeholder="https://…"
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value || null)}
        />
        <p className="text-xs text-muted-foreground">
          Envio de arquivos indisponível — defina <code>BLOB_READ_WRITE_TOKEN</code> para habilitar.
          Por ora, cole a URL de uma imagem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}

      {value ? (
        <div className="relative w-fit">
          {value.endsWith(".pdf") ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="flex h-24 w-40 items-center justify-center rounded-lg border bg-muted text-sm underline"
            >
              Ver documento
            </a>
          ) : (
            <Image
              src={value}
              alt=""
              width={160}
              height={96}
              className="h-24 w-40 rounded-lg border object-cover"
            />
          )}

          <Button
            type="button"
            size="icon"
            variant="destructive"
            aria-label="Remover arquivo"
            className="absolute -top-2 -right-2 size-7"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X size={14} />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex h-24 w-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed",
            "text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Upload className="size-5" />
              Enviar
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

interface ImageUploadListProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
  max?: number;
  disabled?: boolean;
}

/** Several photos, in display order. Used by the adoption listing editor. */
export function ImageUploadList({
  value,
  onChange,
  label,
  max = 8,
  disabled,
}: ImageUploadListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <ImageUpload
            key={url}
            value={url}
            disabled={disabled}
            onChange={(next) =>
              onChange(
                next
                  ? value.map((existing, position) => (position === index ? next : existing))
                  : value.filter((_, position) => position !== index),
              )
            }
          />
        ))}

        {value.length < max ? (
          <ImageUpload
            value={null}
            disabled={disabled}
            onChange={(next) => next && onChange([...value, next])}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">A primeira foto é a que aparece no anúncio.</p>
    </div>
  );
}
