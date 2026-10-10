const { test, expect } = require("@playwright/test");

test("offline mode clearly indicates deployment requirement", async ({page}) => {
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/Make something together/i})).toBeVisible();
  await expect(page.getByText("Blockchain activation required")).toBeVisible();
  await expect(page.getByRole("button",{name:/Create Jam/})).toBeDisabled();
  await expect(page.getByRole("button",{name:/Join \/ Listen/})).toBeDisabled();
  await expect(page.getByRole("button",{name:/Play loop/})).toBeVisible();
  await expect(page.getByRole("button",{name:/DRUMS/i}).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("local grid stays playable and switches instrument lanes", async ({page}) => {
  await page.goto("/");
  const grid=page.locator("#grid button");
  await expect(grid).toHaveCount(16);
  await grid.first().click();
  await expect(grid.first()).toHaveClass(/hit/);
  await page.getByRole("button",{name:/Undo/}).click();
  await expect(grid.first()).not.toHaveClass(/hit/);
  await page.locator('[data-instrument="synth"]').click();
  await expect(page.locator("#lane-label")).toHaveText(/SYNTH/);
  await expect(page.locator("#pads .pad")).toHaveCount(16);
});

test("room deep link cannot impersonate a deployed contract", async ({page}) => {
  await page.goto("/?room=42");
  await expect(page.getByText("Blockchain activation required")).toBeVisible();
  await expect(page.getByRole("heading",{name:/Make something together/i})).toBeVisible();
});

test("no page-level horizontal overflow in supported viewport", async ({page}) => {
  await page.goto("/");
  const sizes=await page.evaluate(() => ({
    page:document.documentElement.scrollWidth,
    viewport:window.innerWidth
  }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport+1);
});
