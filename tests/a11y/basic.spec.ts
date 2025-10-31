/**
 * Basic Accessibility Tests using Axe
 * Tests WCAG 2.2 AA compliance
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject Axe into the page
    await page.goto(BASE_URL);
    await injectAxe(page);
  });

  test('Homepage should have no accessibility violations', async ({ page }) => {
    await page.goto(BASE_URL);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Agents page should have no accessibility violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await checkA11y(page);
  });

  test('Workflows page should have no accessibility violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`);
    await checkA11y(page);
  });

  test('Dashboard should have no accessibility violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await checkA11y(page);
  });

  test('Should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
  });

  test('Should have proper heading hierarchy', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check h1 exists and is unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // Check headings are in order (h1 → h2 → h3, no skipping)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let prevLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      const level = parseInt(tagName.replace('H', ''));
      expect(level).toBeLessThanOrEqual(prevLevel + 1);
      prevLevel = level;
    }
  });

  test('Should have proper alt text on images', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
      expect(alt?.length).toBeGreaterThan(0);
    }
  });

  test('Should have proper form labels', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        // Check if there's a label with matching "for" attribute
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        // Must have aria-label or aria-labelledby
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('Should support keyboard navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Tab through interactive elements
    const interactiveElements = await page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
    }
  });

  test('Should have sufficient color contrast', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Axe checks this, but we can also verify manually
    const violations = await getViolations(page, undefined, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    
    expect(violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
  });

  test('Should have focus indicators visible', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Focus first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focus styles are applied
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });
    
    // Should have either outline or box-shadow
    expect(
      focused.outlineWidth !== '0px' || 
      focused.boxShadow !== 'none'
    ).toBe(true);
  });
});
