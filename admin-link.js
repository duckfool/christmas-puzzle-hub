/* Admin navigation only; actual admin API authorization must be server-side. */
(function(){
  function syncAdminLink(){
    const inventory=document.getElementById('inventoryClaimForm');
    if(!inventory)return;
    let link=document.getElementById('perplexAdminLink');
    if(!link){
      link=document.createElement('a');
      link.id='perplexAdminLink';
      link.href='admin.html';
      link.className='action secondary';
      link.textContent='⚙️ Admin Item Manager';
      link.style.cssText='display:inline-block;text-decoration:none;margin:10px 0';
      inventory.parentNode.insertBefore(link,inventory);
    }
    const username=sessionStorage.getItem('christmas-event-user');
    link.hidden=username!=='duckfool';
    link.style.display=link.hidden?'none':'inline-block';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    syncAdminLink();
    document.getElementById('loginForm')?.addEventListener('submit',()=>setTimeout(syncAdminLink,0));
    document.getElementById('inventoryLaunch')?.addEventListener('click',syncAdminLink);
  });
})();