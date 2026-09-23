import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("E2E-01: Full Authentication & Password Change E2E Workflow (AC-01, AC-02, AC-04, AC-05)", () => {
  test("authenticates, handles mandatory password change, navigates shell, captures screenshots, and logs out", async ({
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
      await profileBtn.click();
      await page.getByRole("button", { name: /logout/i }).click();
      await expect(signInBtn).toBeVisible({ timeout: 10000 });
    }

    await page.getByLabel(/email address/i).fill("jennifer.a@toktickit.local");
    await page.locator("#password").fill("Initial123!");
    await signInBtn.click();
    await page.waitForTimeout(1000);

    const errAlert = page.locator(".alert-danger");
    if (await errAlert.isVisible().catch(() => false)) {
      await page.locator("#password").fill("NewRequesterPassword123!");
      await signInBtn.click();
      await page.waitForTimeout(1000);
    }

    const pwdChangeHeading = page.getByText(/mandatory password change/i);
    if (await pwdChangeHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator("#currentPassword").fill("Initial123!");
      await page.locator("#newPassword").fill("NewRequesterPassword123!");
      await page.locator("#confirmPassword").fill("NewRequesterPassword123!");
      await page.getByRole("button", { name: /save new password/i }).click();
      await page.waitForTimeout(2000);
    }

    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/my tickets/i).first()).toBeVisible({ timeout: 10000 });

    // Capture Authentication Screenshot (Requester authenticated shell)
    const dirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/authentication");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    await page.screenshot({
      path: path.join(dirPath, `${viewportTag}.png`),
      fullPage: true,
    });

    // Logout
    await profileBtn.click();
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(signInBtn).toBeVisible({ timeout: 10000 });
  });
});
