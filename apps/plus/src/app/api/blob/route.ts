import { auth } from "@animalesko/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Signed client uploads to Vercel Blob.
 *
 * The browser sends the file straight to Blob storage rather than through this
 * route, which is what keeps a 5 MB photo off the serverless function's request
 * body. This endpoint only mints the short-lived token that authorises one
 * upload — so the authorisation checks below are the whole security boundary.
 */

/** Filenames are namespaced per organization; nothing is trusted from the client. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // The app degrades to URL fields when storage is not configured (see
    // `image-upload.tsx`); reaching this route anyway is a misconfiguration
    // worth reporting rather than a 500 from deep inside the SDK.
    return NextResponse.json(
      { error: "Armazenamento de arquivos não configurado (BLOB_READ_WRITE_TOKEN)." },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        // Re-checked here rather than trusted from the client payload: this
        // callback is the only thing standing between a stranger and a token
        // that writes to the project's blob store.
        const session = await auth.api.getSession({ headers: await headers() });
        const organizations = session?.organizations ?? [];

        if (!session?.user || organizations.length === 0) {
          throw new Error("Sem permissão para enviar arquivos.");
        }

        const activeId = session.activeOrganizationId ?? organizations[0]?.id;

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          // Random suffix so two shelters uploading "rg.pdf" cannot collide,
          // and so a guessed path does not resolve.
          addRandomSuffix: true,
          pathname: `org/${activeId}/${pathname}`,
          tokenPayload: JSON.stringify({ organizationId: activeId, userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do: the URL reaches the database through the normal tRPC
        // mutation the form submits, not through this webhook. Kept because
        // `handleUpload` requires the callback.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload." },
      { status: 400 },
    );
  }
}
