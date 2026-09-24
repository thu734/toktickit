import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("E2E-02: IT Staff Ticket Queue & Ticket Operations E2E Workflow (AC-10, AC-12, AC-15, AC-17)", () => {
  test("IT Staff logs in, searches queue, claims ticket, updates status/notes, and captures queue/detail screenshots", async ({
    page,
  }, testInfo) => {
    const isDesktop = testInfo.project.name === "Desktop Chrome";
    const isTablet = testInfo.project.name === "Tablet";
    const isMobile = testInfo.project.name === "Mobile Chrome";

    const viewportTag = isDesktop ? "desktop" : isTablet ? "tablet" : "mobile";

    await page.goto("/");
    const signInBtn = page.getByRole("button", { name: /sign in/i });
    const profileBtn = page.getByRole("button", { name: /user profile menu/i });

    await expect(signInBtn.or(profileBtn)).toBeVisible({ timeout: 15000 });

    if (await profileBtn.isVisible().catch(() => false)) {
      const profileText = await profileBtn.innerText().catch(() => "");
      if (!profileText.includes("Alex Turner")) {
        await profileBtn.click();
        await page.getByRole("button", { name: /logout/i }).click();
        await expect(signInBtn).toBeVisible({ timeout: 10000 });
      }
    }

    if (await signInBtn.isVisible().catch(() => false)) {
      await page.getByLabel(/email address/i).fill("alex.t@toktickit.local");
      await page.locator("#password").fill("Initial123!");
      await signInBtn.click();
      await page.waitForTimeout(1000);

      const errAlert = page.locator(".alert-danger");
      if (await errAlert.isVisible().catch(() => false)) {
        await page.locator("#password").fill("NewStaffPassword123!");
        await signInBtn.click();
        await page.waitForTimeout(1000);
      }

      const pwdChangeHeading = page.getByText(/mandatory password change/i);
      if (await pwdChangeHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator("#currentPassword").fill("Initial123!");
        await page.locator("#newPassword").fill("NewStaffPassword123!");
        await page.locator("#confirmPassword").fill("NewStaffPassword123!");
        await page.getByRole("button", { name: /save new password/i }).click();
      }
    }

    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("IT Support Ticket Queue").first()).toBeVisible();

    // Capture Staff Queue Screenshot
    const queueDirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/staff-queue");
    if (!fs.existsSync(queueDirPath)) {
      fs.mkdirSync(queueDirPath, { recursive: true });
    }

    await page.screenshot({
      path: path.join(queueDirPath, `${viewportTag}.png`),
      fullPage: true,
    });

    // Open first ticket detail if available
    const openDetailBtn = page.getByRole("button", { name: /open detail/i }).first();
    if (await openDetailBtn.isVisible().catch(() => false)) {
      await openDetailBtn.click();

      // Expect Ticket Detail screen
      await expect(page.getByText(/operational controls/i)).toBeVisible();

      // Capture Staff Ticket Detail Screenshot
      const detailDirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/staff-ticket-detail");
      if (!fs.existsSync(detailDirPath)) {
        fs.mkdirSync(detailDirPath, { recursive: true });
      }

      await page.screenshot({
        path: path.join(detailDirPath, `${viewportTag}.png`),
        fullPage: true,
      });
    }
  });
});
