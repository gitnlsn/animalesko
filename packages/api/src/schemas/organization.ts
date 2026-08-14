import { z } from "zod";

/**
 * The organization itself, and its verification.
 *
 * The prototype's "profile" tab in `Layout.tsx` edited a *person* — name,
 * e-mail, phone, location — with hardcoded stats beside it. In a provider panel
 * the thing being administered is the business, which is also what carries the
 * verified badge that consumers see.
 */

export const organizationTypeSchema = z.enum(["SHELTER", "CLINIC", "PETSHOP", "INDEPENDENT"]);

export type OrganizationType = z.infer<typeof organizationTypeSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(80),
  type: organizationTypeSchema,
  description: z.string().trim().max(1000).optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Use o formato (XX) XXXXX-XXXX")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.email("E-mail inválido").optional().nullable().or(z.literal("")),
  addressLine: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras")
    .optional()
    .nullable()
    .or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .optional()
    .nullable()
    .or(z.literal("")),
  avatarUrl: z.url().optional().nullable().or(z.literal("")),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateOrganizationFormValues = z.input<typeof updateOrganizationSchema>;

const TYPE_LABELS_PT_BR: Record<OrganizationType, string> = {
  SHELTER: "Abrigo / ONG",
  CLINIC: "Clínica veterinária",
  PETSHOP: "Petshop",
  INDEPENDENT: "Profissional autônomo",
};

export function formatOrganizationType(type: OrganizationType): string {
  return TYPE_LABELS_PT_BR[type];
}

/** Only shelters may publish animals for adoption. */
export function canPublishAdoptions(type: OrganizationType): boolean {
  return type === "SHELTER";
}

// --- Verification ------------------------------------------------------------

export const verificationStatusSchema = z.enum([
  "NOT_SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

/**
 * Verification documents.
 *
 * URLs rather than files: uploading happens in the app against Vercel Blob, and
 * only the resulting URL reaches this contract — which is what the schema's
 * `documentUrl` / `addressProofUrl` columns were always for. The prototype
 * base64'd files into React state, where they went nowhere.
 */
export const submitVerificationSchema = z.object({
  documentUrl: z.url("Envie o documento de identidade"),
  addressProofUrl: z.url("Envie o comprovante de endereço"),
  certificatesUrl: z.url().optional().nullable().or(z.literal("")),
  experienceYears: z.number().int().min(0).max(80).optional().nullable(),
  experienceDescription: z.string().trim().max(2000).optional().nullable(),
});

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type SubmitVerificationFormValues = z.input<typeof submitVerificationSchema>;

const VERIFICATION_LABELS_PT_BR: Record<VerificationStatus, string> = {
  NOT_SUBMITTED: "Não enviada",
  PENDING: "Em análise",
  APPROVED: "Verificada",
  REJECTED: "Recusada",
};

export function formatVerificationStatus(status: VerificationStatus): string {
  return VERIFICATION_LABELS_PT_BR[status];
}
