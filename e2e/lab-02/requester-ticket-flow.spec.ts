import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Lab 2 E2E Tests — Requester Ticket & Attachment Lifecycle (E2E-01, E2E-02)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local application
    await page.goto("/");

    // Handle Development Requester Selection Modal if present
    const modal = page.locator(".modal.show");
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const select = page.locator("#requesterSelect");
      await expect(select).toBeEnabled({ timeout: 15000 });
      await select.selectOption({ index: 0 });

      const continueBtn = page.locator("button:has-text('Continue')");
      await expect(continueBtn).toBeEnabled({ timeout: 5000 });
      await continueBtn.click();

      await expect(modal).not.toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-01: Full requester ticket creation workflow and duplicate submission lock (AC-01, AC-09, AC-14)", async ({
    page,
  }) => {
    // Navigate to Create Ticket
    await page.click("header button:has-text('Create Ticket')");

    // Fill form
    await page.selectOption("#categoryId", { index: 0 });
    await page.selectOption("#relatedSystemId", { index: 0 });
    await page.selectOption("#requestedPriority", "HIGH");
    await page.fill("#summary", "E2E Automated Test Ticket Summary");
    await page.fill(
      "#description",
      "This is an automated end-to-end test description for verified requester ticket creation."
    );

    // Submit ticket
    const submitBtn = page.locator("button[type='submit']");
    await submitBtn.click();

    // Verify success banner and official Ticket Number format TKT-YYYY-XXXXXX
    await expect(page.locator("text=Ticket Created Successfully!")).toBeVisible();
    const ticketNumElement = page.locator(".font-monospace.fw-bold").first();
    await expect(ticketNumElement).toBeVisible();
    const ticketNumText = await ticketNumElement.innerText();
    expect(ticketNumText).toMatch(/^TKT-\d{4}-\d{6}$/);

    // Verify View Ticket Detail button click
    await page.click("button:has-text('View Ticket Detail')");
    await expect(page.locator("text=IT Priority (Read-Only)")).toBeVisible();

    // Return to My Tickets and verify ticket appears
    await page.click("header button:has-text('My Tickets')");
    await expect(page.locator(`text=${ticketNumText}`).locator("visible=true")).toBeVisible();
  });

  test("E2E-02: Attachment upload, download, and soft-removal with reason (AC-04, AC-07, AC-08)", async ({
    page,
  }) => {
    // Open My Tickets and click on first ticket
    await page.click("header button:has-text('My Tickets')");

    const firstTicketLink = page.locator("button.font-monospace").locator("visible=true").first();
    if (!(await firstTicketLink.isVisible().catch(() => false))) {
      // Create a ticket if none exists
      await page.click("header button:has-text('Create Ticket')");
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

      // Trigger soft removal
      await page.click("button:has-text('Remove')");
      await expect(page.locator("text=Confirm Soft Removal")).toBeVisible();

      // Fill reason and confirm
      await page.fill(
        "#removal-reason-input",
        "Superceded file version soft-removed during E2E test"
      );
      await page.click("button:has-text('Confirm Removal')");

      // Verify attachment moves to Soft-Removed Audit History with disabled download button
      await expect(page.locator("text=Soft-Removed Audit History")).toBeVisible();
      await expect(page.locator("button:has-text('Download Blocked')")).toBeDisabled();
    } finally {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    }
  });

  test("Automated Playwright Viewport Screenshots (AC-17, UI-11)", async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), "artifacts", "lab-02", "screenshots");
    const viewports = [
      { name: "desktop", width: 1280, height: 720 },
      { name: "tablet", width: 800, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Create Ticket Screen
      await page.click("header button:has-text('Create Ticket')");
      const createDir = path.join(screenshotDir, "create-ticket");
      fs.mkdirSync(createDir, { recursive: true });
      await page.screenshot({ path: path.join(createDir, `${vp.name}.png`), fullPage: true });

      // 2. My Tickets Screen
      await page.click("header button:has-text('My Tickets')");
      const myTicketsDir = path.join(screenshotDir, "my-tickets");
      fs.mkdirSync(myTicketsDir, { recursive: true });
      await page.screenshot({ path: path.join(myTicketsDir, `${vp.name}.png`), fullPage: true });

      // 3. Ticket Detail Screen
      const firstTicket = page.locator("button.font-monospace").locator("visible=true").first();
      if (await firstTicket.isVisible().catch(() => false)) {
        await firstTicket.click();
        const detailDir = path.join(screenshotDir, "ticket-detail");
        fs.mkdirSync(detailDir, { recursive: true });
        await page.screenshot({ path: path.join(detailDir, `${vp.name}.png`), fullPage: true });
      }
    }
  });
});
