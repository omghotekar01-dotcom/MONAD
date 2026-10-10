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


test("Smart Producer auditions without changing actual note counts, then explicitly applies and undoes", async ({page}) => {
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#edit-count")).toHaveText("0");
  await page.getByRole("button",{name:/Open Producer/}).click();
  await expect(page.getByRole("region",{name:"Smart Producer"})).toBeVisible();
  await page.getByRole("button",{name:/Generate 3 ideas/}).click();
  await expect(page.locator(".producer-idea")).toHaveCount(3);
  const first=page.locator(".producer-idea").first();
  await expect(first.getByText(/STEPS? CHANGED/)).toBeVisible();
  await first.getByRole("button",{name:/Audition/}).click();
  await expect(page.locator("#edit-count")).toHaveText("0");
  await expect(page.locator(".producer-idea.listening")).toHaveCount(1);
  await expect(page.locator("#grid .step.suggested").first()).toBeVisible();
  await first.getByRole("button",{name:/Apply idea/}).click();
  await expect(page.locator("#edit-count")).not.toHaveText("0");
  await expect(page.locator(".producer-idea")).toHaveCount(0);
  await page.locator("#undo").click();
  await expect(page.locator("#edit-count")).toHaveText("0");
  expect(errors).toEqual([]);
});
test("Producer uses selected instrument, energy and style while keeping preview unsigned", async ({page})=>{
  await page.goto("/");
  await page.locator('[data-instrument="synth"]').click();
  await page.getByRole("button",{name:/Open Producer/}).click();
  await expect(page.locator(".producer-target strong")).toHaveText("SYNTH");
  await page.locator("#producer-style").selectOption("ambient");
  await page.locator("#producer-energy").fill("3");
  await page.getByRole("button",{name:/Generate 3 ideas/}).click();
  await expect(page.locator(".producer-idea")).toHaveCount(3);
  await expect(page.locator(".producer-disclaimer")).toContainText("NOT A TRAINED AI MODEL");
  await expect(page.locator(".producer-policy")).toContainText("No cloud model");
  await page.locator(".producer-idea").nth(1).getByRole("button",{name:/Apply idea/}).click();
  await expect(page.locator("#edit-count")).not.toHaveText("0");
  await expect(page.locator("#lane-label")).toHaveText(/SYNTH/);
  await page.getByRole("button",{name:/Preview Beat Card/}).click();
  await expect(page.getByRole("region",{name:"Local Beat Card preview"})).toBeVisible();
  await expect(page.locator(".beat-credits")).toContainText("LOCAL PRACTICE / UNSIGNED");
});

test("one-click full-beat draft remains local until explicit approval and undoes as a unit", async ({page})=>{
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
  await page.goto("/");
  await page.getByRole("button",{name:/Open Producer/}).click();
  const button=page.getByRole("button",{name:/Draft 4-track loop/});
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator(".producer-full-lane")).toHaveCount(4);
  await expect(page.locator("#edit-count")).toHaveText("0");
  await page.getByRole("button",{name:/Audition full beat/}).click();
  await expect(page.locator("#grid .step.suggested").first()).toBeVisible();
  await expect(page.locator("#edit-count")).toHaveText("0");
  await page.getByRole("button",{name:/Apply full beat/}).click();
  await expect(page.locator("#active-seats")).toHaveText("4 / 4");
  await expect(page.locator("#edit-count")).not.toHaveText("0");
  await page.locator("#undo").click();
  await expect(page.locator("#edit-count")).toHaveText("0");
  await expect(page.locator("#active-seats")).toHaveText("0 / 4");
  expect(pageErrors).toEqual([]);
});
