import { test, expect, chromium } from '@playwright/test';

/**
 * E2E test: Full P2P file transfer between two browser contexts.
 * 
 * This test opens two browser contexts (Device A and Device B),
 * creates a room, joins it, and verifies the transfer.
 *
 * NOTE: This test requires a valid .env with Firebase credentials
 * and internet access for WebRTC STUN to work.
 */

test.describe('P2P File Transfer', () => {
  test('complete transfer: Device A creates room, Device B joins, file transfers', async () => {
    const browser = await chromium.launch();

    // Device A context
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Device B context  
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    try {
      // 1. Device A opens the app
      await pageA.goto('/');
      await expect(pageA.locator('h1')).toContainText('ShareWave');

      // 2. Device A creates a room
      await pageA.getByRole('button', { name: /start sharing/i }).click();
      await pageA.waitForURL(/\/room\//);
      const roomUrl = pageA.url();
      expect(roomUrl).toMatch(/\/room\//);

      // 3. Device B joins using the invite URL
      await pageB.goto(roomUrl);
      await pageB.waitForURL(roomUrl);

      // 4. Wait for both devices to see each other (up to 10 seconds)
      await expect(pageA.locator('[data-testid="device-card"]')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('[data-testid="device-card"]')).toBeVisible({ timeout: 10000 });

      // 5. Device A selects Device B
      await pageA.locator('[data-testid="device-card"]').first().click();

      // 6. Device A selects a file
      const testFileContent = 'Hello from Device A! This is a P2P file transfer test.';
      const fileInput = pageA.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testFileContent),
      });

      // 7. Device A clicks Send Files
      await pageA.getByRole('button', { name: /send/i }).click();

      // 8. Device B receives incoming transfer request
      await expect(pageB.locator('[data-testid="incoming-transfer"]')).toBeVisible({ timeout: 15000 });
      await expect(pageB.locator('[data-testid="incoming-transfer"]')).toContainText('test-file.txt');

      // 9. Device B accepts
      await pageB.getByRole('button', { name: /accept/i }).click();

      // 10. Wait for transfer to complete on both devices
      await expect(pageA.locator('[data-testid="transfer-complete"]')).toBeVisible({ timeout: 30000 });
      await expect(pageB.locator('[data-testid="transfer-complete"]')).toBeVisible({ timeout: 30000 });

    } finally {
      await contextA.close();
      await contextB.close();
      await browser.close();
    }
  });

  test('Device B can decline a transfer', async () => {
    const browser = await chromium.launch();
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    try {
      await pageA.goto('/');
      await pageA.getByRole('button', { name: /start sharing/i }).click();
      await pageA.waitForURL(/\/room\//);
      const roomUrl = pageA.url();

      await pageB.goto(roomUrl);
      await expect(pageA.locator('[data-testid="device-card"]')).toBeVisible({ timeout: 10000 });

      await pageA.locator('[data-testid="device-card"]').first().click();

      const fileInput = pageA.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test'),
      });

      await pageA.getByRole('button', { name: /send/i }).click();

      await expect(pageB.locator('[data-testid="incoming-transfer"]')).toBeVisible({ timeout: 15000 });
      await pageB.getByRole('button', { name: /decline/i }).click();

      // Device A should see rejection
      await expect(pageA.locator('[data-testid="transfer-error"]')).toBeVisible({ timeout: 10000 });

    } finally {
      await contextA.close();
      await contextB.close();
      await browser.close();
    }
  });
});
