import type { Database } from "@animalesko/db";

/**
 * Delivery to Firebase Cloud Messaging.
 *
 * Both platforms go through FCM — APNs sits behind it — so there is one code
 * path and one credential rather than two.
 *
 * Configured with a service-account JSON in `FCM_SERVICE_ACCOUNT`. Without it
 * this is a no-op, deliberately: the workspace has to run end to end on a fresh
 * clone with no Firebase project, exactly as uploads degrade to a URL field
 * when `BLOB_READ_WRITE_TOKEN` is unset. Everything else about notifications —
 * the row, the badge count, the in-app list — works regardless.
 */

export interface PushMessage {
  userId: string;
  title: string;
  body: string | null;
  /** In-app destination, e.g. "/historico". Delivered as data for the tap handler. */
  href: string | null;
}

export type PushDb = Pick<Database, "pushDevice">;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
    return parsed as ServiceAccount;
  } catch {
    // A malformed credential is a deployment mistake, but it must not take the
    // request with it — the notification itself has already committed.
    console.error("FCM_SERVICE_ACCOUNT is set but is not valid JSON; push is disabled.");
    return null;
  }
}

export function isPushConfigured(): boolean {
  return serviceAccount() !== null;
}

/**
 * Mints an OAuth access token for the FCM v1 API.
 *
 * Done by hand rather than with firebase-admin: that package pulls a large
 * dependency tree and a gRPC stack into a serverless function for what is one
 * signed JWT and one POST.
 */
async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claim)}`;

  const { createSign } = await import("node:crypto");
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key.replace(/\\n/g, "\n"), "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM token exchange failed: ${response.status}`);
  }

  const { access_token } = (await response.json()) as { access_token: string };
  return access_token;
}

/**
 * Sends one notification to every device the user has registered.
 *
 * Called from `notify` via `afterCommit`, so it runs outside the transaction
 * that produced the notification.
 */
export async function sendPush(db: PushDb, message: PushMessage): Promise<void> {
  const account = serviceAccount();
  if (!account) return;

  const devices = await db.pushDevice.findMany({
    where: { userId: message.userId },
    select: { id: true, token: true },
  });

  if (devices.length === 0) return;

  const token = await accessToken(account);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;

  const stale: string[] = [];

  await Promise.all(
    devices.map(async (device) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: device.token,
            notification: {
              title: message.title,
              ...(message.body ? { body: message.body } : {}),
            },
            // Read by the tap handler to route to the right screen.
            data: { href: message.href ?? "/" },
          },
        }),
      });

      if (response.ok) return;

      // 404 UNREGISTERED / 400 INVALID_ARGUMENT mean the token is dead — the
      // app was uninstalled or the token rotated. Keeping it would mean
      // retrying it on every notification forever.
      if (response.status === 404 || response.status === 400) {
        stale.push(device.id);
        return;
      }

      console.error(`FCM send failed for device ${device.id}: ${response.status}`);
    }),
  );

  if (stale.length > 0) {
    await db.pushDevice.deleteMany({ where: { id: { in: stale } } });
  }
}
