(function(){
'use strict';
const BASE='https://perplex-mas-inventory-api.duckfoolomw.workers.dev';
const KEY='perplex-mas-admin-token';
const $=id=>document.getElementById(id);
const status=$('discoveryStatus'), list=$('discoveryList'), select=$('discoveryItem');
function headers(){return {Authorization:'Bearer '+sessionStorage.getItem(KEY)}}
function discoveryLink(token){
 const link=new URL('r.html',location.href);
 let compact=token;
 if(/^[0-9a-f]{64}$/i.test(token)){
  const bytes=token.match(/../g).map(h=>String.fromCharCode(parseInt(h,16))).join('');
  compact='h_'+btoa(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 }
 link.searchParams.set('q',compact);
 return link;
}
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
   const view=document.createElement('button');
   view.type='button';
   view.textContent=discovery.type==='qr'?'View QR':'View Code';
   view.addEventListener('click',async()=>{
    view.disabled=true;
    status.textContent='Retrieving discovery #'+discovery.id+'...';
    try{
     const data=await fetch(BASE+'/admin/discoveries/token?id='+encodeURIComponent(discovery.id),{headers:headers(),cache:'no-store'}).then(json);
     const token=data.token;
     $('discoveryToken').textContent=token;
     $('discoveryCodeLabel').textContent=discovery.type==='qr'?'Saved QR token':'Saved access code';
     $('discoveryQr').replaceChildren();
     const isQr=discovery.type==='qr';
     $('discoveryQrLink').hidden=!isQr;
     $('discoveryQr').hidden=!isQr;
     $('discoveryQrDownload').hidden=!isQr;
     if(isQr){
      const link=discoveryLink(token);
      $('discoveryQrLinkInput').value=link.href;
      if(window.QRCode){
       new window.QRCode($('discoveryQr'),{text:link.href,width:320,height:320,correctLevel:window.QRCode.CorrectLevel.L});
      }else{throw Error('QR drawing library did not load. You can still copy the QR link.')}
     }
     $('discoveryResult').hidden=false;
     $('discoveryResult').scrollIntoView({behavior:'smooth',block:'center'});
     status.textContent='Discovery #'+discovery.id+' loaded. Keep its token private.';
    }catch(e){status.textContent=e.message}
    finally{view.disabled=false}
   });
   row.append(view);
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
  status.textContent=(discoveries.discoveries||[]).length+' registered discoveries. Select View Code or View QR to reopen encrypted discoveries.';
 }catch(e){status.textContent=e.message}
}
function downloadQr(){
 const canvas=$('discoveryQr').querySelector('canvas');
 const img=$('discoveryQr').querySelector('img');
 const src=canvas?canvas.toDataURL('image/png'):img?.src;
 if(!src)return;
 const link=document.createElement('a');link.href=src;link.download='perplex-mas-discovery-qr.png';link.click();
}
const customWrap=document.createElement('div');
const customLabel=document.createElement('label');customLabel.htmlFor='customDiscoveryCode';customLabel.textContent='Custom access code (optional)';
const customInput=document.createElement('input');customInput.id='customDiscoveryCode';customInput.type='text';customInput.inputMode='numeric';customInput.maxLength=6;customInput.pattern='[0-9]{6}';customInput.placeholder='Leave blank for random code';customInput.autocomplete='off';
customWrap.append(customLabel,customInput);
$('discoveryCreateButton').before(customWrap);
function syncCustomCode(){const isCode=$('discoveryType').value==='code';customWrap.hidden=!isCode;customInput.disabled=!isCode;}
$('discoveryType').addEventListener('change',syncCustomCode);syncCustomCode();
$('discoveryCreateForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const button=$('discoveryCreateButton');button.disabled=true;status.textContent='Generating discovery...';
 $('discoveryResult').hidden=true;
 try{
  const type=$('discoveryType').value;
  const data=await fetch(BASE+'/admin/discoveries',{
   method:'POST',headers:{...headers(),'Content-Type':'application/json'},
   body:JSON.stringify({item_id:select.value,type,...(type==='code'&&customInput.value!==''?{custom_code:customInput.value}:{})})
  }).then(json);
  const token=data.token;
  const link=discoveryLink(token);
  $('discoveryToken').textContent=token;
  $('discoveryCodeLabel').textContent=type==='qr'?'QR token':'Access code';
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
  const mismatch=type==='code'&&customInput.value!==''&&token!==customInput.value;
  if(!mismatch)customInput.value='';
  await refresh();
  status.textContent=mismatch?'Warning: Worker returned a different code. Check the deployment and revoke the unwanted discovery if needed.':'Discovery created. You can reopen it from the discovery list.';
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