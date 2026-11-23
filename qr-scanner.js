/* Perplex-Mas QR scanner v12: ZXing decoder diagnostics */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const API='https://perplex-mas-inventory-api.duckfoolomw.workers.dev';
let reader=null,controls=null,video=null,busy=false,starting=false,active=false;
async function closeScanner(){
 if(controls){try{controls.stop()}catch(e){}controls=null}
 active=false;
 if(reader){try{reader.reset()}catch(e){}reader=null}
 if(video){try{video.pause();video.srcObject=null}catch(e){}video=null}
 $('perplexQrCamera')?.remove();
}
async function loadZXing(){
 if(window.ZXing?.BrowserQRCodeReader)return;
 await new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  script.onload=resolve;
  script.onerror=()=>reject(Error('ZXing library failed to load'));
  document.head.appendChild(script);
 });
 if(!window.ZXing?.BrowserQRCodeReader)throw Error('ZXing decoder not available');
}
async function redeem(scanned){
 const status=$('inventoryMessage');
 let token=null;
 try{
  const link=new URL(scanned);
  if(link.origin===location.origin&&link.pathname.endsWith('/home.html'))token=link.searchParams.get('qr');
 }catch(e){}
 if(!token||!/^[A-Za-z0-9_-]{32,128}$/.test(token)){
  status.textContent='QR detected, but it is not a valid Perplex-Mas item link.';
  busy=false;return;
 }
 await closeScanner();
 if(!window.confirm('QR item discovered. Unlock for everyone?')){
  status.textContent='Unlock canceled.';busy=false;return;
 }
 status.textContent='Unlocking item...';
 try{
  const response=await fetch(API+'/redeem-discovery',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({qr_token:token})
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Unlock failed');
  await window.loadSharedInventory();
  status.textContent=data.newly_unlocked?'QR item unlocked for everyone!':'Item already unlocked.';
 }catch(e){status.textContent=e.message||'Unable to unlock item.'}
 busy=false;
}
async function startScanner(){
 const status=$('inventoryMessage');
 if(starting)return;
 if(active){await closeScanner();status.textContent='Scanner closed.';return}
 if(busy)return;
 starting=true;
 const panel=document.createElement('div');panel.id='perplexQrCamera';panel.style.marginTop='12px';
 video=document.createElement('video');video.setAttribute('playsinline','');
 video.muted=true;video.autoplay=true;
 video.style.cssText='width:100%;max-width:480px;border-radius:12px;background:#111;display:block';
 const close=document.createElement('button');close.type='button';close.className='action secondary';close.textContent='Close scanner';
 close.onclick=async()=>{await closeScanner();status.textContent='Scanner closed.'};
 panel.append(video,close);$('inventoryClaimForm').append(panel);
 status.textContent='Loading ZXing scanner v12...';
 try{
  await loadZXing();
  const hints=new Map();
  hints.set(window.ZXing.DecodeHintType.TRY_HARDER,true);
  reader=new window.ZXing.BrowserQRCodeReader(300,hints);
  const devices=await reader.listVideoInputDevices();
  const rear=devices.find(d=>/back|rear|environment/i.test(d.label));
  status.textContent='Starting ZXing camera...';
  active=true;
  let attempts=0,unexpected=0,detected=false;
  controls=await reader.decodeFromVideoDevice(rear?.deviceId||undefined,video,(result,error)=>{
   if(!active||busy)return;
   attempts++;
   if(result){
    detected=true;busy=true;
    status.textContent='QR detected by ZXing!';
    redeem(result.getText());
    return;
   }
   if(error&&!(error instanceof window.ZXing.NotFoundException)){
    unexpected++;
    if(unexpected<=3)console.warn('ZXing scan error',error);
   }
   if(attempts===1||attempts%5===0){
    status.textContent='ZXing v12: '+attempts+' scans, '+video.videoWidth+'×'+video.videoHeight+', errors: '+unexpected+'.';
   }
  });
  if(!detected&&attempts===0)status.textContent='ZXing v12 ready; waiting for first scan...';
 }catch(e){console.error(e);await closeScanner();status.textContent='ZXing error: '+(e.message||String(e))}
 finally{starting=false}
}
function init(){
 const button=$('inventoryScan');if(button)button.onclick=startScanner;
 $('inventoryClose')?.addEventListener('click',closeScanner);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();