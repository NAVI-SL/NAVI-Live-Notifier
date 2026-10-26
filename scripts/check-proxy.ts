import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';

// Explicit local-only integration command. No real app services, secrets or host ports.
const folder = mkdtempSync(join(tmpdir(), 'navi-proxy-regression-'));
const edge = `navi-proxy-${randomUUID()}`;
const backend = `${edge}-backend`;
const created: string[] = [];
const backendOnly = process.argv.includes('--backend');
let checks: { name: string; pass: boolean }[] = [];
function run(command: string, args: string[], label: string, timeout = 60000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout });
  if (result.status !== 0) throw new Error(label);
  return result.stdout;
}
function docker(args: string[], label: string) {
  return run('docker', args, label);
}
try {
  const openssl =
    process.platform === 'win32' && existsSync('C:/Program Files/Git/usr/bin/openssl.exe')
      ? 'C:/Program Files/Git/usr/bin/openssl.exe'
      : 'openssl';
  run(
    openssl,
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost',
      '-keyout',
      join(folder, 'privkey.pem'),
      '-out',
      join(folder, 'fullchain.pem'),
    ],
    'Synthetic localhost certificate generation failed; install OpenSSL or use Git for Windows.',
  );
  const fixture = join(folder, 'backend.mjs');
  writeFileSync(
    fixture,
    `import {createServer} from 'node:http';
    for (const port of [3000,4100]) createServer(async(req,res)=>{
      let bytes=0; for await(const chunk of req) bytes+=chunk.length;
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({port,bytes,host:req.headers.host,
        forwardedHost:req.headers['x-forwarded-host'],proto:req.headers['x-forwarded-proto'],
        forwarded:req.headers.forwarded??null}));
    }).listen(port,'127.0.0.1');`,
  );
  const configuration = backendOnly ? join(folder, 'nginx.conf') : resolve('deployment/nginx.conf');
  if (backendOnly)
    writeFileSync(
      configuration,
      readFileSync('deployment/cloud/backend-webhooks.nginx.conf.example', 'utf8')
        .replaceAll('__APPROVED_WEBHOOK_HOST__', 'localhost')
        .replace('127.0.0.1:8443 ssl', '443 ssl'),
    );
  docker(
    [
      'run',
      '-d',
      '--name',
      edge,
      '--network',
      'none',
      '--mount',
      `type=bind,src=${folder},dst=/etc/navi/tls,readonly`,
      '--mount',
      `type=bind,src=${configuration},dst=/etc/nginx/nginx.conf,readonly`,
      'nginx:stable-alpine',
    ],
    'Isolated Nginx fixture failed to start.',
  );
  created.push(edge);
  docker(['exec', edge, 'nginx', '-t'], 'Nginx configuration is invalid.');
  docker(
    [
      'run',
      '-d',
      '--name',
      backend,
      '--network',
      `container:${edge}`,
      '--mount',
      `type=bind,src=${folder},dst=/etc/navi/tls,readonly`,
      '--mount',
      `type=bind,src=${fixture},dst=/fixture.mjs,readonly`,
      '--entrypoint',
      'node',
      'navi:local-review',
      '/fixture.mjs',
    ],
    'Synthetic upstream fixture failed to start.',
  );
  created.push(backend);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync(
      'docker',
      [
        'exec',
        backend,
        'node',
        '-e',
        "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
      ],
      { encoding: 'utf8', timeout: 5000 },
    );
    if (result.status === 0) {
      ready = true;
      break;
    }
    await pause(100);
  }
  if (!ready) throw new Error('Synthetic upstream readiness timed out.');
  const probe = `import https from 'node:https';import http from 'node:http';import fs from 'node:fs';
    const checks=[];const ca=fs.readFileSync('/etc/navi/tls/fullchain.pem');
    const request=(path,headers={},method='GET',body='',plain=false)=>new Promise((resolve,reject)=>{
      const req=(plain?http:https).request({hostname:'127.0.0.1',port:plain?80:443,
        servername:'localhost',ca,path,method,headers:{host:'localhost',...headers,
          ...(body?{'content-length':Buffer.byteLength(body)}:{})},timeout:5000},res=>{
          let text='';res.on('data',x=>text+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
        });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('timeout')));req.end(body);
    });
    const check=(name,pass)=>checks.push({name,pass});
    const backendOnly=${backendOnly};
    let r=await request('/');check(backendOnly?'dashboard blocked on webhook edge':'trusted local TLS and web upstream',backendOnly?r.status===404:r.status===200&&JSON.parse(r.text).port===3000);
    check('response security headers',r.headers['x-content-type-options']==='nosniff'&&(backendOnly||r.headers['x-frame-options']==='DENY'));
    r=await request(backendOnly?'/webhooks/kick':'/',{'x-forwarded-host':'spoofed.example','x-forwarded-proto':'http','forwarded':'host=spoofed.example'});
    let b=JSON.parse(r.text);check('canonical upstream forwarded host',b.forwardedHost==='localhost');
    check('HTTPS protocol replaces spoofed header',b.proto==='https');check('Forwarded header removed',b.forwarded===null);
    check('unknown Host rejected',(await request('/',{host:'untrusted.example'})).status===421);
    if(!backendOnly)check('plain HTTP not redirected using attacker Host',(await request('/',{host:'untrusted.example'},'GET','',true)).status===404);
    check('private broker routes blocked',(await request('/internal/health')).status===404);
    r=await request('/webhooks/kick',{},'POST','synthetic');check('Kick callback upstream',r.status===200&&JSON.parse(r.text).port===4100);
    r=await request('/webhooks/youtube/UC'+'a'.repeat(22)+'/'+'a'.repeat(64),{},'POST','synthetic');
    check('YouTube callback upstream',r.status===200&&JSON.parse(r.text).port===4100);
    check('unknown callback rejected',(await request('/webhooks/not-supported')).status===404);
    check('oversized body rejected',(await request('/webhooks/kick',{},'POST','x'.repeat(70*1024))).status===413);
    await request('/api/auth/callback/discord?code=FAKE_PROXY_CODE_DO_NOT_LOG');
    if(backendOnly)check('dashboard authentication routes not exposed',(await request('/api/auth/sign-in/social')).status===404);
    else{let limited=false;for(let i=0;i<15;i++)if((await request('/api/auth/sign-in/social')).status===429)limited=true;check('local auth burst throttled',limited);}console.log(JSON.stringify(checks));`;
  checks = JSON.parse(
    docker(
      ['exec', backend, 'node', '--input-type=module', '-e', probe],
      'Local TLS/proxy probe failed.',
    ),
  ) as typeof checks;
  const logs = docker(['logs', edge], 'Unable to inspect safe proxy logs.');
  checks.push({
    name: 'OAuth query marker absent from logs',
    pass: !logs.includes('FAKE_PROXY_CODE_DO_NOT_LOG'),
  });
  if (checks.some((check) => !check.pass)) process.exitCode = 1;
} catch {
  console.error(
    JSON.stringify({
      event: 'proxy_fixture_error',
      code: 'check_docker_images_openssl_and_local_fixture',
    }),
  );
  process.exitCode = 1;
} finally {
  let cleanup = true;
  for (const name of created.reverse()) {
    const result = spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8', timeout: 20000 });
    cleanup &&= result.status === 0;
  }
  // Temporary certificates are synthetic; no real credential directory is read.
  const target = resolve(folder);
  if (
    !target.startsWith(resolve(tmpdir()) + sep) ||
    !basename(target).startsWith('navi-proxy-regression-')
  )
    cleanup = false;
  if (cleanup) rmSync(target, { recursive: true, force: true });
  else process.exitCode = 1;
  console.info(
    JSON.stringify({
      event: 'local_proxy_regression',
      network: 'none',
      hostPorts: false,
      realCredentials: false,
      realMessages: false,
      profile: backendOnly ? 'webhook-only' : 'single-host',
      checks,
      cleanup,
    }),
  );
}
