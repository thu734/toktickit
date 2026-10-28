import { test, expect, mount, dashboard, detail, longText, type Scenario } from './fixtures/accessibility';
import type { Locator, Page } from '@playwright/test';

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth);
  const outside = overflow > 1 ? await page.locator('body *').evaluateAll(nodes => nodes.filter(n => { const r = n.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).slice(0, 12).map(n => ({ tag: n.tagName, class: n.className, text: n.textContent?.slice(0, 45), right: n.getBoundingClientRect().right }))) : [];
  expect(overflow, `No horizontal page overflow: ${JSON.stringify(outside)}`).toBeLessThanOrEqual(1);
}
async function contained(locator: Locator) {
  const boxes = await locator.evaluateAll(nodes => nodes.map(n => {
    const r = n.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width, viewport: document.documentElement.clientWidth };
  }));
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) { expect(box.width).toBeGreaterThan(0); expect(box.left).toBeGreaterThanOrEqual(-1); expect(box.right).toBeLessThanOrEqual(box.viewport + 1); }
}
async function focusRing(locator: Locator) {
  await expect(locator).toBeFocused();
  await expect(locator).toHaveCSS('outline-style', 'solid');
  await expect(locator).toHaveCSS('outline-width', '2px');
  await expect(locator).toHaveCSS('outline-color', 'rgb(11, 122, 70)');
  await expect(locator).toHaveCSS('outline-offset', '2px');
}

