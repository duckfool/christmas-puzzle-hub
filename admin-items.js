(function(){
'use strict';
const API='https://perplex-mas-inventory-api.duckfoolomw.workers.dev/admin/items';
const KEY='perplex-mas-admin-token';
const $=id=>document.getElementById(id);
const msg=$('itemManagerStatus'),grid=$('itemCatalog');
function auth(){return {'Authorization':'Bearer '+sessionStorage.getItem(KEY)}}
function card(item){
 const el=document.createElement('article');el.className='card';
 const title=document.createElement('h3');title.textContent=item.name;
 const desc=document.createElement('p');desc.textContent=item.description||'No description';
 const meta=document.createElement('p');meta.textContent='Maximum ×'+item.max_quantity+' · '+(item.stackable?'Stackable':'Not stackable')+' · '+(item.craftable?'Crafting material':'Not crafting material');
 const edit=document.createElement('button');edit.type='button';edit.textContent='Edit item';edit.addEventListener('click',()=>openEdit(item));
 const remove=document.createElement('button');remove.type='button';remove.textContent='Remove item';remove.style.background='#e5a7a0';remove.addEventListener('click',()=>removeItem(item,remove));
 el.append(title,meta,desc,edit,remove);
 if(item.image_url){const img=document.createElement('img');img.src=item.image_url;img.alt=item.name;img.style.cssText='max-width:100%;height:130px;object-fit:contain';el.prepend(img)}
 return el;
}
async function removeItem(item,button){
 const answer=window.prompt('Permanently remove '+item.name+'? Type DELETE to confirm. This cannot be undone.');
 if(answer!=='DELETE')return;
 button.disabled=true;msg.textContent='Removing '+item.name+'...';
 try{
  const res=await fetch(API,{method:'DELETE',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({item_id:item.item_id})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to remove item');
  if($('itemCreateForm').dataset.mode==='edit'&&$('itemId').value===item.item_id)resetForm();
  await refresh();msg.textContent='Removed '+item.name+'.';
 }catch(e){msg.textContent=e.message}finally{button.disabled=false}
}
function openEdit(item){
 $('itemCreateForm').hidden=false;$('addItemButton').hidden=true;
 $('itemFormHeading').textContent='Edit item';$('saveItemButton').textContent='Save changes';
 $('itemId').value=item.item_id;$('itemId').readOnly=true;$('itemId').dataset.edited='true';
 $('itemName').value=item.name;$('itemDescription').value=item.description||'';
 $('itemImageUrl').value=item.image_url||'';$('itemQuantity').value=item.max_quantity;
 $('itemStackable').checked=Boolean(item.stackable);$('itemCraftable').checked=Boolean(item.craftable);
 $('itemCreateForm').dataset.mode='edit';
 $('itemCreateForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function resetForm(){
 $('itemCreateForm').reset();$('itemCreateForm').hidden=true;$('addItemButton').hidden=false;
 $('itemCreateForm').dataset.mode='create';$('itemId').readOnly=false;
 delete $('itemId').dataset.edited;$('itemFormHeading').textContent='Create an item';
 $('saveItemButton').textContent='Save item';
}
async function refresh(){
 msg.textContent='Loading items...';
 try{
  const res=await fetch(API,{headers:auth(),cache:'no-store'});const data=await res.json();
  if(!res.ok)throw Error(data.error||'Unable to load items');
  grid.replaceChildren();
  for(const item of data.items||[])grid.append(card(item));
  msg.textContent=(data.items||[]).length+' saved item types';
 }catch(e){msg.textContent=e.message}
}
$('addItemButton').addEventListener('click',()=>{resetForm();$('itemCreateForm').hidden=false;$('addItemButton').hidden=true});
$('cancelItemButton').addEventListener('click',resetForm);
$('refreshItemsButton').addEventListener('click',refresh);
$('itemName').addEventListener('input',()=>{
 const slug=$('itemName').value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
 if(!$('itemId').dataset.edited)$('itemId').value=slug;
});
$('itemId').addEventListener('input',()=>{$('itemId').dataset.edited='true'});
$('itemCreateForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('saveItemButton');button.disabled=true;msg.textContent='Saving item...';
 const editing=$('itemCreateForm').dataset.mode==='edit';
 const item={item_id:$('itemId').value.trim(),name:$('itemName').value.trim(),description:$('itemDescription').value.trim(),image_url:$('itemImageUrl').value.trim(),max_quantity:Number($('itemQuantity').value),stackable:$('itemStackable').checked,craftable:$('itemCraftable').checked};
 try{
  const res=await fetch(API,{method:editing?'PUT':'POST',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify(item)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Could not save item');
  resetForm();
  await refresh();msg.textContent=(editing?'Updated ':'Saved ')+item.name+'.';
 }catch(e){msg.textContent=e.message}finally{button.disabled=false}
});
document.addEventListener('perplex-admin-ready',refresh);
})();