import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

export const applicationSchema = z.object({
  intent: z.enum(["save", "submit"]),
  legalName: trimmed(120).min(2),
  preferredName: trimmed(80).optional().default(""),
  school: trimmed(160).min(2),
  grade: z.enum(["9", "10", "11", "12", "other"]),
  dietaryRequirements: trimmed(1000).optional().default(""),
  accessibilityNeeds: trimmed(1000).optional().default(""),
  emergencyContactName: trimmed(120).min(2),
  emergencyContactPhone: trimmed(40).min(7),
  experienceLevel: z.enum(["new", "beginner", "intermediate", "advanced"]),
  projectInterests: trimmed(1200).optional().default(""),
  codeOfConductAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  guardianConsentConfirmed: z.boolean(),
});

export const profileSchema = z.object({
  fullName: trimmed(120).min(2),
  school: trimmed(160).min(2),
  grade: z.enum(["9", "10", "11", "12", "other"]),
});

export const statusSchema = z.object({
  status: z.enum(["draft", "submitted", "accepted", "waitlisted", "rejected"]),
  note: trimmed(1000).optional().default(""),
});

export const authSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  fullName: trimmed(120).optional(),
  captchaToken: z.string().optional(),
});

export const contactSchema = z.object({
  name: trimmed(120).min(2),
  email: z.string().trim().email().max(254),
  message: trimmed(3000).min(10),
});

export const allowedUploadTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
]);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
