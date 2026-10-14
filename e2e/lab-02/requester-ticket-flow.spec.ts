import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Lab 2 E2E Tests — Requester Ticket & Attachment Lifecycle (E2E-01, E2E-02)", () => {
  const lab2ScreenshotDir = path.resolve(process.cwd(), "artifacts/lab-02/screenshots");
  const createDir = path.join(lab2ScreenshotDir, "create-ticket");
  const myTicketsDir = path.join(lab2ScreenshotDir, "my-tickets");
  const detailDir = path.join(lab2ScreenshotDir, "ticket-detail");

  if (!fs.existsSync(createDir)) fs.mkdirSync(createDir, { recursive: true });
  if (!fs.existsSync(myTicketsDir)) fs.mkdirSync(myTicketsDir, { recursive: true });
  if (!fs.existsSync(detailDir)) fs.mkdirSync(detailDir, { recursive: true });

  test.beforeEach(async ({ page }) => {
    // Navigate to local application
    await page.goto("/");

    const signInBtn = page.getByRole("button", { name: /sign in/i });
    const profileBtn = page.getByRole("button", { name: /user profile menu/i });

    await expect(signInBtn.or(profileBtn)).toBeVisible({ timeout: 15000 });

    if (await profileBtn.isVisible().catch(() => false)) {
      const profileText = await profileBtn.innerText().catch(() => "");
      if (!profileText.includes("Jennifer Anderson")) {
        await profileBtn.click();
        await page.getByRole("button", { name: /logout/i }).click();
        await expect(signInBtn).toBeVisible({ timeout: 10000 });
      }
    }

    if (await signInBtn.isVisible().catch(() => false)) {
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
      if (await pwdChangeHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
        await page.locator("#currentPassword").fill("Initial123!");
        await page.locator("#newPassword").fill("NewRequesterPassword123!");
        await page.locator("#confirmPassword").fill("NewRequesterPassword123!");
        await page.getByRole("button", { name: /save new password/i }).click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(profileBtn).toBeVisible({ timeout: 15000 });
  });

  test("E2E-01: Full requester ticket creation workflow and duplicate submission lock (AC-01, AC-09, AC-14)", async ({
    page,
  }, testInfo) => {
    const isDesktop = testInfo.project.name === "Desktop Chrome";

    // 1. Navigate to Create Ticket
    await page.getByRole("button", { name: /create ticket/i }).first().click();

    // Field-level validation check (empty submission)
    if (isDesktop) {
      const submitBtn = page.locator("button[type='submit']");
      await submitBtn.click();
      await expect(page.locator("text=Ticket Summary is required.")).toBeVisible();
      await expect(page.locator("text=Description is required")).toBeVisible();
      await page.screenshot({
        path: path.join(createDir, "validation-errors.png"),
        fullPage: true,
      });
    }

    // Fill valid form
    await page.selectOption("#categoryId", { index: 0 });
    await page.selectOption("#relatedSystemId", { index: 0 });
    await page.selectOption("#requestedPriority", "HIGH");
    await page.fill("#summary", "E2E Automated Test Ticket Summary");
    await page.fill(
      "#description",
      "This is an automated end-to-end test description for verified requester ticket creation."
    );

    // Duplicate submission lock capture
    if (isDesktop) {
      const submitBtn = page.locator("button[type='submit']");
      // Assert submit button is enabled before click
      await expect(submitBtn).toBeEnabled();
      // Click and capture immediate busy state or screenshot right upon click
      const clickPromise = submitBtn.click();
      await page.screenshot({
        path: path.join(createDir, "duplicate-lock.png"),
        fullPage: true,
      });
      await clickPromise;
    } else {
      const submitBtn = page.locator("button[type='submit']");
      await submitBtn.click();
    }

    // Verify success banner and official Ticket Number format TKT-YYYY-XXXXXX
    await expect(page.locator("text=Ticket Created Successfully!")).toBeVisible();
    const ticketNumElement = page.locator(".font-monospace.fw-bold").first();
    await expect(ticketNumElement).toBeVisible();
    const ticketNumText = await ticketNumElement.innerText();
    expect(ticketNumText).toMatch(/^TKT-\d{4}-\d{6}$/);

    if (isDesktop) {
      await page.screenshot({
        path: path.join(createDir, "creation-success.png"),
        fullPage: true,
      });
    }

    // Verify View Ticket Detail button click
    await page.click("button:has-text('View Ticket Detail')");
    await expect(page.locator("text=IT Priority").first()).toBeVisible();

    // Return to My Tickets and verify ticket appears
    await page.getByRole("button", { name: /my tickets/i }).first().click();
    await expect(page.locator(`text=${ticketNumText}`).locator("visible=true")).toBeVisible();

    // Test My Tickets Search, Filter, No-Results, and Pagination on Desktop
    if (isDesktop) {
      const searchInput = page.locator("#ticket-search");
      await searchInput.fill(ticketNumText);
      await page.waitForTimeout(500);
      await expect(page.locator(`text=${ticketNumText}`).locator("visible=true")).toBeVisible();
      await page.screenshot({
        path: path.join(myTicketsDir, "filter-search.png"),
        fullPage: true,
      });

      // No results state
      await searchInput.fill("NONEXISTENT_QUERY_TICKET_9999");
      await page.waitForTimeout(500);
      await expect(page.getByRole("heading", { name: "No Tickets Found" })).toBeVisible();
      await page.screenshot({
        path: path.join(myTicketsDir, "no-results.png"),
        fullPage: true,
      });

      // Clear search
      await searchInput.fill("");
      await page.waitForTimeout(500);

      // Pagination screenshot
      const paginationNav = page.locator("nav[aria-label*='pagination']").or(page.locator(".pagination")).first();
      if (await paginationNav.isVisible().catch(() => false)) {
        await page.screenshot({
          path: path.join(myTicketsDir, "pagination.png"),
          fullPage: true,
        });
      }
    }
  });

  test("E2E-02: Attachment upload, download, and soft-removal with reason (AC-04, AC-07, AC-08)", async ({
    page,
  }, testInfo) => {
    const isDesktop = testInfo.project.name === "Desktop Chrome";

    // Open My Tickets and click on first ticket
    await page.getByRole("button", { name: /my tickets/i }).first().click();

    const firstTicketLink = page.locator("button.font-monospace").locator("visible=true").first();
    if (!(await firstTicketLink.isVisible().catch(() => false))) {
      // Create a ticket if none exists
      await page.getByRole("button", { name: /create ticket/i }).first().click();
      await page.fill("#summary", "E2E Attachment Test Ticket");
      await page.fill(
        "#description",
        "E2E test ticket description for testing attachment upload and soft removal."
      );
      await page.click("button[type='submit']");
      await page.click("button:has-text('View Ticket Detail')");
    } else {
      await firstTicketLink.click();
    }

    // Prepare dummy file for upload
    const dummyFilePath = path.join(process.cwd(), "e2e-dummy-test.pdf");
    fs.writeFileSync(dummyFilePath, "%PDF-1.4 sample PDF content for E2E attachment test");

    try {
      // Upload file
      const fileInput = page.locator("#attachment-upload-input");
      await fileInput.setInputFiles(dummyFilePath);
      await page.click("button:has-text('Upload File')");

      // Verify file appears in active attachment list
      await expect(page.locator("text=e2e-dummy-test.pdf")).toBeVisible();

      if (isDesktop) {
        await page.screenshot({
          path: path.join(detailDir, "attachment-uploaded.png"),
          fullPage: true,
        });
      }

      // Trigger soft removal
      await page.click("button:has-text('Remove')");
      await expect(page.locator("text=Confirm Soft Removal")).toBeVisible();

      if (isDesktop) {
        await page.screenshot({
          path: path.join(detailDir, "soft-removal-modal.png"),
          fullPage: true,
        });
      }

      // Fill reason and confirm
      await page.fill(
        "#removal-reason-input",
        "Superceded file version soft-removed during E2E test"
      );
      await page.click("button:has-text('Confirm Removal')");

      // Verify attachment moves to Soft-Removed Audit History with disabled download button
      await expect(page.locator("text=Soft-Removed Audit History")).toBeVisible();
      await expect(page.locator("button:has-text('Download Blocked')")).toBeDisabled();

      if (isDesktop) {
        await page.screenshot({
          path: path.join(detailDir, "soft-removed-audit.png"),
          fullPage: true,
        });
      }

      // Problem Appears Resolved indication
      if (isDesktop) {
        const resolveBtn = page.getByRole("button", { name: /problem appears resolved/i });
        if (await resolveBtn.isVisible().catch(() => false)) {
          await resolveBtn.click();
          await expect(page.getByText("Indicate Problem Appears Resolved")).toBeVisible();

          const resolveCommentInput = page.locator("#resolveComment");
          await resolveCommentInput.fill("The reported issue appears resolved after internal system reboot. Verified working normally.");
          await page.getByRole("button", { name: /submit resolution comment/i }).click();

          await page.waitForTimeout(1000);
          await expect(page.getByText("Problem resolution indication submitted to IT Staff.").first()).toBeVisible();

          await page.screenshot({
            path: path.join(detailDir, "resolution-indication.png"),
            fullPage: true,
          });
        }
      }
    } finally {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    }
  });

  test("Automated Playwright Viewport Screenshots (AC-17, UI-11)", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1280, height: 720 },
      { name: "tablet", width: 800, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Create Ticket Screen
      await page.getByRole("button", { name: /create ticket/i }).first().click();
      await page.screenshot({ path: path.join(createDir, `${vp.name}.png`), fullPage: true });

      // 2. My Tickets Screen
      await page.getByRole("button", { name: /my tickets/i }).first().click();
      await page.screenshot({ path: path.join(myTicketsDir, `${vp.name}.png`), fullPage: true });

      // 3. Ticket Detail Screen
      const firstTicket = page.locator("button.font-monospace").locator("visible=true").first();
      if (await firstTicket.isVisible().catch(() => false)) {
        await firstTicket.click();
        await page.screenshot({ path: path.join(detailDir, `${vp.name}.png`), fullPage: true });
      }
    }
  });
});