for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const) {
  test(`${role}: labelled dashboard and long-content responsive geometry`, async ({ page, unexpected }, testInfo) => {
    await mount(page, { role }, unexpected); await dashboard(page);
    await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
    const section = page.getByRole('region', { name: role === 'REQUESTER' ? 'Requester Dashboard' : 'Staff Dashboard', exact: true });
    await expect(section).toHaveAttribute('aria-busy', 'false');
    const counts = section.getByRole('button', { name: /^View / }).filter({ hasNotText: 'View Actions' });
    await expect(counts).toHaveCount(role === 'REQUESTER' ? 7 : 14);
    await noOverflow(page); await contained(section.getByRole('button'));
    const summaries = section.locator('article');
    const rects = await summaries.evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right }; }));
    const width = page.viewportSize()!.width;
    const columns = role === 'REQUESTER' ? (width >= 1200 ? 4 : width >= 768 ? 2 : 1) : width >= 768 ? 2 : 1;
    for (let i = 0; i < columns; i++) expect(Math.abs(rects[i].top - rects[0].top)).toBeLessThan(2);
    if (rects.length > columns) expect(rects[columns].top).toBeGreaterThan(rects[0].top);
    await page.screenshot({ path: testInfo.outputPath(`${role}-${testInfo.project.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'User profile menu' }).click();
    await contained(page.locator('#profile-disclosure'));
    await noOverflow(page);
    await page.keyboard.press('Escape');
    await focusRing(page.getByRole('button', { name: 'User profile menu' }));
  });
}

test('Zen Green computed styles and keyboard focus', async ({ page, unexpected }) => {
  await mount(page, { role: 'REQUESTER' }, unexpected); await dashboard(page);
  const create = page.getByRole('main').getByRole('button', { name: 'Create Ticket', exact: true });
  await expect(create).toHaveCSS('background-color', 'rgb(0, 107, 60)');
  await expect(create).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('main').getByRole('article').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const first = page.getByRole('button', { name: 'View All Active (7)', exact: true });
  await first.focus(); await page.keyboard.press('Tab');
  await focusRing(page.getByRole('button', { name: 'View Open (2)', exact: true }));
});

test('Action validation, editable/read-only surfaces and retained conflict draft', async ({ page, unexpected }, testInfo) => {
  await mount(page, { role: 'IT_STAFF', saveState: 'conflict' }, unexpected); await detail(page);
  await noOverflow(page); await contained(page.locator('.actions-taken dd'));
  await page.screenshot({ path: testInfo.outputPath(`actions-${testInfo.project.name}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Add Action', exact: true }).click();
  const form = page.getByRole('form', { name: 'Create Action', exact: true });
  const description = form.getByRole('textbox', { name: 'Description', exact: true });
  await expect(description).toBeFocused();
  await expect(description).toHaveAttribute('aria-required', 'true');
  await form.getByRole('button', { name: 'Create Action', exact: true }).click();
  await expect(description).toHaveAttribute('aria-invalid', 'true'); await expect(description).toBeFocused();
  const error = form.getByRole('alert'); await expect(error).toHaveText(/Description is required/);
  await expect(description).toHaveAttribute('aria-describedby', await error.getAttribute('id') as string);
  const a = await description.boundingBox(), b = await error.boundingBox(); expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
  await form.screenshot({ path: testInfo.outputPath(`validation-${testInfo.project.name}.png`) });
  await description.fill(longText); await form.getByLabel('Follow-Up Required', { exact: true }).check();
  await form.getByRole('button', { name: 'Create Action', exact: true }).click();
  await expect(form.getByLabel('Follow-Up Note', { exact: true })).toBeFocused();
  await form.getByLabel('Follow-Up Note', { exact: true }).fill('Review after repair');
  await form.getByRole('button', { name: 'Create Action', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Newer work' })).toBeVisible();
  await expect(description).toHaveValue(longText); await expect(description).toBeDisabled();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`conflict-${testInfo.project.name}.png`), fullPage: true });
  await form.getByRole('button', { name: 'Discard draft' }).click();
  await expect(page.getByRole('heading', { name: 'Actions Taken', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Correct completed Action', exact: true }).click();
  const correction = page.getByRole('form', { name: 'Edit Action', exact: true });
  await expect(correction.getByLabel('Description', { exact: true })).toHaveAttribute('readonly', '');
  await expect(correction.getByLabel('Description', { exact: true })).toHaveCSS('background-color', 'rgb(241, 245, 243)');
  await expect(correction.getByLabel('Result', { exact: true })).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await correction.screenshot({ path: testInfo.outputPath(`read-only-${testInfo.project.name}.png`) });
});

for (const role of ['IT_STAFF', 'ADMINISTRATOR'] as const) {
  test(`${role}: blocked resolution explains next steps only after keyboard selection`, async ({ page, unexpected }) => {
    await mount(page, { role }, unexpected); await detail(page);
    const select = page.getByLabel('Update Status', { exact: true });
    const guidance = page.getByRole('status').filter({ hasText: 'Complete or cancel planned Actions' });
    await expect(page.getByRole('button', { name: 'Add Action', exact: true })).toBeEnabled();
    await expect(guidance).toHaveCount(0);
    await select.focus();
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await expect(select).toHaveValue('RESOLVED');
    await expect(select).toBeFocused();
    await expect(guidance).toBeVisible();
    await expect(select).toHaveAttribute('aria-describedby', 'status-gate-feedback');
    await expect(select).toHaveAccessibleDescription(/Complete or cancel planned Actions/);
    await expect(page.getByRole('button', { name: 'Save Transition to RESOLVED', exact: true })).toBeDisabled();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Review Actions Taken', exact: true })).toBeFocused();
    await select.selectOption('IN_PROGRESS');
    await expect(guidance).toHaveCount(0);
    await expect(select).not.toHaveAttribute('aria-describedby');
    await expect(page.getByRole('button', { name: 'Save Transition to IN PROGRESS', exact: true })).toBeEnabled();
    await noOverflow(page);
  });
}

test('status dialog contains keyboard focus, dismisses and restores focus', async ({ page, unexpected }, testInfo) => {
  await mount(page, { role: 'IT_STAFF' }, unexpected); await detail(page);
  const select = page.getByLabel('Update Status', { exact: true });
  await select.focus(); await select.selectOption('CANCELLED');
  const dialog = page.getByRole('dialog', { name: 'Confirm Status Change' });
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await contained(dialog.locator('.modal-content')); await noOverflow(page);
  await focusRing(dialog.getByRole('button', { name: 'Close dialog' }));
  const bounds = await dialog.locator('.modal-content').boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  // A viewport capture preserves fixed-overlay coordinates after page scrolling.
  await page.screenshot({ path: testInfo.outputPath(`focused-dialog-${testInfo.project.name}.png`), fullPage: false });
  expect(await page.getByRole('navigation', { name: 'Main navigation', includeHidden: true }).evaluate(node => !!node.closest('[inert]')), 'Navigation inherits inert background exclusion').toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(select).toBeFocused();
});

test('Requester shared Actions are read-only and detail reflows at 320 CSS pixels', async ({ page, unexpected }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, { role: 'REQUESTER' }, unexpected); await detail(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TKT-2026-000007');
  await expect(page.getByText('Actions are read-only for Requesters.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Add Action|Edit Action|Correct completed Action/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Internal Notes/ })).toHaveCount(0);
  await noOverflow(page); await contained(page.locator('.actions-taken dd'));
});

for (const role of ['REQUESTER', 'IT_STAFF'] as const) {
  test(`${role}: every metric is keyboard reachable and activates its destination`, async ({ page, unexpected }) => {
    await mount(page, { role }, unexpected); await dashboard(page);
    const labels = role === 'REQUESTER'
      ? ['View All Active (7)', 'View Open (2)', 'View In Progress (1)', 'View Waiting for Requester (2)', 'View Resolved (3)', 'View New (1)', 'View Reopened (1)']
      : ['View Unassigned Active Tickets (7)', 'View My Assigned Tickets (3)', 'View New Tickets (0)', 'View Open Tickets (1)', 'View In Progress Tickets (2)', 'View Waiting for Requester Tickets (3)', 'View Resolved Tickets (4)', 'View Closed Tickets (5)', 'View Reopened Tickets (6)', 'View Cancelled Tickets (7)', 'View Low Priority Tickets (1)', 'View Medium Priority Tickets (2)', 'View High Priority Tickets (3)', 'View Urgent Priority Tickets (4)'];
    for (let i = 0; i < labels.length; i++) {
      const target = page.getByRole('button', { name: labels[i], exact: true });
      // Reach each destination by Tab from its preceding metric, then activate.
      if (i === 0) { await target.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); }
      else { await page.getByRole('button', { name: labels[i - 1], exact: true }).focus(); await page.keyboard.press('Tab'); }
      await focusRing(target);
      await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      await expect(page.getByRole('heading', { name: role === 'REQUESTER' ? 'My Tickets' : 'IT Support Ticket Queue', exact: true })).toBeVisible();
      await dashboard(page);
    }
  });
  for (const state of ['zero', 'error', 'loading'] as const) {
    test(`${role}: ${state} dashboard feedback remains distinct and usable`, async ({ page, unexpected }) => {
      const scenario: Scenario = { role, dashboardState: state };
      const controls = await mount(page, scenario, unexpected);
      try {
        await dashboard(page);
        if (state === 'loading') {
          await expect(page.getByText(role === 'REQUESTER' ? 'Loading your dashboard…' : 'Loading the operational dashboard…', { exact: true })).toHaveAttribute('role', 'status');
          await expect(page.getByRole('button', { name: /^View / })).toHaveCount(0);
          controls.releaseLoading();
          await expect(page.getByRole('button', { name: role === 'REQUESTER' ? 'View All Active (7)' : 'View Unassigned Active Tickets (7)', exact: true })).toBeVisible();
        } else if (state === 'error') {
          await expect(page.getByRole('alert')).toContainText(/Unable to/);
          await expect(page.getByRole('button', { name: /^View / })).toHaveCount(0);
          scenario.dashboardState = 'ready';
          await page.getByRole('button', { name: 'Retry dashboard' }).click();
          await expect(page.getByRole('button', { name: role === 'REQUESTER' ? 'View All Active (7)' : 'View Unassigned Active Tickets (7)', exact: true })).toBeVisible();
        } else {
          await expect(page.getByRole('button', { name: role === 'REQUESTER' ? 'View All Active (0)' : 'View Unassigned Active Tickets (0)', exact: true })).toBeEnabled();
          await expect(page.getByText(role === 'REQUESTER' ? 'No Tickets Yet. Create a Ticket when you need IT support.' : 'No operational Tickets yet.', { exact: true })).toBeVisible();
        }
        await noOverflow(page);
      } finally { controls.releaseLoading(); }
    });
  }
}

test('breakpoint boundaries preserve approved dashboard arrangements', async ({ page, unexpected }) => {
  await mount(page, { role: 'IT_STAFF' }, unexpected); await dashboard(page);
  for (const width of [320, 575, 576, 767, 768, 991, 992, 1199, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    const status = page.getByRole('region', { name: 'Tickets by Status', exact: true });
    const priority = page.getByRole('region', { name: 'Tickets by IT Priority', exact: true });
    const a = await status.boundingBox(), b = await priority.boundingBox();
    if (width >= 992) { expect(Math.abs(a!.y - b!.y)).toBeLessThan(2); expect(b!.x).toBeGreaterThan(a!.x); }
    else expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    await contained(page.getByRole('button', { name: /^View / }));
  }
});

test('Requester resolution and attachment dialogs retain labels and restore focus', async ({ page, unexpected }) => {
  await mount(page, { role: 'REQUESTER' }, unexpected); await detail(page);
  const resolve = page.getByRole('button', { name: /Problem Appears Resolved/i });
  await resolve.click();
  const dialog = page.getByRole('dialog', { name: 'Indicate Problem Appears Resolved' });
  await expect(dialog.getByRole('textbox', { name: /Resolution Comment/ })).toBeFocused();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Escape'); await expect(resolve).toBeFocused();
  const remove = page.getByRole('button', { name: 'Remove', exact: true });
  await remove.click();
  const removal = page.getByRole('dialog', { name: 'Confirm Soft Removal' });
  await expect(removal.getByRole('textbox', { name: /Removal Reason/ })).toBeFocused();
  await expect(removal).toHaveAttribute('aria-modal', 'true');
  await contained(removal.locator('.modal-content')); await noOverflow(page);
  await removal.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(remove).toBeFocused();
});

test('Admin inherited dialogs remain keyboard contained and usable', async ({ page, unexpected }) => {
  await mount(page, { role: 'ADMINISTRATOR' }, unexpected);
  for (const [trigger, name, field] of [['Create User', 'Create New User Account', 'Full Name'], ['Edit', 'Edit User Account', 'Full Name'], ['Reset Password', 'Reset Initial Password', 'New Initial Password']] as const) {
    const opener = page.getByRole('button', { name: new RegExp(trigger, 'i') }).filter({ visible: true }).first();
    await opener.click();
    const dialog = page.getByRole('dialog', { name, exact: true });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByLabel(new RegExp(field))).toBeFocused();
    await contained(dialog.locator('.modal-content')); await noOverflow(page);
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  }
});

async function textContrastFailures(page: Page) {
  return page.locator('.app-shell').evaluate(root => {
    const rgba = (value: string) => {
      const values = (value.match(/[\d.]+/g) || []).map(Number);
      return [values[0], values[1], values[2], values[3] ?? 1];
    };
    // Composite text and its background separately through opacity groups.
    const over = (front: number[], back: number[]) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [...front.slice(0, 3).map((v, i) => alpha ? (v * front[3] + back[i] * back[3] * (1 - front[3])) / alpha : 0), alpha];
    };
    const luminance = (color: number[]) => color.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    return Array.from(root.querySelectorAll<HTMLElement>('*')).flatMap(node => {
      if (!node.checkVisibility() || !Array.from(node.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) || node.closest(':disabled, [inert]')) return [];
      const style = getComputedStyle(node);
      let foreground = rgba(style.color), background = [0, 0, 0, 0];
      for (let current: HTMLElement | null = node; current; current = current.parentElement) {
        const layer = getComputedStyle(current), surface = rgba(layer.backgroundColor);
        foreground = over(foreground, surface); background = over(background, surface);
        const opacity = parseFloat(layer.opacity);
        foreground[3] *= opacity; background[3] *= opacity;
      }
      foreground = over(foreground, [255, 255, 255, 1]); background = over(background, [255, 255, 255, 1]);
      const x = luminance(foreground), y = luminance(background);
      const contrast = (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700);
      return contrast + .001 < (large ? 3 : 4.5) ? [{ text: node.textContent?.trim().slice(0, 70), color: style.color, background, contrast }] : [];
    });
  });
}
async function readableText(page: Page) {
  expect(await textContrastFailures(page), 'Rendered shell/content text contrast (4.5:1 normal, 3:1 large)').toEqual([]);
}

test('rendered dashboard, Action and private-note text retain contrast and textual cues', async ({ page, unexpected }) => {
  await mount(page, { role: 'IT_STAFF' }, unexpected); await dashboard(page);
  await readableText(page); await detail(page);
  await readableText(page);
  await page.getByRole('button', { name: /Internal Notes/ }).click();
  await expect(page.getByText('Private — visible only to IT Staff and Administrators.', { exact: true })).toBeVisible();
  await readableText(page);
  await page.getByRole('button', { name: 'Add Action', exact: true }).click();
  await page.getByRole('button', { name: 'Create Action', exact: true }).click();
  await readableText(page);
});

test('real 200% browser zoom and 400% reflow retain usable controls', async ({ unexpected }, testInfo) => {
  const { chromium } = await import('@playwright/test');
  const fs = await import('node:fs/promises');
  const profile = testInfo.outputPath('zoom-profile');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: null, isMobile: false, hasTouch: false, deviceScaleFactor: undefined, baseURL: 'http://127.0.0.1:5196',
    locale: 'en-US', timezoneId: 'Asia/Bangkok', serviceWorkers: 'block', args: ['--window-size=1280,900'],
  });
  try {
    const settings = await context.newPage();
    await settings.goto('data:text/html,<html>Normal zoom control</html>');
    const normal = await settings.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
    await settings.goto('chrome://settings/appearance');
    // Full Chromium's own zoom preference, not CSS zoom or pinch emulation.
    await settings.evaluate('chrome.settingsPrivate.setDefaultZoom(2)');
    for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const) {
      const page = await context.newPage();
      page.on('pageerror', error => unexpected.push(error.message));
      await mount(page, { role }, unexpected); await dashboard(page);
      const zoomed = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
      expect(Math.abs(zoomed.width * 2 - normal.width)).toBeLessThanOrEqual(1);
      expect(zoomed.dpr).toBeCloseTo(normal.dpr * 2, 1);
      await noOverflow(page); await contained(page.getByRole('main').getByRole('button'));
      await detail(page);
      await noOverflow(page); await contained(page.locator('.actions-taken dd'));
      if (role !== 'REQUESTER') {
        await page.getByRole('button', { name: 'Add Action', exact: true }).click();
        const description = page.getByRole('textbox', { name: 'Description', exact: true });
        await expect(description).toBeFocused(); await description.fill(longText); await noOverflow(page);
      }
      await page.screenshot({ path: testInfo.outputPath(`${role}-200-percent.png`), fullPage: true });
      await page.close();
    }
    await settings.evaluate('chrome.settingsPrivate.setDefaultZoom(4)');
    const narrow = await context.newPage();
    await mount(narrow, { role: 'IT_STAFF' }, unexpected); await dashboard(narrow);
    expect(await narrow.evaluate(() => innerWidth)).toBe(320);
    await noOverflow(narrow); await detail(narrow); await noOverflow(narrow);
  } finally {
    await context.close(); await fs.rm(profile, { recursive: true, force: true });
  }
});

