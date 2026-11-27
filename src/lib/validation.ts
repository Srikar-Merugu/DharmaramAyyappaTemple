import { z } from "zod";

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Strip leading 91 or 0 for 10-digit Indian numbers
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13;
    },
    { message: "Invalid mobile number (enter 10 digits)" }
  );

export const memberInputSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: optionalPhoneSchema,
  village: z.string().trim().max(100).optional().nullable(),
});

export const individualRegistrationSchema = z.object({
  type: z.literal("individual"),
  annadanamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  batchId: z.string().min(1, "Batch is required"),
  member: memberInputSchema,
  idempotencyKey: z.string().max(100).optional().nullable(),
});

export const groupRegistrationSchema = z.object({
  type: z.literal("group"),
  annadanamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  batchId: z.string().min(1, "Batch is required"),
  groupName: z.string().trim().max(100).optional().nullable(),
  leaderName: z.string().trim().min(2, "Leader name is required").max(100),
  leaderPhone: optionalPhoneSchema,
  leaderVillage: z.string().trim().max(100).optional().nullable(),
  leaderAttending: z.boolean().default(true),
  members: z.array(memberInputSchema).max(30),
  idempotencyKey: z.string().max(100).optional().nullable(),
});

export const publicRegistrationSchema = z.discriminatedUnion("type", [
  individualRegistrationSchema,
  groupRegistrationSchema,
]);

export const walkinSchema = z.object({
  annadanamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  batchId: z.string().min(1),
  fullName: z.string().trim().min(2, "Name is required").max(100),
  phone: optionalPhoneSchema,
  village: z.string().trim().max(100).optional().nullable(),
});
