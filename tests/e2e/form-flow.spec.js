import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/functions/v1/calculate-offer", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        quote: {
          id: 1,
          offert: 1234,
          city: "Stockholm",
          phone: "0701234567",
          email: "test@example.com"
        }
      })
    });
  });
});

async function fillCommonContact(page) {
  await page.fill("#city", "Stockholm");
  await page.fill("#phone", "0701234567");
  await page.fill("#email", "test@example.com");
  await page.locator("#consent").check({ force: true });
}

test("submits Flyttstadning flow", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#serviceType", "Flyttstadning");
  await page.selectOption("#propertyType", "lagenhet");
  await page.fill("#numRooms", "2");
  await page.fill("#squareMeters", "60");
  await fillCommonContact(page);
  await page.click("button[type='submit']");
  await expect(page.locator(".ok-message.show")).toHaveText("Tack! Din forfragan har skickats.");
});

test("submits Fonsterputs flow", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#serviceType", "Fonsterputs");
  await page.selectOption("#propertyType", "villa");
  await page.fill("#windowCount", "12");
  await page.selectOption("#windowType", "2-sidiga (In/utvandiga)");
  await page.selectOption("#glazedBalcony", "Ja");
  await page.fill("#balconyWindowCount", "2");
  await fillCommonContact(page);
  await page.click("button[type='submit']");
  await expect(page.locator(".ok-message.show")).toHaveText("Tack! Din forfragan har skickats.");
});

test("submits Foretagsstadning flow", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#serviceType", "Foretagsstadning");
  await page.fill("#squareMeters", "120");
  await page.selectOption("#businessLocalType", "Kontor");
  await page.fill("#workstations", "5");
  await page.selectOption("#frequency", "1 gång/vecka");
  await fillCommonContact(page);
  await page.click("button[type='submit']");
  await expect(page.locator(".ok-message.show")).toHaveText("Tack! Din forfragan har skickats.");
});

test("submits Trappstadning BRFer flow", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#serviceType", "Trappstadning BRFer");
  await page.fill("#stairwells", "2");
  await page.fill("#floors", "4");
  await page.fill("#elevators", "1");
  await page.fill("#squareMeters", "150");
  await page.selectOption("#stairFrequency", "1 gång/vecka");
  await fillCommonContact(page);
  await page.click("button[type='submit']");
  await expect(page.locator(".ok-message.show")).toHaveText("Tack! Din forfragan har skickats.");
});

test("shows validation error for invalid email", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#serviceType", "Flyttstadning");
  await page.selectOption("#propertyType", "lagenhet");
  await page.fill("#numRooms", "2");
  await page.fill("#squareMeters", "60");
  await page.fill("#city", "Stockholm");
  await page.fill("#phone", "0701234567");
  await page.fill("#email", "not-an-email");
  await page.click("button[type='submit']");
  await expect(page.locator(".error").filter({ hasText: "Ange en giltig e-postadress." })).toBeVisible();
});
