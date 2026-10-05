const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function setup({error=null,accepted=true,env={}}={}){
 const calls=[],cache=new Map();
 const environment={INVITATION_EMAIL_PROVIDER:'gmail',INVITATION_SENDER_NAME:'Future Platform',GMAIL_USER:'platform@gmail.com',GMAIL_APP_PASSWORD:'abcd efgh ijkl mnop',NEXT_PUBLIC_APP_URL:'https://learn.example.org',...env};
 function load(file){const full=path.resolve(__dirname,'../src/lib/college',file);if(cache.has(full))return cache.get(full);const exports={};cache.set(full,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,process:{env:environment},fetch(){throw Error('Gmail must not call Resend');},require(id){if(id==='server-only')return {};if(id==='nodemailer')return {createTransport(options){calls.push(['transport',options]);return {sendMail:async message=>{calls.push(['mail',message]);if(error)throw error;return {accepted:accepted?['student@example.com']:[],messageId:'message-id'};},close(){calls.push(['close']);}};}};if(id.startsWith('./'))return load(id+'.ts');throw Error(id);}});return exports;}
 return {...load('invitation-email.ts'),calls};
}
const job={id:'00000000-0000-4000-8000-000000000001',email:'student@example.com',college:'College A',attempt:1};
test('Gmail uses TLS, App Password, authenticated sender, private recipient and chosen platform name',async()=>{
 const app=setup(),config=app.invitationEmailConfig();assert.equal(config.provider,'gmail');assert.equal(config.password,'abcdefghijklmnop');
 const outcome=await app.deliverInvitation(config,job);assert.equal(outcome.status,'SENT');assert.match(outcome.detail,/not confirmed/);
 const transport=app.calls.find(c=>c[0]==='transport')[1];assert.equal(transport.host,'smtp.gmail.com');assert.equal(transport.port,465);assert.equal(transport.secure,true);assert.equal(transport.tls.rejectUnauthorized,true);assert.equal(transport.auth.user,'platform@gmail.com');assert.equal(transport.logger,false);
 const message=app.calls.find(c=>c[0]==='mail')[1];assert.equal(message.from.address,'platform@gmail.com');assert.equal(message.from.name,'Future Platform');assert.equal(message.to.length,1);assert.equal(message.to[0].address,'student@example.com');assert.equal(message.cc,undefined);assert.equal(message.bcc,undefined);assert.match(message.text,/Future Platform/);assert.match(message.text,/https:\/\/learn.example.org\/join/);assert.equal(message.text.includes(config.password),false);assert.equal(app.calls.at(-1)[0],'close');
});
test('Gmail explicit rejection allows retry; timeout and unconfirmed acceptance do not',async()=>{
 for(const [error,expected]of [[{code:'EAUTH',responseCode:535},'FAILED'],[{responseCode:550},'FAILED'],[{responseCode:421},'FAILED'],[{code:'ETIMEDOUT'},'UNCERTAIN'],[{code:'ECONNRESET'},'UNCERTAIN']]){const app=setup({error});assert.equal((await app.deliverInvitation(app.invitationEmailConfig(),job)).status,expected);assert.equal(app.calls.at(-1)[0],'close');}
 const app=setup({accepted:false});assert.equal((await app.deliverInvitation(app.invitationEmailConfig(),job)).status,'UNCERTAIN');
});
test('Gmail configuration fails closed for missing credentials, header injection, non-Gmail address and local website',()=>{
 for(const env of [{GMAIL_APP_PASSWORD:''},{GMAIL_APP_PASSWORD:'normalpassword'},{GMAIL_USER:'not-an-email'},{GMAIL_USER:'user@other.com'},{GMAIL_USER:'user@gmail.com\r\nBcc:other@gmail.com'},{INVITATION_SENDER_NAME:'Name\r\nBcc:other@gmail.com'},{NEXT_PUBLIC_APP_URL:'http://localhost:3000'},{INVITATION_EMAIL_PROVIDER:'unknown'}])assert.equal(setup({env}).invitationEmailConfig(),null);
 assert.equal(setup({env:{INVITATION_EMAIL_PROVIDER:''}}).invitationEmailConfig().provider,'gmail');
});
