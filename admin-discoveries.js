(function(){
'use strict';
const BASE='https://perplex-mas-inventory-api.duckfoolomw.workers.dev';
const KEY='perplex-mas-admin-token';
const $=id=>document.getElementById(id);
const status=$('discoveryStatus'), list=$('discoveryList'), select=$('discoveryItem');
function headers(){return {Authorization:'Bearer '+sessionStorage.getItem(KEY)}}
async function json(response){const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed');return data}
async function refresh(){
 status.textContent='Loading discoveries...';
 try{
  const [items, discoveries]=await Promise.all([
   fetch(BASE+'/admin/items',{headers:headers(),cache:'no-store'}).then(json),
   fetch(BASE+'/admin/discoveries',{headers:headers(),cache:'no-store'}).then(json)
  ]);
  const selected=select.value;
  select.replaceChildren();
  for(const item of items.items||[]){const opt=document.createElement('option');opt.value=item.item_id;opt.textContent=item.name;select.append(opt)}
  if([...select.options].some(o=>o.value===selected))select.value=selected;
  list.replaceChildren();
  for(const discovery of discoveries.discoveries||[]){
   const row=document.createElement('div');row.className='discovery-row';
   const label=document.createElement('strong');label.textContent=(discovery.item_name||discovery.item_id)+' · '+(discovery.type==='qr'?'QR code':'6-digit code');
   const detail=document.createElement('span');detail.textContent=' #'+discovery.id+' · '+(discovery.redeemed_at?'Redeemed '+discovery.redeemed_at:'Not redeemed');
   row.append(label,detail);
   if(!discovery.redeemed_at){
    const revoke=document.createElement('button');
    revoke.type='button';revoke.textContent='Revoke';
    revoke.style.background='#e5a7a0';
    revoke.addEventListener('click',async()=>{
     if(!window.confirm('Revoke this unused '+(discovery.type==='qr'?'QR code':'access code')+' for '+(discovery.item_name||discovery.item_id)+'? This cannot be undone.'))return;
     revoke.disabled=true;status.textContent='Revoking discovery #'+discovery.id+'...';
     try{
      await fetch(BASE+'/admin/discoveries',{
       method:'DELETE',
       headers:{...headers(),'Content-Type':'application/json'},
       body:JSON.stringify({id:discovery.id})
      }).then(json);
      await refresh();
      status.textContent='Discovery #'+discovery.id+' revoked. Shared inventory was not changed.';
     }catch(e){status.textContent=e.message;revoke.disabled=false}
    });
    row.append(revoke);
   }
   list.append(row);
  }
  if(!list.children.length)list.textContent='No discoveries registered yet.';
  status.textContent=(discoveries.discoveries||[]).length+' registered discoveries. Original codes are shown only when generated.';
 }catch(e){status.textContent=e.message}
}
function downloadQr(){
 const canvas=$('discoveryQr').querySelector('canvas');
 const img=$('discoveryQr').querySelector('img');
 const src=canvas?canvas.toDataURL('image/png'):img?.src;
 if(!src)return;
 const link=document.createElement('a');link.href=src;link.download='perplex-mas-discovery-qr.png';link.click();
}
$('discoveryCreateForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const button=$('discoveryCreateButton');button.disabled=true;status.textContent='Generating discovery...';
 $('discoveryResult').hidden=true;
 try{
  const type=$('discoveryType').value;
  const data=await fetch(BASE+'/admin/discoveries',{
   method:'POST',headers:{...headers(),'Content-Type':'application/json'},
   body:JSON.stringify({item_id:select.value,type})
  }).then(json);
  const token=data.token;
  const link=new URL('home.html',location.href);
  link.searchParams.set('qr',token);
  $('discoveryToken').textContent=token;
  $('discoveryCodeLabel').textContent=type==='qr'?'QR token (save now)':'Access code (save now)';
  $('discoveryQr').replaceChildren();
  $('discoveryQrLink').hidden=type!=='qr';
  $('discoveryQr').hidden=type!=='qr';
  $('discoveryQrDownload').hidden=type!=='qr';
  if(type==='qr'){
   $('discoveryQrLinkInput').value=link.href;
   if(window.QRCode){
    new window.QRCode($('discoveryQr'),{text:link.href,width:320,height:320,correctLevel:window.QRCode.CorrectLevel.L});
   }else{
    status.textContent='QR token created, but QR drawing library did not load. Save the link below.';
   }
  }
  $('discoveryResult').hidden=false;
  await refresh();
  status.textContent='Discovery created. Copy the code or QR link now; it cannot be retrieved later.';
 }catch(err){status.textContent=err.message}
 finally{button.disabled=false}
});
$('discoveryCopyToken').onclick=async()=>{try{await navigator.clipboard.writeText($('discoveryToken').textContent);status.textContent='Token copied.'}catch(e){status.textContent='Select and copy the token manually.'}};
$('discoveryCopyLink').onclick=async()=>{try{await navigator.clipboard.writeText($('discoveryQrLinkInput').value);status.textContent='QR link copied.'}catch(e){status.textContent='Select and copy the link manually.'}};
$('discoveryQrDownload').onclick=downloadQr;
$('discoveryRefresh').onclick=refresh;
document.addEventListener('perplex-admin-ready',refresh);
document.getElementById('adminSignOut').addEventListener('click',()=>{$('discoveryResult').hidden=true;select.replaceChildren();list.replaceChildren();status.textContent='Sign in to manage discoveries.'});
})();