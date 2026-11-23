/* Perplex-Mas QR scanner v14: ZXing decoder diagnostics */
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
 video.style.cssText='width:100%;height:100%;object-fit:cover;display:block;background:#111';
 const viewer=document.createElement('div');
 viewer.style.cssText='position:relative;width:100%;max-width:480px;aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:#111';
 const overlay=document.createElement('div');
 overlay.style.cssText='position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center';
 const guide=document.createElement('div');
 guide.style.cssText='position:relative;width:76%;aspect-ratio:1;border:2px solid rgba(104,245,170,.22);border-radius:16px;box-shadow:0 0 0 100vmax rgba(0,0,0,.10)';
 for(const [top,left,border] of [['0','0','border-top:5px solid #68f5aa;border-left:5px solid #68f5aa'],['0','auto','border-top:5px solid #68f5aa;border-right:5px solid #68f5aa'],['auto','0','border-bottom:5px solid #68f5aa;border-left:5px solid #68f5aa'],['auto','auto','border-bottom:5px solid #68f5aa;border-right:5px solid #68f5aa']]){
  const corner=document.createElement('div');
  corner.style.cssText='position:absolute;top:'+top+';left:'+left+';right:'+(left==='auto'?'0':'auto')+';bottom:'+(top==='auto'?'0':'auto')+';width:34px;height:34px;'+border+';border-radius:4px';
  guide.appendChild(corner);
 }
 const scanline=document.createElement('div');
 scanline.style.cssText='position:absolute;left:5%;right:5%;top:10%;height:2px;background:#68f5aa;box-shadow:0 0 12px #68f5aa;animation:perplexScan 2.3s ease-in-out infinite alternate';
 guide.appendChild(scanline);overlay.appendChild(guide);viewer.append(video,overlay);
 if(!document.getElementById('perplexScanStyle')){
  const style=document.createElement('style');style.id='perplexScanStyle';
  style.textContent='@keyframes perplexScan{from{top:10%}to{top:90%}}';
  document.head.appendChild(style);
 }
 const indicator=document.createElement('div');
 indicator.style.cssText='margin:8px 0;color:#d9f9e3;font-size:14px';
 indicator.textContent='● Camera starting…';
 const close=document.createElement('button');close.type='button';close.className='action secondary';close.textContent='Close scanner';
 close.onclick=async()=>{await closeScanner();status.textContent='Scanner closed.'};
 panel.append(indicator,viewer,close);$('inventoryClaimForm').append(panel);
 status.textContent='Loading ZXing scanner v14...';
 try{
  await loadZXing();
  const hints=new Map();
  hints.set(window.ZXing.DecodeHintType.TRY_HARDER,true);
  reader=new window.ZXing.BrowserQRCodeReader(300,hints);
  const constraints={audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}};
  status.textContent='Starting ZXing camera...';
  active=true;
  let attempts=0,unexpected=0,detected=false;
  controls=await reader.decodeFromConstraints(constraints,video,(result,error)=>{
   if(!active||busy)return;
   attempts++;
   if(result){
    detected=true;busy=true;
    indicator.textContent='✓ QR code recognized!';
    status.textContent='QR detected by ZXing!';
    redeem(result.getText());
    return;
   }
   if(error&&!(error instanceof window.ZXing.NotFoundException)){
    unexpected++;
    if(unexpected<=3)console.warn('ZXing scan error',error);
   }
   if(attempts===1||attempts%5===0){
    indicator.textContent='● Searching for QR code… '+attempts+' attempts';
    status.textContent='ZXing v14: '+attempts+' scans, '+video.videoWidth+'×'+video.videoHeight+', errors: '+unexpected+'.';
   }
  });
  if(!detected&&attempts===0){status.textContent='ZXing v14 ready; waiting for first scan...';indicator.textContent='● Searching for QR code…'}
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