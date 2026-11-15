(function(){'use strict';
const API='https://perplex-mas-inventory-api.duckfoolomw.workers.dev/admin/check';
const KEY='perplex-mas-admin-token';
const form=document.getElementById('adminAuthForm');
const input=document.getElementById('adminSecretInput');
const message=document.getElementById('adminAuthMessage');
const gate=document.getElementById('adminAuthGate');
const manager=document.getElementById('adminManagerContent');
async function verify(secret){
 const response=await fetch(API,{method:'GET',headers:{Authorization:'Bearer '+secret},cache:'no-store'});
 if(!response.ok)throw Error('Admin secret not accepted ('+response.status+').');
 const data=await response.json();if(data.authenticated!==true)throw Error('Authentication failed');
}
function showManager(){gate.hidden=true;manager.hidden=false}
function showGate(){gate.hidden=false;manager.hidden=true}
form.addEventListener('submit',async e=>{
 e.preventDefault();const secret=input.value.trim();if(!secret)return;
 message.textContent='Verifying...';
 try{await verify(secret);sessionStorage.setItem(KEY,secret);input.value='';message.textContent='';showManager()}
 catch(err){message.textContent=err.message;sessionStorage.removeItem(KEY)}
});
document.getElementById('adminSignOut').addEventListener('click',()=>{sessionStorage.removeItem(KEY);showGate();message.textContent='Signed out.'});
const saved=sessionStorage.getItem(KEY);
if(saved){verify(saved).then(showManager).catch(()=>{sessionStorage.removeItem(KEY);showGate()})}
else showGate();
})();