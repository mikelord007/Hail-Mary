import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const artifacts=path.join(root,'.test-artifacts');fs.mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try {
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>requests.push(r.url()));
await page.clock.install();await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.clock.runFor(200);await page.click('#startBtn');await page.waitForFunction(()=>!!document.pointerLockElement);
const state=()=>page.evaluate(()=>window.hailMary.getState());
async function key(k,ms=40){await page.keyboard.down(k);await page.clock.runFor(ms);await page.keyboard.up(k);await page.clock.runFor(32);}
async function move(x,z){let s=await state();for(const [axis,target,neg,pos]of [[0,x,'KeyA','KeyD'],[2,z,'KeyW','KeyS']]){s=await state();const diff=target-s.position[axis];if(Math.abs(diff)>.04)await key(diff<0?neg:pos,Math.abs(diff)/2.55*1000);s=await state();assert.ok(Math.abs(s.position[axis]-target)<.2,`Movement blocked toward ${x},${z}: ${JSON.stringify(s.position)}`);}}
await move(0,-1);await move(-2.6,-1);assert.equal((await state()).interaction,'sample');await key('KeyE');assert.ok((await state()).done.includes('sample'));await page.click('#logClose');await page.waitForFunction(()=>!!document.pointerLockElement);
await move(0,-1);await move(0,-18);assert.equal((await state()).room,'flight');await page.screenshot({path:path.join(artifacts,'flight.png')});
await move(0,-1);await move(3.5,-1);await move(3.5,-4.45);assert.equal((await state()).interaction,'ladder');await key('KeyE');assert.ok((await state()).climbing);await key('KeyW',2500);assert.equal((await state()).ground,5.2);assert.ok((await state()).done.includes('ladder'));await page.screenshot({path:path.join(artifacts,'observation.png')});await key('KeyE');assert.ok((await state()).climbing);await key('KeyS',2500);assert.equal((await state()).ground,0);
await move(3.5,-1);await move(0,-1);await move(0,0);await move(-16,0);assert.equal((await state()).room,'engineering');await page.screenshot({path:path.join(artifacts,'engineering.png')});await move(0,0);await move(12.5,0);assert.equal((await state()).room,'garden');await page.screenshot({path:path.join(artifacts,'garden.png')});await move(0,0);await move(0,18);assert.equal((await state()).room,'crew');await page.screenshot({path:path.join(artifacts,'crew.png')});assert.equal((await state()).visited.length,6);
// Test the actual boundary with sustained input.
await key('KeyS',12000);assert.ok((await state()).position[2]<27);assert.ok((await state()).position[2]>26);
await key('KeyG');assert.ok((await state()).externalMode);await page.clock.runFor(22000);let s=await state();assert.equal(s.deploy,1);assert.ok(Math.abs(s.rpm-5.98)<.01);assert.ok(s.done.includes('gravity'));assert.ok(Math.abs((s.rpm*Math.PI/30)**2*25/9.80665-1)<.01);await page.screenshot({path:path.join(artifacts,'exterior.png')});
await key('KeyC');assert.equal((await state()).externalMode,false);await key('KeyG');await page.clock.runFor(16000);s=await state();assert.equal(s.deploy,0);assert.equal(s.rpm,0);await page.screenshot({path:path.join(artifacts,'stowed.png')});await key('KeyC');
await key('KeyM');assert.ok(await page.locator('#modal').isVisible());await page.click('#mapClose');await page.waitForFunction(()=>!!document.pointerLockElement);

await key('Escape');await page.selectOption('#quality','balanced');await page.click('#resume');await page.waitForFunction(()=>!!document.pointerLockElement);assert.equal((await state()).quality,'balanced');
await key('ArrowRight',250);assert.ok((await state()).yaw<-.2);await page.screenshot({path:path.join(artifacts,'balanced-turned.png')});
await page.setViewportSize({width:1024,height:768});await page.clock.runFor(100);await page.screenshot({path:path.join(artifacts,'resized.png')});
await key('Escape');await page.selectOption('#quality','high');await page.click('#resume');await page.waitForFunction(()=>!!document.pointerLockElement);assert.equal((await state()).quality,'high');
await page.setViewportSize({width:1440,height:960});await page.clock.runFor(100);
assert.ok(requests.every(r=>r.startsWith('file:')||r.startsWith('data:')),'The game should not make network requests.');
assert.deepEqual(errors,[]);const report={result:'PASS',checks:['Initial WebGL scene','Walking through all six units','Sample interaction','Ladder ascent and descent','Solid hull boundary collision','Centrifuge extension and spin-up','1 g physics at 25 m radius','Centrifuge retraction','Exterior camera and return','Map dialog','No JavaScript errors','High and Balanced graphics modes','Camera turning','Viewport resizing','Offline launch with no network requests'],state:await state()};fs.writeFileSync(path.join(artifacts,'test-report.json'),JSON.stringify(report,null,2));console.log(report);
await page.reload();await page.clock.runFor(100);assert.equal((await state()).visited.length,6);assert.ok((await state()).done.includes('sample'));console.log('Persistence PASS');
} finally { await browser.close(); }