for (const state of ['loading', 'error'] as const) {
  test(`Actions ${state} feedback does not claim an empty successful list`, async ({ page, unexpected }) => {
    const scenario: Scenario = { role: 'IT_STAFF', actionsState: state };
    const controls = await mount(page, scenario, unexpected);
    try {
      await dashboard(page);
      await page.getByRole('button', { name: 'Open Ticket TKT-2026-000007', exact: true }).click();
      const actions = page.getByRole('region', { name: 'Actions Taken', exact: true });
      if (state === 'loading') {
        await expect(actions.getByRole('status')).toHaveText('Loading Actions…');
        await expect(actions.getByRole('button', { name: 'Add Action', exact: true })).toBeDisabled();
        controls.releaseLoading();
      } else {
        await expect(actions.getByRole('alert')).toContainText('Unable to load or save Actions');
        await expect(actions.getByText('No Actions Taken yet.', { exact: true })).toHaveCount(0);
        scenario.actionsState = 'ready';
        await actions.getByRole('button', { name: 'Retry loading Actions' }).click();
      }
      await expect(actions.getByRole('article', { name: 'Action 10', exact: true })).toBeVisible();
      await noOverflow(page);
    } finally { controls.releaseLoading(); }
  });
}

test('Requester warning badges and detail text remain readable', async ({ page, unexpected }) => {
  await mount(page, { role: 'REQUESTER', ticketStatus: 'WAITING_FOR_REQUESTER' }, unexpected);
  await dashboard(page); await readableText(page); await detail(page); await readableText(page);
});

