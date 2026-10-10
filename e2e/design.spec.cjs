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

test('local jam room can be created, played, finalized and replayed as Beat Card',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/create');
  await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
  await page.locator('#room-name').fill('My test jam');
  await page.getByRole('button',{name:/Create jam room/}).click();
  await expect(page).toHaveURL(/\/room\/BD-[A-F0-9]{6}\/lobby/);
  await page.getByRole('button',{name:'Take a seat'}).first().click();
  await expect(page.getByRole('button',{name:'Leave seat'})).toHaveCount(1);
  await page.getByRole('button',{name:/Start 90-second jam/}).click();
  await expect(page).toHaveURL(/\/room\/BD-[A-F0-9]{6}\/studio/,{timeout:12000});
  await expect(page.getByRole('heading',{name:'My test jam'})).toBeVisible();
  const target=page.getByRole('button',{name:/drums step 1/}).first();
  await expect(target).toBeEnabled();
  await target.click();
  await expect(target).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Finish local round'}).click();
  await expect(page).toHaveURL(/\/beat\/local-bd-[a-f0-9]{6}/);
  await expect(page.getByRole('heading',{name:'My test jam'})).toBeVisible();
  await expect(page.getByText(/Locally saved/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'My test jam'})).toBeVisible();
  expect(errors).toEqual([]);
});
test('downloaded music arrangement JSON has all four lanes and validates round-trip import',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 const [download]=await Promise.all([
   page.waitForEvent('download'),
   page.getByRole('button',{name:'Export loop'}).click()
 ]);
 expect(download.suggestedFilename()).toBe('beat-drop-loop.json');
 const invalid='{"name":"Bad","pattern":{"drums":[4]}}';
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(invalid)});
 await expect(page.getByText(/Choose a valid 16-step/)).toBeVisible();
 await page.locator('input[type=file]').setInputFiles({
   name:'loop.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({name:'Imported beat',bpm:120,steps:16,pattern:{
     drums:Array(16).fill(1),bass:Array(16).fill(0),synth:Array(16).fill(0),pluck:Array(16).fill(0)
   }}))
 });
 await expect(page.getByText('Loop imported.')).toBeVisible();
 await expect(page.getByText('Imported beat').first()).toBeVisible();
});

