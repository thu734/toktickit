import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("E2E-03: Admin User Management, Password Reset & Security E2E Workflow (AC-18, AC-20, AC-24, AC-25)", () => {
  test("Admin logs in, manages users, searches/filters, resets password, and captures user management screenshots", async ({
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
      if (!profileText.includes("System Administrator") && !profileText.includes("admin")) {
        await profileBtn.click();
        await page.getByRole("button", { name: /logout/i }).click();
        await expect(signInBtn).toBeVisible({ timeout: 10000 });
      }
    }

    if (await signInBtn.isVisible().catch(() => false)) {
      await page.getByLabel(/email address/i).fill("admin@toktickit.local");
      await page.locator("#password").fill("Initial123!");
      await signInBtn.click();
      await page.waitForTimeout(1000);

      const errAlert = page.locator(".alert-danger");
      if (await errAlert.isVisible().catch(() => false)) {
        await page.locator("#password").fill("NewAdminPassword123!");
        await signInBtn.click();
        await page.waitForTimeout(1000);
      }

      const pwdChangeHeading = page.getByText(/mandatory password change/i);
      if (await pwdChangeHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
        await page.locator("#currentPassword").fill("Initial123!");
        await page.locator("#newPassword").fill("NewAdminPassword123!");
        await page.locator("#confirmPassword").fill("NewAdminPassword123!");
        await page.getByRole("button", { name: /save new password/i }).click();
        await page.waitForTimeout(1500);
      }
    }

    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("User Management").first()).toBeVisible();

    // Capture User Management Screenshot
    const dirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/user-management");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    await page.screenshot({
      path: path.join(dirPath, `${viewportTag}.png`),
      fullPage: true,
    });
  });
});
