// Works in PowerShell, bash and Vercel without setting shell-specific env vars.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const executable=path.join(process.cwd(),'node_modules','vite','bin','vite.js');
const child=spawnSync(process.execPath,[executable,'build'],{
  stdio:'inherit',env:{...process.env,NITRO_PRESET:'vercel',VERCEL:'1'}
});
process.exit(child.status??1);
