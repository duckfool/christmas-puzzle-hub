'use strict';
// Player inventory is read-only. Admin quantity changes use the protected API.
window.loadSharedInventory = async function loadPlayerInventory(){
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
};
