import { test, expect } from "@playwright/test";

// The spec's "Done means": tap a test URL, rate, submit with and without an email,
// see the thank-you. (Row storage is proven separately by the API + unit tests.)

test("rate and submit WITHOUT an email → stored + thank-you", async ({ page }) => {
  await page.goto("/stoked?e=e2e&b=daps");
  await page.getByRole("button", { name: "Rate 4 out of 5" }).click();

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/submit") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Submit" }).click(),
  ]);

  expect(res.status()).toBe(200);
  await expect(page.getByText("You're in.")).toBeVisible();
});

test("rate and submit WITH an email → stored + thank-you", async ({ page }) => {
  await page.goto("/stoked?e=e2e&b=daps&c=42");
  await page.getByRole("button", { name: "Rate 5 out of 5" }).click();
  await page.getByPlaceholder("you@email.com — optional").fill("e2e@example.com");

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/submit")),
    page.getByRole("button", { name: "Submit" }).click(),
  ]);

  expect(res.status()).toBe(200);
  await expect(page.getByText("You're in.")).toBeVisible();
});

test("submitting without a rating is blocked (rating is required)", async ({ page }) => {
  await page.goto("/stoked");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Tap a number to rate first.")).toBeVisible();
});
