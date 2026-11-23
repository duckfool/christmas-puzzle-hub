
const INVENTORY_API='https://perplex-mas-inventory-api.duckfoolomw.workers.dev';
'use strict';
// Player inventory is read-only. Admin quantity changes use the protected API.
async function loadSharedInventory(){
 const items=document.getElementById('inventoryItems');
 const status=document.getElementById('inventoryMessage');
 try{
  const response=await fetch('https://perplex-mas-inventory-api.duckfoolomw.workers.dev/player-inventory',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.items))throw Error('Unexpected inventory response');
  items.replaceChildren();
  if(!data.items.length){
   const empty=document.createElement('div');empty.className='inventory-empty';
   const title=document.createElement('strong');title.textContent='Your inventory is empty';
   const note=document.createElement('span');note.textContent='Discover items throughout Perplex-Mas to fill your inventory.';
   empty.append(title,note);items.append(empty);
  }else{
   const list=document.createElement('div');list.style.display='grid';list.style.gap='12px';
   for(const item of data.items){
    const quantity=Number(item.quantity);
    if(!Number.isSafeInteger(quantity)||quantity<=0)continue;
    const card=document.createElement('article');card.className='card';card.style.minHeight='0';
    const title=document.createElement('h3');title.textContent=String(item.name||item.item_id||'Item')+' ×'+quantity;
    const desc=document.createElement('p');desc.textContent=String(item.description||'Discovered by your group');
    if(item.image_url && /^https:\/\//i.test(item.image_url)){
     const img=document.createElement('img');img.src=item.image_url;img.alt=String(item.name||'Item');
     img.loading='lazy';img.style.cssText='max-width:100%;max-height:160px;object-fit:contain';
     card.append(img);
    }
    card.append(title,desc);list.append(card);
   }
   items.append(list);
  }
  status.textContent='Group inventory synchronized.';
 }catch(error){
  status.textContent='Unable to load group inventory. Please try again.';
  console.error(error);
 }
}
document.getElementById('inventoryLaunch').addEventListener('click',loadSharedInventory);
const QR_TOKEN_PATTERN=/^[A-Za-z0-9_-]{32,128}$/;
const qrLinkToken=new URLSearchParams(window.location.search).get('qr');
if(qrLinkToken){
 if(QR_TOKEN_PATTERN.test(qrLinkToken)){
  const showQrConfirmation=()=>{
   if(document.getElementById('hubWrap').hidden)return;
   if(document.getElementById('qrConfirm'))return;
   const panel=document.createElement('div');panel.id='qrConfirm';panel.className='card';panel.style.margin='12px 0';
   const heading=document.createElement('strong');heading.textContent='QR item discovered';
   const note=document.createElement('p');note.textContent='Unlock this item for the entire group?';
   const confirm=document.createElement('button');confirm.type='button';confirm.className='action';confirm.textContent='Unlock QR item';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='action secondary';cancel.textContent='Not now';cancel.style.marginLeft='8px';
   const message=document.createElement('p');message.setAttribute('role','status');
   const clearLink=()=>{const url=new URL(location.href);url.searchParams.delete('qr');history.replaceState(null,'',url)};
   cancel.onclick=()=>{clearLink();panel.remove()};
   confirm.onclick=async()=>{
    confirm.disabled=true;message.textContent='Unlocking...';
    try{
     const response=await fetch(INVENTORY_API+'/redeem-discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({qr_token:qrLinkToken})});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unlock failed');
     clearLink();panel.remove();document.getElementById('inventoryLaunch').click();
     document.getElementById('inventoryMessage').textContent=data.newly_unlocked?'QR item unlocked for everyone!':'This item is already unlocked.';
    }catch(error){message.textContent=error.message;confirm.disabled=false}
   };
   panel.append(heading,note,confirm,cancel,message);
   document.getElementById('hubWrap').prepend(panel);
  };
  const loginForm=document.getElementById('loginForm');
  loginForm.addEventListener('submit',()=>setTimeout(showQrConfirmation,0));
  showQrConfirmation();
 }else{
  console.warn('Invalid QR link token format');
 }
}

