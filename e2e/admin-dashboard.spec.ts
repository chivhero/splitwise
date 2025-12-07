import { test, expect } from '@playwright/test';
import { createUser, getUserByTelegramId } from '../lib/db-adapter';
import db from '../lib/db'; // Import the SQLite db instance

test('Admin dashboard should display users', async ({ page }) => {
  // Log console messages from the browser
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const testTelegramId = 123456789;
  // Create a user for the test
  let user = await createUser(
    testTelegramId,
    'Test',
    'User',
    'testuser'
  );

  // The application logic adds `isAdmin` based on an env var.
  // We will simulate this by adding the property to the user object for the cookie.
  const adminUser = {
    ...user,
    isAdmin: true,
    name: 'Test User' // This is what the test waits for in the UI
  };

  // Set a cookie to simulate an admin user
  await page.context().addCookies([
    {
      name: 'telegram_user',
      value: JSON.stringify(adminUser),
      url: 'http://localhost:3000',
    },
  ]);

  await page.goto('http://localhost:3000/admin-simple/users');

  // Debugging: Log current URL and take a screenshot
  console.log('Current URL:', page.url());
  await page.screenshot({ path: '/home/jules/verification/admin-dashboard-debug.png' });

  // Wait for the main heading, which includes a count of users
  await page.waitForSelector('h1:has-text("Все пользователи")');

  // Wait for the user to appear in the list
  await page.waitForSelector('text=Test User');

  const screenshotPath = '/home/jules/verification/admin-dashboard.png';
  await page.screenshot({ path: screenshotPath });

  // Clean up the created user using SQLite syntax
  const stmt = db.prepare('DELETE FROM users WHERE telegram_id = ?');
  stmt.run(testTelegramId);
});
