const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const cache=new Map();
function load(file){file=path.resolve(__dirname,'../src/lib/college',file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{exports,Buffer,URL,AbortSignal,fetch,process,require(id){if(id==='server-only')return {};if(id.startsWith('./'))return load(id+'.ts');return require(id);}});return exports;}
const roster=load('roster.ts'),office=load('roster-file.ts'),mail=load('invitation-email.ts');
const plain=v=>JSON.parse(JSON.stringify(v));
function crc(buffer){let crc=0xffffffff;for(const b of buffer){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(entries){const body=[],central=[];let offset=0;for(const [name,text]of Object.entries(entries)){const n=Buffer.from(name),data=Buffer.from(text),head=Buffer.alloc(30),dir=Buffer.alloc(46);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt32LE(crc(data),14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(n.length,26);dir.writeUInt32LE(0x02014b50);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt32LE(crc(data),16);dir.writeUInt32LE(data.length,20);dir.writeUInt32LE(data.length,24);dir.writeUInt16LE(n.length,28);dir.writeUInt32LE(offset,42);body.push(head,n,data);central.push(dir,n);offset+=head.length+n.length+data.length;}const c=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(entries).length,8);end.writeUInt16LE(Object.keys(entries).length,10);end.writeUInt32LE(c.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...body,c,end]);}
const xlsx=(cells)=>zip({'xl/workbook.xml':'<workbook xmlns:r="rel"><sheets><sheet name="Students" r:id="rId1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>','xl/worksheets/sheet1.xml':`<worksheet><sheetData>${cells}</sheetData></worksheet>`,'xl/sharedStrings.xml':'<sst><si><t>email</t></si><si><t>a@example.com</t></si></sst>'});
test('CSV, paste, stable temporary IDs, validation and limits',()=>{
  const rows=roster.rosterFromText('email,full_name,register_number\r\na@example.com,"Jane, Student",001');
  assert.equal(rows[0].register_number,'001');assert.equal(rows[0].full_name,'Jane, Student');
  const defaults=office.fillRosterDefaults(roster.rosterFromText('A@EXAMPLE.COM; b@example.com'));
  assert.equal(defaults.generated,2);assert.equal(defaults.rows[0].email,'a@example.com');
  assert.deepEqual(plain(office.fillRosterDefaults(roster.rosterFromText('a@example.com')).rows[0]),plain(defaults.rows[0]));
  assert.throws(()=>roster.validateRoster([defaults.rows[0],defaults.rows[0]]),/duplicate/);
  assert.throws(()=>roster.validateRoster([{...defaults.rows[0],email:'bad'}]),/Check row 1/);
  assert.throws(()=>roster.rosterFromText(Array.from({length:501},(_,i)=>`u${i}@example.com`).join('\n')),/500/);
  assert.throws(()=>roster.rosterFromText('Name,Address\nA,a@example.com'),/headings/);
  assert.equal(roster.rosterFromText('email\tfull_name\tregister_number\na@example.com\tName\t0002')[0].register_number,'0002');
});
test('Excel shared and inline strings; reject formulas and oversized files',async()=>{
  const rows=await office.parseRosterFile('students.xlsx',xlsx('<row><c r="A1" t="s"><v>0</v></c></row><row><c r="A2" t="s"><v>1</v></c></row>'));
  assert.equal(rows[0].email,'a@example.com');
  const inline=await office.parseRosterFile('students.xlsx',xlsx('<row><c r="A1" t="inlineStr"><is><t>a@example.com</t></is></c></row>'));
  assert.equal(inline[0].email,'a@example.com');
  await assert.rejects(()=>office.parseRosterFile('students.xlsx',xlsx('<row><c r="A1"><f>HYPERLINK("url")</f><v>a@example.com</v></c></row>')),/formulas/);
  await assert.rejects(()=>office.parseRosterFile('students.xlsx',Buffer.alloc(2*1024*1024+1)),/2 MB/);
  await assert.rejects(()=>office.parseRosterFile('students.xls',Buffer.from('a')),/newer format/);
  await assert.rejects(()=>office.parseRosterFile('students.docx',Buffer.from('not zip')),/Cannot open/);
  const bomb=zip({'word/document.xml':'<document/>'});const central=bomb.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));bomb.writeUInt32LE(21*1024*1024,central+24);
  await assert.rejects(()=>office.parseRosterFile('students.docx',bomb),/oversized/);
});
test('Word tables and paragraphs; no DTD or deeply nested XML',async()=>{
  const doc=body=>zip({'word/document.xml':`<w:document xmlns:w="word"><w:body>${body}</w:body></w:document>`});
  const cell=t=>`<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
  const rows=await office.parseRosterFile('list.docx',doc(`<w:tbl><w:tr>${cell('email')}${cell('full_name')}${cell('register_number')}</w:tr><w:tr>${cell('a@example.com')}${cell('A &amp; B')}${cell('001')}</w:tr></w:tbl>`));
  assert.equal(rows[0].full_name,'A & B');assert.equal(rows[0].register_number,'001');
  assert.equal((await office.parseRosterFile('list.docx',doc('<w:p><w:r><w:t>a@example.com</w:t></w:r></w:p>')))[0].email,'a@example.com');
  await assert.rejects(()=>office.parseRosterFile('list.docx',zip({'word/document.xml':'<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///test">]><document/>'})),/unsupported/);
  await assert.rejects(()=>office.parseRosterFile('list.docx',doc('<a>'.repeat(101)+'</a>'.repeat(101))),/nested/);
});
test('provider acceptance, rejection, unknown result and private recipients',async()=>{
  const config={key:'test-key',from:'College <invite@example.org>',joinUrl:'https://campus.example.org/join'};
  const job={id:'job-1',email:'a@example.com',college:'College A',attempt:1};let sent;
  const ok=await mail.deliverInvitation(config,job,async(url,options)=>{sent={url,...options};return {ok:true,json:async()=>({id:'provider-id'})};});
  assert.equal(ok.status,'SENT');assert.deepEqual(JSON.parse(sent.body).to,['a@example.com']);assert.match(JSON.parse(sent.body).text,/verify your email/);assert.equal(sent.headers['Idempotency-Key'],'college-invite/job-1/1');
  const reject=await mail.deliverInvitation(config,job,async()=>({ok:false,status:429}));assert.equal(reject.status,'FAILED');
  const unknown=await mail.deliverInvitation(config,job,async()=>({ok:false,status:500}));assert.equal(unknown.status,'UNCERTAIN');
  const disconnected=await mail.deliverInvitation(config,job,async()=>{throw Error('Network error')});assert.equal(disconnected.status,'UNCERTAIN');
  const old={...process.env};try{process.env.RESEND_API_KEY='test';process.env.INVITATION_FROM_EMAIL='a@example.org';process.env.NEXT_PUBLIC_APP_URL='http://localhost:3000';assert.equal(mail.invitationEmailConfig(),null);process.env.NEXT_PUBLIC_APP_URL='https://learn.example.org';assert.equal(mail.invitationEmailConfig().joinUrl,'https://learn.example.org/join');}finally{for(const k of ['RESEND_API_KEY','INVITATION_FROM_EMAIL','NEXT_PUBLIC_APP_URL']){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
