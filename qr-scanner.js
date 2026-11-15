/* Perplex-Mas QR camera scanner. Existing QR links remain supported. */
(function(){
  'use strict';
  let scanner=null, busy=false;
  const $=id=>document.getElementById(id);
  async function closeScanner(){
    const active=scanner;scanner=null;
    if(active){try{await active.stop()}catch(e){}try{active.clear()}catch(e){}}
    const panel=$('perplexQrCamera');if(panel)panel.remove();
  }
  async function loadLibrary(){
    if(window.Html5Qrcode)return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload=resolve;script.onerror=()=>reject(new Error('Scanner library could not load'));
      document.head.appendChild(script);
    });
  }
  async function startScanner(){
    const status=$('inventoryMessage');
    if(scanner){await closeScanner();status.textContent='Scanner closed.';return}
    const panel=document.createElement('div');panel.id='perplexQrCamera';panel.style.marginTop='12px';
    const view=document.createElement('div');view.id='perplexQrView';
    const close=document.createElement('button');close.type='button';close.className='action secondary';close.textContent='Close scanner';close.onclick=closeScanner;
    panel.append(view,close);$('inventoryClaimForm').append(panel);
    status.textContent='Starting camera...';
    try{
      await loadLibrary();
      scanner=new window.Html5Qrcode('perplexQrView');
      await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:220,height:220}},async scanned=>{
        if(busy)return;
        let token=null;
        try{
          const link=new URL(scanned);
          if(link.origin===location.origin&&link.pathname===location.pathname)token=link.searchParams.get('qr');
        }catch(e){}
        if(!token||!/^[A-Za-z0-9_-]{32,128}$/.test(token)){
          status.textContent='Scan a Perplex-Mas item QR code.';return;
        }
        busy=true;await closeScanner();
        if(!window.confirm('QR item discovered. Unlock for everyone?')){status.textContent='Unlock canceled.';busy=false;return}
        status.textContent='Unlocking item...';
        try{
          const response=await fetch('https://perplex-mas-inventory-api.duckfoolomw.workers.dev/unlock',{
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({qr_token:token})
          });
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||'Unlock failed');
          await window.loadSharedInventory();
          status.textContent=data.newly_unlocked?'QR item unlocked for everyone!':'Item already unlocked.';
        }catch(e){status.textContent=e.message||'Unable to unlock item.'}
        busy=false;
      },()=>{});
      status.textContent='Point your camera at a Perplex-Mas QR code.';
    }catch(e){console.error(e);await closeScanner();status.textContent='Camera unavailable. Use your phone camera to scan the QR link.'}
  }
  function initializeScannerButton(){
    const button=$('inventoryScan');
    if(button)button.onclick=startScanner;
    const close=$('inventoryClose');
    if(close)close.addEventListener('click',closeScanner);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeScannerButton,{once:true});
  }else{
    initializeScannerButton();
  }
})();