/* Perplex-Mas scanner using jsQR and direct camera frames. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const API='https://perplex-mas-inventory-api.duckfoolomw.workers.dev';
let stream=null,video=null,frame=0,active=false,busy=false,detecting=false;
async function closeScanner(){
 active=false;
 if(frame)cancelAnimationFrame(frame);
 frame=0;
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 if(video){video.pause();video.srcObject=null;video=null}
 $('perplexQrCamera')?.remove();
}
function loadDecoder(){
 if(window.jsQR)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  s.onload=()=>window.jsQR?resolve():reject(new Error('QR decoder unavailable'));
  s.onerror=()=>reject(new Error('QR decoder could not load'));
  document.head.appendChild(s);
 });
}
async function redeem(scanned){
 const status=$('inventoryMessage');
 status.textContent='QR detected. Checking Perplex-Mas link...';
 let token=null;
 try{
  const link=new URL(scanned);
  if(link.origin===location.origin&&/(?:^|\/)home\.html$/.test(link.pathname))token=link.searchParams.get('qr');
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
 if(active){await closeScanner();status.textContent='Scanner closed.';return}
 if(busy)return;
 const panel=document.createElement('div');panel.id='perplexQrCamera';panel.style.marginTop='12px';
 video=document.createElement('video');
 video.setAttribute('playsinline','');video.muted=true;video.autoplay=true;
 video.style.cssText='width:100%;max-width:480px;border-radius:12px;background:#111;display:block';
 const close=document.createElement('button');close.type='button';close.className='action secondary';close.textContent='Close scanner';
 close.onclick=()=>{closeScanner();status.textContent='Scanner closed.'};
 panel.append(video,close);$('inventoryClaimForm').append(panel);
 status.textContent='Starting camera and QR decoder...';
 try{
  await loadDecoder();
  stream=await navigator.mediaDevices.getUserMedia({
   audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}
  });
  video.srcObject=stream;
  await video.play();
  active=true;
  status.textContent='Point your camera at a Perplex-Mas QR code (new scanner).';
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  let last=0,frames=0,errors=0,ticks=0;
  function scan(now){
   if(!active)return;
   ticks++;
   if(ticks===1)status.textContent='Diagnostic v8: camera loop started.';
   frame=requestAnimationFrame(scan);
   if(busy||detecting||now-last<120||video.readyState<2)return;
   last=now;detecting=true;
   try{
    const w=video.videoWidth,h=video.videoHeight;
    if(!w||!h)return;
    const scale=Math.min(1,960/Math.max(w,h));
    canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    frames++;
    status.textContent='Diagnostic v8: '+frames+' frames checked ('+canvas.width+'×'+canvas.height+'), errors: '+errors+'.';
    const result=window.jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
    if(result?.data){busy=true;redeem(result.data)}
   }catch(e){errors++;console.error('QR frame scan:',e);status.textContent='QR processing error: '+(e.message||String(e))}
   finally{detecting=false}
  }
  frame=requestAnimationFrame(scan);
 }catch(e){
  console.error(e);await closeScanner();
  status.textContent='Scanner error: '+(e.message||'Unable to start camera.');
 }
}
function init(){
 $('inventoryScan')?.addEventListener('click',startScanner);
 $('inventoryClose')?.addEventListener('click',closeScanner);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();