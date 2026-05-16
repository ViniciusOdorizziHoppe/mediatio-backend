const MORPH_API=process.env.MORPH_API_URL||"https://realistic-viper-morph-82184336.koyeb.app";
const MORPH_EMAIL=process.env.MORPH_EMAIL||"mediatio@morph.app";
const MORPH_PASSWORD=process.env.MORPH_PASSWORD||"MediatioMorph@2026!";
let cachedToken=null;
let tokenExpiresAt=0;
class MorphService{
async getToken(){
if(cachedToken&&Date.now()<tokenExpiresAt)return cachedToken;
const res=await fetch(MORPH_API+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:MORPH_EMAIL,password:MORPH_PASSWORD})});
const data=await res.json();
if(!data.success||!data.token)throw new Error("Falha ao autenticar no Morph");
cachedToken=data.token;
tokenExpiresAt=Date.now()+6*24*60*60*1000;
return data.token
}
async batchTransform(files,options={}){
const token=await this.getToken();
const{style="automotive",strength=0.6,prompt}=options;
const fd=new FormData();
for(const f of files)fd.append("images",new Blob([f.buffer],{type:f.mimetype}),f.originalname);
fd.append("style",style);
fd.append("strength",String(strength));
if(prompt)fd.append("prompt",prompt);
const res=await fetch(MORPH_API+"/api/batch/generate",{method:"POST",headers:{Authorization:"Bearer "+token},body:fd});
if(!res.ok)throw new Error((await res.json().catch(()=>({}))).message||"Erro "+res.status);
return res.json()
}
}
module.exports=new MorphService();
