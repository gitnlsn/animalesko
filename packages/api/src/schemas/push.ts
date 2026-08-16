import { z } from "zod";

/**
 * Push device registration.
 *
 * The token is whatever FCM or APNs handed the device; it is opaque to us and
 * deliberately not validated beyond a length bound. Registration tokens have no
 * fixed format, and a stricter rule would reject a valid token the day either
 * service changes its encoding.
 */

export const devicePlatformSchema = z.enum(["IOS", "ANDROID"]);

export type DevicePlatformInput = z.infer<typeof devicePlatformSchema>;

export const registerPushDeviceSchema = z.object({
  token: z.string().trim().min(16).max(512),
  platform: devicePlatformSchema,
});

export const unregisterPushDeviceSchema = z.object({
  token: z.string().trim().min(16).max(512),
});

export type RegisterPushDeviceInput = z.infer<typeof registerPushDeviceSchema>;
export type UnregisterPushDeviceInput = z.infer<typeof unregisterPushDeviceSchema>;
