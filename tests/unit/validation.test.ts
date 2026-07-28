import { describe, expect, it } from "vitest";
import { applicationSchema, MAX_UPLOAD_BYTES, statusSchema } from "@/lib/validation";

const valid = {
  intent: "submit",
  legalName: "Test Applicant",
  preferredName: "Test",
  school: "Example Secondary School",
  grade: "11",
  dietaryRequirements: "",
  accessibilityNeeds: "",
  emergencyContactName: "Parent Person",
  emergencyContactPhone: "555-555-5555",
  experienceLevel: "beginner",
  projectInterests: "Web applications",
  codeOfConductAccepted: true,
  privacyAccepted: true,
  guardianConsentConfirmed: true,
};

describe("applicationSchema", () => {
  it("accepts a complete application", () => {
    expect(applicationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unaccepted privacy terms", () => {
    expect(applicationSchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(false);
  });

  it("limits free text", () => {
    expect(applicationSchema.safeParse({ ...valid, projectInterests: "x".repeat(1201) }).success).toBe(false);
  });
});

describe("statusSchema", () => {
  it("rejects arbitrary statuses", () => {
    expect(statusSchema.safeParse({ status: "owner" }).success).toBe(false);
  });
});

describe("upload limits", () => {
  it("is five MiB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});
