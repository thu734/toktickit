import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("E2E-01: Full Authentication & Password Change E2E Workflow (AC-01, AC-02, AC-04, AC-05)", () => {
  const dirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/authentication");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

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

    // Try logging in with Jennifer Anderson
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

    let pwdChangeHeading = page.getByText(/mandatory password change/i);
    let showedPasswordChange = await pwdChangeHeading.isVisible({ timeout: 3000 }).catch(() => false);

    if (showedPasswordChange) {
      if (isDesktop) {
        // Assert password complexity checklist is rendered
        await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
        await page.screenshot({
          path: path.join(dirPath, "mandatory-password-change.png"),
          fullPage: true,
        });
      }
      await page.locator("#currentPassword").fill("Initial123!");
      await page.locator("#newPassword").fill("NewRequesterPassword123!");
      await page.locator("#confirmPassword").fill("NewRequesterPassword123!");
      await page.getByRole("button", { name: /save new password/i }).click();
      await page.waitForTimeout(2000);
    }

    // If Jennifer didn't show password change on desktop, use Michael Brown to capture mandatory-password-change.png
    if (isDesktop && !showedPasswordChange && !fs.existsSync(path.join(dirPath, "mandatory-password-change.png"))) {
      if (await profileBtn.isVisible().catch(() => false)) {
        await profileBtn.click();
        await page.getByRole("button", { name: /logout/i }).click();
        await expect(signInBtn).toBeVisible({ timeout: 10000 });
      }
      await page.getByLabel(/email address/i).fill("michael.b@toktickit.local");
      await page.locator("#password").fill("Initial123!");
      await signInBtn.click();
      await page.waitForTimeout(1000);

      const mbPwdHeading = page.getByText(/mandatory password change/i);
      if (await mbPwdHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
        await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
        await page.screenshot({
          path: path.join(dirPath, "mandatory-password-change.png"),
          fullPage: true,
        });
        await page.locator("#currentPassword").fill("Initial123!");
        await page.locator("#newPassword").fill("NewMichaelPassword123!");
        await page.locator("#confirmPassword").fill("NewMichaelPassword123!");
        await page.getByRole("button", { name: /save new password/i }).click();
        await page.waitForTimeout(2000);
      }
    }

    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/my tickets/i).first()).toBeVisible({ timeout: 10000 });

    // Capture standard responsive viewport baseline screenshot
    await page.screenshot({
      path: path.join(dirPath, `${viewportTag}.png`),
      fullPage: true,
    });

    // Logout and verify blocked direct access
    await profileBtn.click();
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(signInBtn).toBeVisible({ timeout: 10000 });
    await expect(profileBtn).not.toBeVisible();

    if (isDesktop) {
      await page.screenshot({
        path: path.join(dirPath, "logout-blocked-access.png"),
        fullPage: true,
      });
    }
  });

  test("captures invalid login and inactive account safe failure feedback (AC-02, BR-01)", async ({
    page,
  }, testInfo) => {
    const isDesktop = testInfo.project.name === "Desktop Chrome";
    if (!isDesktop) return;

    await page.goto("/");
    const signInBtn = page.getByRole("button", { name: /sign in/i });
    const profileBtn = page.getByRole("button", { name: /user profile menu/i });

    await expect(signInBtn.or(profileBtn)).toBeVisible({ timeout: 15000 });
    if (await profileBtn.isVisible().catch(() => false)) {
      await profileBtn.click();
      await page.getByRole("button", { name: /logout/i }).click();
      await expect(signInBtn).toBeVisible({ timeout: 10000 });
    }

    // 1. Invalid credentials
    await page.getByLabel(/email address/i).fill("jennifer.a@toktickit.local");
    await page.locator("#password").fill("CompletelyWrongPassword999!");
    await signInBtn.click();

    const errAlert = page.locator(".alert-danger");
    await expect(errAlert).toBeVisible({ timeout: 5000 });
    await expect(errAlert).toContainText(/invalid email or password/i);

    await page.screenshot({
      path: path.join(dirPath, "invalid-login.png"),
      fullPage: true,
    });

    // 2. Inactive account handling (inactive.staff@toktickit.local)
    await page.getByLabel(/email address/i).fill("inactive.staff@toktickit.local");
    await page.locator("#password").fill("Initial123!");
    await signInBtn.click();

    await expect(errAlert).toBeVisible({ timeout: 5000 });
    await expect(errAlert).toContainText(/invalid email or password/i);

    await page.screenshot({
      path: path.join(dirPath, "inactive-account.png"),
      fullPage: true,
    });
  });
});
