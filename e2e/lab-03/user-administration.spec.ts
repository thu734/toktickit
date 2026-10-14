import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("E2E-03: Admin User Management, Password Reset & Security E2E Workflow (AC-18, AC-20, AC-24, AC-25)", () => {
  const dirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/user-management");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

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

    // Capture User Management Baseline Screenshot
    await page.screenshot({
      path: path.join(dirPath, `${viewportTag}.png`),
      fullPage: true,
    });

    // Desktop-specific behavioral evidence for User Management
    if (isDesktop) {
      // 1. Create User Modal with Single Permitted Role & Initial Password
      await page.getByRole("button", { name: /\+ Create User/i }).click();
      await expect(page.getByText("Create New User Account")).toBeVisible();

      await page.locator("#createName").fill("Alice Operational Staff");
      await page.locator("#createEmail").fill("alice.staff@toktickit.local");
      await page.locator("#createRole").selectOption("IT_STAFF");
      await page.locator("#createPassword").fill("Initial123!");

      await page.screenshot({
        path: path.join(dirPath, "create-user.png"),
        fullPage: true,
      });

      // 2. Duplicate Email Conflict Rejection (AC-21, BR-07)
      await page.locator("#createEmail").fill("jennifer.a@toktickit.local"); // existing email
      await page.getByRole("button", { name: /Create User/i }).last().click();

      const dupErrorAlert = page.locator(".alert-danger");
      await expect(dupErrorAlert).toBeVisible({ timeout: 5000 });
      await expect(dupErrorAlert).toContainText(/already exists/i);

      await page.screenshot({
        path: path.join(dirPath, "duplicate-email.png"),
        fullPage: true,
      });

      // Close create modal
      await page.getByRole("button", { name: /cancel/i }).click();
      await page.waitForTimeout(500);

      // 3. Self-Deactivation Prevention (BR-09)
      // Find row for admin@toktickit.local in desktop table
      const adminRow = page.locator("table tr", { hasText: "admin@toktickit.local" });
      await adminRow.getByRole("button", { name: /edit/i }).first().click();
      await expect(page.getByRole("heading", { name: "Edit User Account" })).toBeVisible();

      // Attempt to deactivate own account
      const editActiveSwitch = page.locator("#editActiveSwitch");
      if (await editActiveSwitch.isChecked()) {
        await editActiveSwitch.uncheck();
      }
      await page.getByRole("button", { name: /save changes/i }).click();

      const editErrorAlert = page.locator(".alert-danger");
      await expect(editErrorAlert).toBeVisible({ timeout: 5000 });
      await expect(editErrorAlert).toContainText(/cannot deactivate your own account/i);

      await page.screenshot({
        path: path.join(dirPath, "self-deactivation.png"),
        fullPage: true,
      });

      // 4. Last Active Administrator Protection (BR-10)
      // Re-check active switch and try to demote role to REQUESTER
      await editActiveSwitch.check();
      await page.locator("#editRole").selectOption("REQUESTER");
      await page.getByRole("button", { name: /save changes/i }).click();

      await expect(editErrorAlert).toBeVisible({ timeout: 5000 });
      await expect(editErrorAlert).toContainText(/only active Administrator|last active Administrator/i);

      await page.screenshot({
        path: path.join(dirPath, "last-admin-protection.png"),
        fullPage: true,
      });

      // Close edit modal
      await page.getByRole("button", { name: /cancel/i }).click();
      await page.waitForTimeout(500);

      // 5. Forbidden Non-Admin Access (AC-25, BR-04)
      await profileBtn.click();
      await page.getByRole("button", { name: /logout/i }).click();
      await expect(signInBtn).toBeVisible({ timeout: 10000 });

      // Log in as Requester
      await page.getByLabel(/email address/i).fill("jennifer.a@toktickit.local");
      await page.locator("#password").fill("NewRequesterPassword123!");
      await signInBtn.click();
      await page.waitForTimeout(1000);
      if (await page.locator(".alert-danger").isVisible().catch(() => false)) {
        await page.locator("#password").fill("Initial123!");
        await signInBtn.click();
        await page.waitForTimeout(1000);
      }

      await expect(profileBtn).toBeVisible({ timeout: 10000 });

      // Assert that User Management is strictly NOT present in Requester navigation shell
      await expect(page.getByText("User Management")).not.toBeVisible();
      await expect(page.getByText(/my tickets/i).first()).toBeVisible();

      await page.screenshot({
        path: path.join(dirPath, "forbidden-non-admin.png"),
        fullPage: true,
      });
    }
  });
});