for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const) {
  test(`${role}: visible controls have accessible names and mobile buttons have usable targets`, async ({ page, unexpected }) => {
    await mount(page, { role }, unexpected);
    const named = async () => {
      const controls = page.locator('input:not([type="hidden"]), select, textarea, button').filter({ visible: true });
      expect(await controls.count()).toBeGreaterThan(0);
      for (const control of await controls.all()) await expect(control).toHaveAccessibleName(/\S/);
      if (page.viewportSize()!.width < 768) {
        for (const button of await page.locator('button.btn').filter({ visible: true }).all()) {
          const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
        }
      }
    };
    await named(); await dashboard(page); await named();
    await detail(page); await named();
    if (role !== 'REQUESTER') { await page.getByRole('button', { name: 'Add Action', exact: true }).click(); await named(); }
    await noOverflow(page);
  });
}


test('successful attachment removal focuses the stable Attachments heading after refresh', async ({ page, unexpected }) => {
  await mount(page, { role: 'REQUESTER' }, unexpected);
  const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/tickets/7');
  await detail(page);
  const ticket = await (await loaded).json();
  await page.route('**/api/attachments/3/soft-remove', route => route.fulfill({ json: { message: 'Removed' } }));
  await page.route('**/api/tickets/7', route => route.fulfill({ json: { ...ticket, attachments: [{ ...ticket.attachments[0], isRemoved: true, removalReason: 'No longer needed', removedAt: '2026-10-23T03:00:00Z' }] } }));
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm Soft Removal' });
  await dialog.getByRole('textbox', { name: /Removal Reason/ }).fill('No longer needed');
  await dialog.getByRole('button', { name: 'Confirm Removal', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^Attachments 0 \/ 5 active$/ })).toBeFocused();
});

