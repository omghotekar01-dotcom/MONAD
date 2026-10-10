const {test,expect}=require('@playwright/test');
test('Lovable home uses original Beat Drop artwork, clean navigation and light theme',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'BEAT DROP.'})).toBeVisible();
 await expect(page.locator('.hero-banner img')).toBeVisible();
 await expect(page.getByRole('link',{name:/Start a jam/})).toBeVisible();
 await expect(page.getByRole('link',{name:/Go solo/})).toBeVisible();
 await expect(page.locator('.beat-cover img').first()).toBeVisible();
 const bg=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(bg).not.toBe('rgb(11, 13, 18)');
 expect(errors).toEqual([]);
});
test('studio has playable controls, 16-step sequencer and keyboard',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await expect(page.getByRole('heading',{name:/Solo studio/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Arm recording'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Play beat'}).first()).toBeVisible();
 await expect(page.locator('.step-cell')).toHaveCount(64);
 await expect(page.getByRole('button',{name:/Play Kick/})).toBeVisible();
 await page.locator('button.instrument-synth').first().click();
 await expect(page.locator('button.instrument-synth').first()).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.performance-key')).toHaveCount(16);
});
test('all routed screens render without an uncaught page error',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/explore','/create','/join','/drops','/library','/profile/you','/how-it-works','/room/BD-CHILL']){
   await page.goto(path);
   await expect(page.locator('.page-content')).toBeVisible();
   await expect(page.locator('h1,h2').first()).toBeVisible();
 }
 expect(errors).toEqual([]);
});
test('without contract deployment interface identifies demo and never pretends to be on-chain',async({page})=>{
 await page.goto('/');
 await expect(page.getByText('Local demo · deployment pending')).toBeVisible();
 await page.goto('/explore');
 await expect(page.getByText(/local demonstrations/i)).toBeVisible();
 await page.goto('/join');
 await expect(page.getByText(/only in this browser/i)).toBeVisible();
});
test('small screens have no page-wide sideways overflow',async({page})=>{
 for(const path of ['/','/studio','/explore','/create','/drops']){
   await page.goto(path);
   const m=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
   expect(m.content).toBeLessThanOrEqual(m.viewport+2);
 }
});
