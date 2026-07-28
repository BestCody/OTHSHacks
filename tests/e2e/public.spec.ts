import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public landing page loads and links to registration", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("OTHacks").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /register/i }).first()).toBeVisible();
});

test("login page has no automatically detectable critical accessibility violations", async ({ page }) => {
  await page.goto("/auth/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
});
