import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const run = `issue-27-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
const dir = resolve('test-results', run);
mkdirSync(dir, { recursive: true });
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
function fingerprint() {
    const files=execFileSync('git',['ls-files','-co','--exclude-standard','--','client','server','e2e','scripts','playwright*.ts','package.json','package-lock.json','docs/lab-04/specification.md','docs/lab-04/api-spec.md','docs/lab-04/ui-spec.md'],{encoding:'utf8'}).trim().split('\n');
    const hash=createHash('sha256');
    for(const name of [...new Set(files)].sort()){hash.update(name+'\0');hash.update(readFileSync(name));}
    return hash.digest('hex');
}
function treeHash(path) {
    const hash=createHash('sha256');
    if (!existsSync(path)) return null;
    function visit(dir) { for(const item of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
        const file=resolve(dir,item.name); if(item.isDirectory()) visit(file); else {hash.update(relative(path,file)+'\0'); hash.update(readFileSync(file));}
    }}
    visit(path); return hash.digest('hex');
}
const historical = ['artifacts/lab-01','artifacts/lab-02','artifacts/lab-03'];
const historicalBefore = historical.map(treeHash);
const originalBuilds = ['server/dist','client/dist'].map(treeHash);
const previousManifest = existsSync('artifacts/lab-04/manifest.json') ? JSON.parse(readFileSync('artifacts/lab-04/manifest.json','utf8')) : null;
const serverBuild = resolve('server/node_modules/.cache',run,'dist');
const clientBuild = resolve(dir,'client-build');
const sourceHash=fingerprint();
const env = { ...process.env, LAB4_RUN_ID: run, LAB4_RUN_DIR: dir, LAB4_REVISION: revision, LAB4_SOURCE_HASH: sourceHash, LAB4_SERVER_BUILD:serverBuild, LAB4_CLIENT_BUILD:clientBuild, VITE_API_URL: 'http://127.0.0.1:3107', DATABASE_URL: 'postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public' };
const phases=[];
async function command(label, args, executable=process.execPath) {
    const child = spawn(executable, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', chunk => { log += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { log += chunk; process.stderr.write(chunk); });
    const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    phases.push({label,executable,args,exitCode:status});
    writeFileSync(resolve(dir, `${label}.txt`), log);
    if (status !== 0)
        throw new Error(`${label} failed; canonical evidence was not published (${dir})`);
}
const npm = process.env.npm_execpath;
await command('generate', [npm, 'exec', '--prefix', 'server', '--', 'prisma', 'generate', '--schema', 'server/prisma/schema.prisma']);
await command('server-build', [npm, 'run', 'build', '--prefix', 'server', '--', '--outDir', serverBuild]);
await command('client-build', [npm, 'run', 'build', '--prefix', 'client', '--', '--outDir', clientBuild]);
const buildHash=createHash('sha256').update(treeHash(serverBuild)+treeHash(clientBuild)).digest('hex');
env.LAB4_BUILD_HASH=buildHash;
await command('client-regression', [npm, 'test', '--prefix', 'client']);
await command('server-regression', [npm, 'test', '--prefix', 'server']);
await command('client-types', [npm, 'exec', '--prefix', 'client', '--', 'tsc', '--noEmit', '--project', 'client/tsconfig.json']);
await command('server-types', ['server/node_modules/typescript/bin/tsc','--noEmit','--project','server/tsconfig.json']);
await command('integration-types', ['server/node_modules/typescript/bin/tsc', '--noEmit', '--module', 'esnext', '--moduleResolution', 'bundler', '--target', 'es2022', '--esModuleInterop', '--skipLibCheck', '--allowImportingTsExtensions', '--types', 'node', '--typeRoots', 'server/node_modules/@types', 'playwright.integration.config.ts', 'e2e/lab-04/actions-taken-flow.spec.ts', 'e2e/lab-04/ticket-resolution.spec.ts', 'e2e/lab-04/dashboards.spec.ts', 'e2e/lab-04/fixtures/integration.ts', 'e2e/lab-04/fixtures/integration-server.mts']);
await command('browser', ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.integration.config.ts', ...process.argv.slice(2)]);
env.PLAYWRIGHT_JSON_OUTPUT_FILE=resolve(dir,'accessibility-results.json');
await command('accessibility', ['node_modules/@playwright/test/cli.js','test','--config','playwright.accessibility.config.ts','--reporter=line,json']);
delete env.PLAYWRIGHT_JSON_OUTPUT_FILE;
await command('diff-check',['diff','--check'],'git');
const historicalDiff=execFileSync('git',['diff','--name-only','--',...historical],{encoding:'utf8'}).trim();
if(historicalDiff || historical.some((path,i)=>treeHash(path)!==historicalBefore[i])) throw new Error('No publication: historical Lab 1–3 artifacts changed');
if(['server/dist','client/dist'].some((path,i)=>treeHash(path)!==originalBuilds[i]))throw new Error('No publication: existing build outputs changed');
const results = JSON.parse(readFileSync(resolve(dir, 'results.json'), 'utf8'));
if(results.config.workers!==1 || results.config.projects.some(project=>project.retries!==0))throw new Error('No publication: one worker and zero configured retries are required');
if (results.stats.unexpected || results.stats.skipped || results.stats.flaky || !results.stats.expected)
    throw new Error('No publication: incomplete, skipped, retried or failed tests');
function flatten(suites) { return suites.flatMap(s => [...(s.specs || []).flatMap(x => x.tests.map(test => ({ ...test, title:x.title }))), ...flatten(s.suites || [])]); }
const tests = flatten(results.suites);
if (tests.some(t => t.results.length !== 1 || t.results[0].status !== 'passed' || t.results[0].retry !== 0))
    throw new Error('No publication: retries or incomplete tests');
if (tests.length !== 21 || ['desktop', 'tablet', 'mobile'].some(project => tests.filter(t => t.projectName === project).length !== 7))
    throw new Error('No publication: the complete seven journeys at all three viewports are required');
for(const test of tests){
    for(const name of ['schema-readiness','database-reconciliation','owned-schema-cleanup']){
        if(test.results[0].attachments.filter(a=>a.name===name).length!==1)throw new Error(`No publication: missing ${name} for ${test.title}`);
    }
}
const accessibility=JSON.parse(readFileSync(resolve(dir,'accessibility-results.json'),'utf8'));
const accessibilityTests=flatten(accessibility.suites);
if(accessibility.config.workers!==1 || accessibility.config.projects.some(p=>p.retries!==0) || accessibilityTests.length!==102 || accessibility.stats.expected!==102 || accessibility.stats.skipped || accessibility.stats.unexpected || accessibility.stats.flaky || accessibilityTests.some(t=>t.results.length!==1 || t.results[0].status!=='passed' || t.results[0].retry!==0))
    throw new Error('No publication: complete current Issue 26 frontend suite must pass without skips or retries');
if(fingerprint()!==sourceHash)throw new Error('No publication: implementation/test/config files changed during the run');
const entries = [];
function collect(path) { for (const item of readdirSync(path, { withFileTypes: true })) {
    const file = resolve(path, item.name);
    if (item.isDirectory())
        collect(file);
    else if (item.name.endsWith('.png.json'))
        entries.push(JSON.parse(readFileSync(file, 'utf8')));
} }
collect(resolve(dir, 'screenshots'));
for (const folder of ['requester-dashboard', 'staff-dashboard', 'actions-taken'])
    for (const viewport of ['desktop', 'tablet', 'mobile'])
        if (!entries.some(e => e.artifact === `artifacts/lab-04/screenshots/${folder}/baseline-${viewport}.png`))
            throw new Error(`No publication: missing ${folder}/${viewport}`);
for (const entry of entries) {
    const path = entry.artifact.replace('artifacts/lab-04/', '');
    const source = resolve(dir, path);
    if (createHash('sha256').update(readFileSync(source)).digest('hex') !== entry.sha256)
        throw new Error('Artifact hash mismatch');
}
if(entries.length!==18 || new Set(entries.map(e=>e.artifact)).size!==18 || entries.some(e=>e.result!=='PASS' || e.run!==run || e.sourceHash!==sourceHash || e.buildHash!==buildHash || !e.submissionParts?.length)) throw new Error('No publication: incomplete artifact metadata');
for(const viewport of ['desktop','tablet','mobile']) for(const scenario of ['validation','requester-read-only'])
    if(!entries.some(e=>e.artifact===`artifacts/lab-04/screenshots/actions-taken/${scenario}-${viewport}.png`)) throw new Error('No publication: missing form/read-only viewport evidence');
const evidence = tests.map(t => ({ project: t.projectName, test: t.title, attachments: t.results[0].attachments.filter(a => ['schema-readiness', 'database-reconciliation', 'owned-schema-cleanup'].includes(a.name)).map(a => ({ name: a.name, data: a.body ? JSON.parse(Buffer.from(a.body, 'base64').toString()) : JSON.parse(readFileSync(a.path, 'utf8')) })) }));
const metrics=evidence.flatMap(e=>e.attachments.filter(a=>a.name==='database-reconciliation').flatMap(a=>(a.data.metricTable || []).map(row=>({...row,project:e.project,test:e.test,run}))));
if(metrics.length!==42 || metrics.some(r=>r.databaseValue!==r.apiValue || r.apiValue!==r.uiValue || r.result!=='PASS'))throw new Error('Dashboard reconciliation table incomplete');
// Preserve verified prior evidence before replacing any canonical capture/log.
const preservation=[];
if(previousManifest){
    const archive=resolve('artifacts/lab-04/regression/issue-27/history',previousManifest.run);
    const preserve=(source,target,expected)=>{
        const digest=createHash('sha256').update(readFileSync(source)).digest('hex');
        if(expected && digest!==expected)throw new Error('No publication: previous artifact hash mismatch');
        mkdirSync(resolve(target,'..'),{recursive:true});
        if(existsSync(target) && createHash('sha256').update(readFileSync(target)).digest('hex')!==digest)throw new Error('No publication: archive collision');
        if(!existsSync(target))cpSync(source,target);
        preservation.push({source,archive:relative(root,target),sha256:digest});
    };
    for(const entry of previousManifest.artifacts)preserve(entry.artifact,resolve(archive,entry.artifact.replace('artifacts/lab-04/','')),entry.sha256);
    preserve('artifacts/lab-04/manifest.json',resolve(archive,'manifest.json'));
    preserve('docs/lab-04/issue-27-verification.md',resolve(archive,'issue-27-verification.md'));
    for(const item of readdirSync('artifacts/lab-04/regression/issue-27',{withFileTypes:true}))if(item.isFile())preserve(resolve('artifacts/lab-04/regression/issue-27',item.name),resolve(archive,'regression',item.name));
}
const changes=entries.map(entry=>({artifact:entry.artifact,previousSha256:previousManifest?.artifacts.find(e=>e.artifact===entry.artifact)?.sha256 ?? null,sha256:entry.sha256,reason:entry.artifact.includes('actions-taken/') && !entry.artifact.includes('requester-read-only') ? 'Current-source Staff Ticket Detail: removed raw ID and contextual workflow feedback; asserted form/state capture' : 'Complete current-source candidate run; asserted role/viewport state'}));
for (const entry of entries) {
    const source=resolve(dir,entry.artifact.replace('artifacts/lab-04/',''));
    mkdirSync(resolve(root, entry.artifact, '..'), { recursive: true });
    cpSync(source, resolve(root, entry.artifact));
}
const acceptance = [
    ['AC-01', 'E2E-ACT-01; E2E-DASH-02-staff/admin', 'ACT-API-01'],
    ['AC-02', 'E2E-ACT-01', 'ACT-API-01; ACT-ASSIGN-01'],
    ['AC-03', 'E2E-ACT-01; E2E-WF-01', 'ACT-SEC-01'],
    ['AC-04', 'E2E-ACT-01', 'ACT-VAL-01'],
    ['AC-05', 'E2E-ACT-01', 'ACT-VAL-01'],
    ['AC-06', 'E2E-ACT-01', 'ACT-ASSIGN-01'],
    ['AC-07', 'E2E-ACT-01; E2E-WF-02', 'ACT-LIFE-01'],
    ['AC-08', 'E2E-ACT-01', 'ACT-LIFE-01'],
    ['AC-09', 'E2E-ACT-01', 'ACT-VAL-01; ACT-LIFE-01'],
    ['AC-10', 'E2E-WF-02', 'ACT-CONFLICT-01; WF-RACE-01'],
    ['AC-11', 'E2E-ACT-01; E2E-WF-01', 'ACT-RETRY-01'],
    ['AC-12', 'E2E-WF-02', 'WF-UNIT-01; WF-API-01'],
    ['AC-13', 'E2E-WF-02', 'WF-API-01; WF-RACE-01'],
    ['AC-14', 'E2E-WF-02', 'MIG-01; WF-API-01'],
    ['AC-15', 'E2E-WF-01', 'WF-SEC-01'],
    ['AC-16', 'E2E-DASH-02-admin; E2E-ACT-01; E2E-WF-01', 'WF-SEC-01'],
    ['AC-17', 'E2E-DASH-01', 'REQ-DASH-01; REQ-TIME-01'],
    ['AC-18', 'E2E-DASH-02-staff/admin', 'STAFF-DASH-01; DASH-PERF-01'],
    ['AC-19', 'E2E-DASH-01; E2E-DASH-02-staff/admin', 'REQ-DASH-01; STAFF-DASH-01'],
    ['AC-20', 'E2E-WF-02; E2E-DASH-03', 'ACT-UI-01; WF-UI-01; REQ-UI-01; STAFF-UI-01'],
    ['AC-21', 'Separate server migration/seed/recovery gate', 'MIG-01; DATA-01; SEED-01'],
    ['AC-22', 'Representative inherited journeys: E2E-WF-01/02; E2E-DASH-02-admin', 'Complete current server/client suites; full historical browser/release regression is not claimed'],
    ['AC-23', 'Three-viewports geometry and separate Issue 26 frontend suite', 'STYLE-01; RESP-A11Y-01 (frontend-only; see Issue 27 report for fresh separate execution)'],
    ['AC-24', 'Asserted canonical captures + strict publication/manifest gate', 'ART-01; candidate revision/source fingerprint, final-main revalidation belongs to Issue 28'],
].map(([ac, integrated, supplement]) => ({ ac, integrated, supplement, evidence: 'docs/lab-04/issue-27-verification.md', scope: ac === 'AC-22' ? 'support; complete historical browser regression pending release verification' : 'Issue 27 candidate evidence' }));
const manifest = { issue: 27, run, revision, sourceHash, buildHash, uiSpec:{path:'docs/lab-04/ui-spec.md',sha256:createHash('sha256').update(readFileSync('docs/lab-04/ui-spec.md')).digest('hex')}, submissionParts:[5,6,7,8,9], accessibility:{run:relative(root,dir),stats:accessibility.stats,scope:'intercepted frontend evidence only'}, generatedAt: new Date().toISOString(), result: 'PASS', stats: results.stats, command: 'npm run test:lab4:integrated', retries: 0, skips: 0, coreApisMocked: false, acceptance, database: 'toktickit_test / generated per-test schemas; real migrations; disposed after each test', scope: 'Issue 27 integrated evidence; Issue 26 frontend evidence remains separate. Final-main/deployment and full historical E2E release verification belong to Issue 28.', artifacts: entries };
mkdirSync('artifacts/lab-04/regression/issue-27', { recursive: true });
writeFileSync('artifacts/lab-04/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const name of ['browser.txt', 'server-build.txt', 'client-build.txt', 'server-regression.txt', 'client-regression.txt','accessibility.txt'])
    cpSync(resolve(dir, name), `artifacts/lab-04/regression/issue-27/${name}`);
// Durable assertion/reconciliation and readiness evidence, without copying traces or raw duplicate logs.
writeFileSync('artifacts/lab-04/regression/issue-27/integration-results.json', JSON.stringify({ run, revision, sourceHash, buildHash, phases, stats: results.stats, accessibility:accessibility.stats, evidence }, null, 2) + '\n');
writeFileSync('artifacts/lab-04/regression/issue-27/dashboard-reconciliation.json',JSON.stringify({run,sourceHash,buildHash,rows:metrics},null,2)+'\n');
const table=['| Metric / query predicate | Role | Database | API | Visible UI | Result |','| --- | --- | ---: | ---: | ---: | --- |',...metrics.filter(r=>r.project==='desktop').map(r=>`| ${r.metric}: ${r.predicate} | ${r.role} | ${r.databaseValue} | ${r.apiValue} | ${r.uiValue} | ${r.result} |`)];
writeFileSync('artifacts/lab-04/regression/issue-27/dashboard-reconciliation.md',`Run: ${run}\n\n`+table.join('\n')+'\n');
writeFileSync('artifacts/lab-04/regression/issue-27/artifact-validation.json',JSON.stringify({run,result:'PASS',canonicalCaptures:entries.length,hashesVerified:true,submissionParts:[5,6,7,8,9],accessibilityCases:accessibilityTests.length,integratedCases:tests.length,skips:0,retries:0,historicalLabsUnchanged:true,existingBuildOutputsUnchanged:true,preservation,changes},null,2)+'\n');
console.log(`Published ${entries.length} asserted captures. Run output: ${relative(root, dir)}`);
