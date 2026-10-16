// Static visible-copy audit. Internal identifiers, imported book data and proper
// names are deliberately excluded; domain enums are checked through presentation tests.
const ts=require('typescript'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const roots=['app','src'];
const forbidden=/\b(?:Dashboard|Settings|Overview|Billing|Revenue|Subscription|Sign in|Sign up|Sign out|Log out|Upgrade|Loading|Cancel|Retry|Churn|Entitlement|Entitlements|username|Password|Save|Delete|Search|Back|Next|Close|Get started|Learn more|Free|Storage|Sync|OWNER|ADMIN|Master)\b/gi;
const attributes=new Set(['title','label','placeholder','accessibilityLabel','accessibilityHint','description','subtitle']);
const findings=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.tsx$/.test(file))scan(file);}}
function scan(file){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function check(node,text){const words=text.replace(/\bAldus Admin\b/g,'Aldus').match(forbidden);if(words)findings.push({file:file.replaceAll('\\','/'),line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,words:[...new Set(words)]});}
 function visit(node){if(ts.isJsxText(node))check(node,node.text);if(ts.isJsxAttribute(node)&&attributes.has(node.name.getText(source))&&node.initializer&&ts.isStringLiteral(node.initializer))check(node,node.initializer.text);ts.forEachChild(node,visit);}visit(source);
}
roots.forEach(walk);
const {loader}=require('./library-test-utils.cjs');
const {planLabel,termLabel,dayLabel,dateInputToIsoDay,dateTimeInputFromIso,dateTimeInputToIso}=loader()('src/presentation/i18n/ptBR.ts');
const {formatBytes}=loader()('src/domain/saas/planPresentation.ts');
assert.equal(formatBytes(.2),'Em verificação');assert.equal(formatBytes(.2,true),'0,2 bytes');assert.equal(formatBytes(.001,true),'Menos de 0,01 byte');
assert.equal(planLabel('free','Free'),'Gratuito');assert.equal(planLabel('pro','Pro'),'Pro');
assert.equal(planLabel('custom','Nome comercial'),'Nome comercial');
assert.equal(planLabel('free','Gratuito especial'),'Gratuito especial');
assert.equal(planLabel('pro','Pro da editora'),'Pro da editora');
assert.equal(dateTimeInputFromIso('2026-10-16T23:59:00.000Z'),'16/10/2026 23:59');
assert.equal(dateTimeInputToIso('16/10/2026 23:59'),'2026-10-16T23:59:00.000Z');
for(const bad of ['31/04/2026 12:00','16/10/2026 24:00','16/10/2026 12:60','2026-10-16T12:00Z'])assert.equal(dateTimeInputToIso(bad),null);
for(const [id,label]of Object.entries({OWNER:'Proprietário',ADMIN:'Administrador',active:'Ativa',disabled:'Desativada',trialing:'Em avaliação concedida',expired:'Expirada',revoked:'Revogada',success:'Concluída',denied:'Negada'}))assert.equal(termLabel(id),label);
assert.equal(termLabel('private_storage'),'Armazenamento privado na nuvem');
assert.equal(dayLabel('2026-10-16'),'16/10/2026');assert.equal(dateInputToIsoDay('16/10/2026'),'2026-10-16');
assert.equal(dateInputToIsoDay('29/02/2024'),'2024-02-29');
for(const bad of ['29/02/2026','31/04/2026','2026-10-16','00/12/2026','01/13/2026'])assert.equal(dateInputToIsoDay(bad),null);
if(findings.length){console.log(JSON.stringify(findings,null,2));assert.fail(`${findings.length} visible-copy locations require pt-BR`);}
console.log('PASS pt-BR visible JSX copy: internal keys, domain enum literals, book contents and approved product terminology are excluded. Runtime enum labels are covered separately.');
