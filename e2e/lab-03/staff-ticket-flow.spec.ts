import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("E2E-02: IT Staff Ticket Queue & Ticket Operations E2E Workflow (AC-10, AC-12, AC-15, AC-17)", () => {
  const queueDirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/staff-queue");
  const detailDirPath = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/staff-ticket-detail");

  if (!fs.existsSync(queueDirPath)) fs.mkdirSync(queueDirPath, { recursive: true });
  if (!fs.existsSync(detailDirPath)) fs.mkdirSync(detailDirPath, { recursive: true });

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
        await page.waitForTimeout(1500);
      }
    }

    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("IT Support Ticket Queue").first()).toBeVisible();

    // Capture Staff Queue Baseline Screenshot
    await page.screenshot({
      path: path.join(queueDirPath, `${viewportTag}.png`),
      fullPage: true,
    });

    // Desktop-specific behavioral evidence for Queue (search, filters, no-results)
    if (isDesktop) {
      // 1. Search Query
      const searchInput = page.locator("input[placeholder*='Ticket #, summary']");
      await searchInput.fill("VPN");
      await page.getByRole("button", { name: /search/i }).click();
      await page.waitForTimeout(500);
      await expect(page.locator("text=VPN").first()).toBeVisible();
      await page.screenshot({
        path: path.join(queueDirPath, "search.png"),
        fullPage: true,
      });

      // 2. Filters Query (Status & Priority)
      const clearBtn = page.getByRole("button", { name: /clear filters/i });
      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click();
        await page.waitForTimeout(500);
      }
      const prioritySelect = page.locator("select").nth(1); // IT Priority select
      await prioritySelect.selectOption("HIGH");
      await page.waitForTimeout(500);
      await expect(page.locator(".badge:has-text('HIGH')").first()).toBeVisible();
      await page.screenshot({
        path: path.join(queueDirPath, "filters.png"),
        fullPage: true,
      });

      // 3. No Results State
      await searchInput.fill("ZZZZNONEXISTENT_TICKET_QUERY_9999");
      await page.getByRole("button", { name: /search/i }).click();
      await page.waitForTimeout(500);
      await expect(page.locator("text=No tickets match").or(page.locator("text=No tickets found"))).toBeVisible();
      await page.screenshot({
        path: path.join(queueDirPath, "no-results.png"),
        fullPage: true,
      });

      // Reset filters to reveal tickets for detail testing
      await page.getByRole("button", { name: /clear filters/i }).first().click();
      await page.waitForTimeout(500);
    }

    // Open first ticket detail
    const openDetailBtn = page.getByRole("button", { name: /open detail/i }).first();
    await expect(openDetailBtn).toBeVisible({ timeout: 10000 });
    await openDetailBtn.click();

    // Expect Ticket Detail screen
    await expect(page.getByText(/operational controls/i)).toBeVisible();

    // Capture Staff Ticket Detail Baseline Screenshot
    await page.screenshot({
      path: path.join(detailDirPath, `${viewportTag}.png`),
      fullPage: true,
    });

    // Desktop-specific behavioral evidence for Staff Ticket Detail
    if (isDesktop) {
      // 1. Claim Ticket
      const claimBtn = page.getByRole("button", { name: /claim ticket/i });
      if (await claimBtn.isVisible().catch(() => false)) {
        await claimBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.getByText("Alex Turner").first()).toBeVisible();
        await page.screenshot({
          path: path.join(detailDirPath, "claim.png"),
          fullPage: true,
        });
      }

      // 2. Reassign Ticket (to Kevin Patel or Admin)
      const assignSelect = page.locator(".col-12.col-lg-5 select.form-select").first();
      if (await assignSelect.isVisible().catch(() => false)) {
        const options = await assignSelect.locator("option").allTextContents();
        const targetOption = options.find((opt) => opt.includes("Kevin") || opt.includes("Admin"));
        if (targetOption) {
          await assignSelect.selectOption({ label: targetOption });
          await page.waitForTimeout(1000);
          await page.screenshot({
            path: path.join(detailDirPath, "reassign.png"),
            fullPage: true,
          });
        }
      }

      // 3. Update IT Priority
      const itPrioritySelect = page.locator("#it-priority-select");
      if (await itPrioritySelect.isVisible().catch(() => false)) {
        await itPrioritySelect.selectOption("URGENT");
        await page.waitForTimeout(1000);
        await expect(page.locator("text=IT Priority updated successfully.")).toBeVisible();
        await expect(itPrioritySelect).toHaveValue("URGENT");
        await page.screenshot({
          path: path.join(detailDirPath, "priority-update.png"),
          fullPage: true,
        });
      }

      // 4. Update Status (State Machine Transition)
      const updateStatusSelect = page.locator("#update-status-select");
      if (await updateStatusSelect.isVisible().catch(() => false)) {
        const optionValues = await updateStatusSelect.locator("option").evaluateAll((opts: any[]) => opts.map((o) => o.value));
        const targetValue = optionValues.find((v) => v && v !== "CANCELLED" && v !== "REOPENED" && v !== optionValues[0]);
        if (targetValue) {
          await updateStatusSelect.selectOption(targetValue);
          await page.waitForTimeout(500);

          if (targetValue === "RESOLVED") {
            const summaryInput = page.locator("textarea");
            if (await summaryInput.isVisible().catch(() => false)) {
              await summaryInput.fill("Operational diagnostics complete and verified.");
            }
          }

          const updateStatusBtn = page.getByRole("button", { name: /save transition/i });
          await expect(updateStatusBtn).toBeVisible({ timeout: 5000 });
          await updateStatusBtn.click();
          await expect(page.getByText(/status updated successfully/i)).toBeVisible({ timeout: 5000 });

          await page.screenshot({
            path: path.join(detailDirPath, "status-change.png"),
            fullPage: true,
          });
        }
      }

      // 5. Internal Notes Tab (Operational notes visible only to Staff/Admin)
      const notesTabBtn = page.getByRole("button", { name: /internal notes/i });
      await notesTabBtn.click();
      await page.waitForTimeout(500);

      const noteInput = page.locator("input[placeholder*='internal note']");
      await noteInput.fill("Operational verification: Network gateway logs confirmed normal traffic. Internal review complete.");
      await page.getByRole("button", { name: /add note/i }).click();
      await page.waitForTimeout(1000);
      await expect(page.getByText("Operational verification: Network gateway logs confirmed normal traffic.").first()).toBeVisible();
      await page.screenshot({
        path: path.join(detailDirPath, "internal-note.png"),
        fullPage: true,
      });

      // 6. Attachments Continuity Tab
      const attachmentsTabBtn = page.getByRole("button", { name: /attachments/i }).first();
      await attachmentsTabBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(detailDirPath, "attachment-continuity.png"),
        fullPage: true,
      });

      // 7. Role Restriction (Requester blocked from Staff Queue & operational controls)
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

      // Open a requester ticket detail
      const firstReqTicket = page.locator("button.font-monospace").locator("visible=true").first();
      if (await firstReqTicket.isVisible().catch(() => false)) {
        await firstReqTicket.click();
        await page.waitForTimeout(500);
      }

      // Assert that Operational Controls and Internal Notes tab are strictly absent
      await expect(page.getByText(/operational controls/i)).not.toBeVisible();
      await expect(page.getByRole("button", { name: /internal notes/i })).not.toBeVisible();

      await page.screenshot({
        path: path.join(detailDirPath, "role-restriction.png"),
        fullPage: true,
      });
    }
  });
});