test('newcomer can follow clear Studio guide, build a beat, arm record and navigate to a jam',async({page})=>{
  await page.goto('/studio');
  await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
  const guide=page.getByRole('region',{name:'Getting started with music'});
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('heading',{name:/Make your first beat/})).toBeVisible();
  await expect(page.getByRole('button',{name:'Play beat'}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Arm recording'})).toBeVisible();
  await guide.getByRole('button',{name:/Start empty beat/}).click();
  await expect(page.locator('.step-cell.on')).toHaveCount(0);
  await page.getByRole('button',{name:/drums step 1/}).first().click();
  await expect(page.getByRole('button',{name:/drums step 1/}).first()).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Arm recording'}).click();
  await expect(page.getByRole('button',{name:'Arm recording'})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByText(/Ready to record. Press Play loop/)).toBeVisible();
  await guide.getByRole('button',{name:/Hide getting started guide/}).click();
  await expect(page.getByRole('button',{name:'Show quick guide'})).toBeVisible();
  await page.getByRole('button',{name:'Show quick guide'}).click();
  await expect(guide).toBeVisible();
  await guide.getByRole('link',{name:/Create a jam/}).click();
  await expect(page).toHaveURL(/\/create$/);
});
test('new Studio toolbar shows labelled play, stop and recording controls on desktop and mobile',async({page})=>{
  await page.goto('/studio');
  await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
  await expect(page.getByRole('button',{name:'Play beat'}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Stop beat'}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Arm recording'}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Undo edit'}).first()).toBeVisible();
  await expect(page.getByText(/Ready. Press Play loop to hear all four tracks together/)).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('playing a piano key selects the same pitch for step-grid editing',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await page.locator('button.instrument-synth').first().click();
 const pitch=page.locator('#sequencer-pitch');
 await expect(pitch).toHaveValue('6');
 await page.getByRole('button',{name:'Play E3'}).click();
 await expect(pitch).toHaveValue('3');
 const step=page.getByRole('button',{name:/synth step 1/}).first();
 await step.click();
 await expect(step).toHaveAttribute('aria-label',/synth step 1, note 3/);
 await pitch.selectOption('10');
 await expect(page.getByRole('button',{name:'Play A4'})).toHaveAttribute('aria-pressed','true');
});

test('pressing Play actually starts and stops the browser music transport',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await page.getByRole('button',{name:'Play beat'}).first().click();
 await expect(page.getByRole('button',{name:'Pause beat'}).first()).toBeVisible({timeout:10000});
 await expect(page.getByText(/Playing your 16-step loop/)).toBeVisible();
 await page.getByRole('button',{name:'Stop beat'}).first().click();
 await expect(page.getByRole('button',{name:'Play beat'}).first()).toBeVisible();
});

test('letter notes work right after clicking instrument selector without breaking typing',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 const synth=page.locator('button.instrument-synth').first();
 await synth.click();
 await expect(synth).toHaveAttribute('aria-pressed','true');
 await page.keyboard.down('a');
 await expect(page.getByRole('button',{name:'Play C3'})).toHaveClass(/down/);
 await page.keyboard.up('a');
 await expect(page.locator('#sequencer-pitch')).toHaveValue('1');
 const select=page.locator('#sequencer-pitch');
 await select.focus();
 await page.keyboard.press('d');
 await expect(page.getByRole('button',{name:'Play E3'})).not.toHaveClass(/down/);
});

test('original Midnight on Monad song loads and can be played without any wallet',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 const tutorial=page.getByRole('region',{name:'Getting started with music'});
 await tutorial.getByRole('button',{name:/Load .*Midnight on Monad/}).click();
 await expect(page.getByRole('button',{name:/drums step 16, note 12/})).toBeVisible();
 await expect(page.getByRole('button',{name:/synth step 3, note 8/})).toBeVisible();
 await page.getByRole('button',{name:'Play beat'}).first().click();
 await expect(page.getByRole('button',{name:'Pause beat'}).first()).toBeVisible();
 await page.getByRole('button',{name:'Stop beat'}).first().click();
});
test('single visitor rehearses every instrument seat using local 4-player simulator',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await page.getByRole('button',{name:'Rehearse 4 players alone'}).click();
 await expect(page).toHaveURL(/\/room\/BD-[A-F0-9]{6}\/lobby/);
 await expect(page.getByRole('button',{name:'Leave seat'})).toHaveCount(4);
 await page.getByRole('button',{name:/Start 90-second jam/}).click();
 await expect(page).toHaveURL(/\/room\/BD-[A-F0-9]{6}\/studio/,{timeout:10000});
 await expect(page.getByRole('button',{name:/drums step 16, note 12/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Play beat'}).first()).toBeVisible();
 await page.getByRole('button',{name:'Finish local round'}).click();
 await expect(page).toHaveURL(/\/beat\/local-bd-/);
});

test('Live blockchain route has honest unconfigured status and works from navigation',async({page})=>{
 await page.goto('/chain');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await expect(page.getByRole('heading',{name:'The blockchain, live.'})).toBeVisible();
 await expect(page.getByText('Blockchain not configured in this build.')).toBeVisible();
 await expect(page.locator('a[href="/chain"]').first()).toHaveCount(1);
 await expect(page.getByText('RoomCreated', {exact:true})).toHaveCount(0);
});
test('blank Lo-fi Canvas starts with silent four-part grid and adjustable tempo',async({page})=>{
 await page.goto('/studio');
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await page.getByRole('button',{name:/New blank Lo-fi/}).click();
 await expect(page.getByRole('heading',{name:'Lo-fi Canvas'})).toBeVisible();
 await expect(page.getByRole('slider',{name:'Solo tempo BPM'})).toHaveValue('84');
 await expect(page.locator('.step-cell[aria-pressed="true"]')).toHaveCount(0);
 await page.getByRole('button',{name:'drums step 1, rest'}).click();
 await expect(page.getByRole('button',{name:'drums step 1, note 1'})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.step-cell[aria-pressed="true"]')).toHaveCount(1);
 await page.getByRole('slider',{name:'Solo tempo BPM'}).fill('91');
 await expect(page.getByRole('slider',{name:'Solo tempo BPM'})).toHaveValue('91');
 await page.getByRole('button',{name:'Save my drop'}).click();
 await expect(page).toHaveURL(/\/beat\/local-/);
 await expect(page.getByText('Lo-fi · 91 BPM · 4/4')).toBeVisible();
 await expect(page.getByText('This is a local song, not a recorded Monad contribution.')).toBeVisible();
 await expect(page.getByRole('link',{name:/Create real on-chain jam/})).toBeVisible();
});

test('Production-bound TanStack Start pages never request the old Vite source entry',async({page})=>{
 const legacyRequests=[];
 page.on('request',request=>{if(new URL(request.url()).pathname==='/src/main.js')legacyRequests.push(request.url());});
 const response=await page.goto('/');
 expect(response?.status()).toBe(200);
 await page.waitForFunction(()=>document.documentElement.dataset.beatDropHydrated==='true');
 await expect(page.getByRole('heading',{name:'BEAT DROP.'})).toBeVisible();
 expect(await page.locator('script[src="/src/main.js"]').count()).toBe(0);
 expect(legacyRequests).toEqual([]);
});