test('header contrast includes navigation text and effective element/ancestor opacity', async ({ page, unexpected }) => {
  await mount(page, { role: 'REQUESTER' }, unexpected); await dashboard(page);
  await readableText(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const inactive = nav.getByRole('button', { name: /My Tickets/ });
  await expect(inactive).toHaveCSS('opacity', '1');
  await expect(nav.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  // Negative controls prevent this check passing while ignoring CSS opacity.
  await inactive.evaluate(node => { node.style.opacity = '0.75'; });
  expect(await textContrastFailures(page)).toContainEqual(expect.objectContaining({ text: expect.stringContaining('My Tickets'), contrast: expect.any(Number) }));
  await inactive.evaluate(node => { node.style.opacity = ''; });
  await nav.evaluate(node => { node.style.opacity = '0.75'; });
  expect(await textContrastFailures(page)).toContainEqual(expect.objectContaining({ text: expect.stringContaining('My Tickets') }));
  await nav.evaluate(node => { node.style.opacity = ''; });
  await readableText(page);
});

for (const type of ['create', 'edit', 'reset'] as const) {
  test(`Admin ${type} dialog blocks Escape, close and Cancel while saving`, async ({ page, unexpected }) => {
    await mount(page, { role: 'ADMINISTRATOR' }, unexpected);
    const config = {
      create: { trigger: /Create User/, title: 'Create New User Account', submit: 'Create User', method: 'POST', path: '/api/admin/users' },
      edit: { trigger: /^Edit$/, title: 'Edit User Account', submit: 'Save Changes', method: 'PATCH', path: '/api/admin/users/2' },
      reset: { trigger: /Reset Password/, title: 'Reset Initial Password', submit: 'Set Initial Password', method: 'POST', path: '/api/admin/users/2/reset-password' },
    }[type];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/admin/users**', async route => {
      if (route.request().method() !== config.method || new URL(route.request().url()).pathname !== config.path) return route.fallback();
      await gate; return route.fulfill({ status: 500, json: {} });
    });
    try {
      await page.getByRole('button', { name: config.trigger }).first().click();
      const dialog = page.getByRole('dialog', { name: config.title, exact: true });
      if (type === 'create') {
        await dialog.getByLabel(/Full Name/).fill('Pending User');
        await dialog.getByLabel(/Email Address/).fill('pending@example.test');
        await dialog.getByLabel(/Initial Password/).fill('PendingPassword123!');
      } else if (type === 'reset') await dialog.getByLabel(/New Initial Password/).fill('PendingPassword123!');
      const sent = page.waitForRequest(request => request.method() === config.method && new URL(request.url()).pathname === config.path);
      await dialog.getByRole('button', { name: config.submit, exact: true }).click(); await sent;
      const close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
      await expect(close).toBeDisabled(); await expect(cancel).toBeDisabled();
      await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
      await close.evaluate(node => (node as HTMLButtonElement).click());
      await cancel.evaluate(node => (node as HTMLButtonElement).click());
      await expect(dialog).toBeVisible();
      release();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await expect(cancel).toBeEnabled(); await expect(close).toBeEnabled();
      await cancel.click(); await expect(dialog).toHaveCount(0);
    } finally { release(); }
  });
}

test('Create Ticket names system fields and focuses form/success headings on navigation and reset', async ({ page, unexpected }) => {
  await mount(page, { role: 'REQUESTER' }, unexpected); await dashboard(page);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /Create Ticket/ }).click();
  const heading = page.getByRole('heading', { level: 1, name: 'Create IT Support Ticket', exact: true });
  await expect(heading).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Ticket Number (Auto-Generated)', exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByRole('textbox', { name: 'Created Date', exact: true })).toHaveAttribute('readonly', '');
  await page.route('**/api/tickets', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 201, json: { id: 8, ticketNumber: 'TKT-2026-000008', summary: 'Heading focus verification', currentStatus: 'NEW', itPriority: 'MEDIUM' } });
  });
  await page.getByLabel(/^Category/).selectOption('1');
  await page.getByLabel(/^Related System/).selectOption('1');
  await page.getByLabel(/Ticket Summary/).fill('Heading focus verification');
  await page.getByLabel(/Detailed Description/).fill('Verify the frontend success heading receives focus after submission.');
  await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ticket Created Successfully!', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Create Another Ticket', exact: true }).click();
  await expect(heading).toBeFocused();
});
