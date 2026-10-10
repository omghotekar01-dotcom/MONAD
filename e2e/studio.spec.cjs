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

test("local Beat Card artwork and mute/solo controls work without a wallet", async ({page}) => {
  await page.goto("/");
  const preview=page.getByRole("button",{name:/Preview Beat Card/});
  await expect(preview).toBeDisabled();
  await page.locator("#grid button").first().click();
  await expect(preview).toBeEnabled();
  await preview.click();
  const card=page.getByRole("region",{name:"Local Beat Card preview"});
  await expect(card).toBeVisible();
  await expect(card.getByText("LOCAL STUDIO / PREVIEW")).toBeVisible();
  await expect(card.locator("svg")).toHaveCount(1);
  await expect(card.getByText("not a finalized chain record", {exact:false})).toBeVisible();
  const mute=card.getByRole("button",{name:"Mute drums"});
  const solo=card.getByRole("button",{name:"Solo bass"});
  await expect(mute).toHaveAttribute("aria-pressed","false");
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed","true");
  await solo.click();
  await expect(solo).toHaveAttribute("aria-pressed","true");
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed","false");
  await page.getByRole("button",{name:/Close Beat Card/}).click();
  await expect(card).toBeHidden();
});
