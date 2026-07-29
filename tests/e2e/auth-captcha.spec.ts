import { expect, test, type Page } from "@playwright/test";

const turnstileScriptPattern = /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;

const turnstileStub = String.raw`
(() => {
  let widgetNumber = 0;
  let tokenNumber = 0;
  const widgets = new Map();
  const state = {
    renders: 0,
    resets: 0,
    removes: 0,
    tokens: [],
    actions: [],
  };

  window.__turnstileTestState = state;
  window.turnstile = {
    render(element, options) {
      const id = 'widget-' + String(++widgetNumber);
      widgets.set(id, options);
      state.renders += 1;
      state.actions.push(options.action);
      window.setTimeout(() => {
        const token = 'turnstile-token-' + String(++tokenNumber);
        state.tokens.push(token);
        options.callback(token);
      }, 300);
      return id;
    },
    reset(id) {
      state.resets += 1;
      const options = widgets.get(id);
      if (!options) throw new Error('Unknown Turnstile widget');
      window.setTimeout(() => {
        const token = 'turnstile-token-' + String(++tokenNumber);
        state.tokens.push(token);
        options.callback(token);
      }, 700);
    },
    remove(id) {
      state.removes += 1;
      widgets.delete(id);
    },
  };
})();
`;

async function installTurnstileStub(page: Page) {
  await page.route(turnstileScriptPattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: turnstileStub,
    });
  });
}

async function getTurnstileState(page: Page) {
  return page.evaluate(() => {
    const state = (window as typeof window & {
      __turnstileTestState?: {
        renders: number;
        resets: number;
        removes: number;
        tokens: string[];
        actions: string[];
      };
    }).__turnstileTestState;

    if (!state) throw new Error("Turnstile test state is unavailable.");
    return state;
  });
}

const scenarios = [
  {
    name: "sign-in",
    path: "/auth/login",
    action: "auth_login",
    fill: async (page: Page) => {
      await page.getByLabel("Email").fill("applicant@example.com");
      await page.getByLabel("Password").fill("incorrect-password");
    },
  },
  {
    name: "sign-up",
    path: "/auth/sign-up",
    action: "auth_signup",
    fill: async (page: Page) => {
      await page.getByLabel("Full name").fill("Test Applicant");
      await page.getByLabel("Email").fill("new-applicant@example.com");
      await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
      await page.getByLabel("Confirm password").fill("incorrect-password");
    },
  },
  {
    name: "password-reset",
    path: "/auth/forgot-password",
    action: "auth_password_reset",
    fill: async (page: Page) => {
      await page.getByLabel("Email").fill("applicant@example.com");
    },
  },
] as const;

for (const scenario of scenarios) {
  test(`${scenario.name} consumes one token and waits for a fresh token before retry`, async ({ page }) => {
    const authRequestBodies: string[] = [];
    await installTurnstileStub(page);

    await page.route(/\/auth\/v1\//, async (route) => {
      const request = route.request();
      const corsHeaders = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": request.headers()["access-control-request-headers"] ?? "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
      };

      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      authRequestBodies.push(request.postData() ?? "");
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }),
      });
    });

    await page.goto(scenario.path);
    const submit = page.locator('button[type="submit"]');

    await expect(submit).toBeDisabled();
    await scenario.fill(page);
    await expect(submit).toBeEnabled({ timeout: 5_000 });
    await expect.poll(async () => (await getTurnstileState(page)).actions.includes(scenario.action)).toBe(true);

    await submit.click();
    await expect.poll(() => authRequestBodies.length).toBe(1);
    expect(authRequestBodies[0]).toContain("turnstile-token-1");
    await expect(page.getByRole("alert").first()).toContainText("Invalid login credentials");
    await expect(submit).toBeDisabled();
    await expect.poll(async () => (await getTurnstileState(page)).resets).toBe(1);

    await expect(submit).toBeEnabled({ timeout: 5_000 });
    await submit.click();
    await expect.poll(() => authRequestBodies.length).toBe(2);
    expect(authRequestBodies[1]).toContain("turnstile-token-2");
    expect(authRequestBodies[1]).not.toContain("turnstile-token-1");
  });
}

test("reset-password page asks for and confirms a new password", async ({ page }) => {
  await page.goto("/auth/reset-password");
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
});
