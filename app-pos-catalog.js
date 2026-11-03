/* POS cashier catalog, cart editing and item modifier UI. */
(function (window) {
  'use strict';
  /* ---------- POS ---------- */
  function renderCats(){
    const sale=db.items.filter(i=>!i.ns);
    const list=[{k:'all',n:'Semua Menu',c:sale.length,img:null}].concat(db.cats.filter(c=>sale.some(i=>i.cat===c)||!db.items.some(i=>i.cat===c)).map(c=>({k:c,n:c,c:sale.filter(i=>i.cat===c).length})));
    $('#cats').innerHTML=list.map(c=>{
      return`<button class="cat ${S.cat===c.k?'on':''}" onclick="S.cat='${esc(c.k).replace(/'/g,"\\'")}';renderCats();renderGrid()"><div class="t"><b>${esc(c.n)}</b><small>${c.c} Items</small></div></button>`
    }).join('');
  }
  function filtered(){
    const q=S.q.trim().toLowerCase();
    return db.items.filter(i=>!i.ns&&(S.cat==='all'||i.cat===S.cat)&&(!q||i.name.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)||String(i.bc||'')===q));
  }
  function renderPop(){
    const w=$('#popW'),l=$('#popL');if(!w||!l)return;
    const key=db.orders.length+'|'+((db.orders[0]||{}).no||'')+'|'+db.items.length;
    if(S._pk!==key){
      const cnt={};db.orders.slice(0,400).forEach(o=>(o.lines||[]).forEach(x=>{cnt[x.bn||x.name]=(cnt[x.bn||x.name]||0)+(+x.qty||0)}));
      S._pt=Object.keys(cnt).filter(n=>cnt[n]>0).sort((a,b)=>cnt[b]-cnt[a]).slice(0,8);S._pk=key;
    }
    const items=S._pt.map(n=>db.items.find(i=>i.name===n&&!i.ns)).filter(Boolean);
    const show=S.view==='pos'&&S.cat==='all'&&!S.q.trim()&&items.length>0;
    w.hidden=!show;if(!show)return;
    l.innerHTML=items.map(i=>{const out=i.stock<=0||(!hasMods(i)&&(S.cart[i.id]||0)>=maxQty(i));return`<div class="pc"><div class="pi">${thumb(i)}</div><div class="pt"><div class="pn">${esc(i.name)}</div><div class="pp">${money(i.price)}</div></div><button class="pa" onclick="gridAdd('${i.id}')" ${out?'disabled':''}>+</button></div>`}).join('');
  }
  /* simpan & pulihkan posisi scroll agar daftar tidak lompat ke atas saat di-render ulang (iOS) */
  function renderGrid(){
    if(S.view!=='pos')return;keepScroll(renderGrid0,['.main'])
  }
  function renderGrid0(){
    applyGridView();renderPop();
    const l=filtered(),tapOn=db.set.gv.tap!=='none';
    $('#grid').innerHTML=l.length?l.map(i=>{
      const q=cartQtyOf(i.id),out=i.stock<=0;
      return`<div class="p"><div class="im${tapOn?' tap':''}${q?' has':''}"${tapOn?` onclick="tapItem('${i.id}')"`:''}>${thumb(i)}${out?'<div class="sold">HABIS</div>':''}${q?`<div class="qov">${q}</div>`:''}</div>
      <div class="nm">${esc(i.name)}</div>
      <div class="sub">${esc(i.cat)}</div>${isB(i)?`<div class="bdl">Isi: ${esc(bdLbl(i.bundle))}</div>`:''}
      <div class="stk ${i.stock<=i.min?'low':''}">Stok: ${i.stock}</div>
      <div class="row"><span class="pr">${money(i.price)}</span>
      <span class="qty"><button onclick="gridSub('${i.id}')" ${q?'':'disabled'}>−</button><span>${q}</span><button onclick="gridAdd('${i.id}')" ${out||(!hasMods(i)&&q>=maxQty(i))?'disabled':''}>+</button></span></div></div>`
    }).join(''):'<div class="empty">Menu tidak ditemukan. Tambahkan lewat menu Inventori.</div>';
  }
  /* ---------- aksi ketuk gambar menu ---------- */
  function tapItem(id){
    const it=find(id);if(!it)return;
    if(it.stock<=0){toast('Stok habis');return}
    const mode=db.set.gv.tap;
    if(mode==='add'&&!hasMods(it)){chg(id,1);return}
    if(!hasMods(it)&&(S.cart[id]||0)>=maxQty(it)){toast('Stok tidak mencukupi');return}
    S.pop={id,q:1,info:mode==='detail',sel:{}};popForm(S.pop.info);
  }
  function gridAdd(id){const it=find(id);if(!it)return;if(hasMods(it)){if(it.stock<=0){toast('Stok habis');return}S.pop={id,q:1,info:false,sel:{}};popForm(false)}else chg(id,1)}
  function gridSub(id){const ks=Object.keys(S.cart).filter(k=>bid(k)===id);if(ks.length)chg(ks[ks.length-1],-1)}
  function popSel(){const p=S.pop,it=find(p.id),out=[];if(!it||!hasMods(it))return out;it.mods.forEach((g,gi)=>{((p.sel||{})[gi]||[]).forEach(oi=>{const o=g.o[oi];if(o)out.push({g:g.n,n:o.n,p:+o.p||0})})});return out}
  function popPick(gi,oi,multi){const p=S.pop;p.sel=p.sel||{};const a=p.sel[gi]||[];if(multi){const k=a.indexOf(oi);if(k>=0)a.splice(k,1);else a.push(oi);p.sel[gi]=a}else p.sel[gi]=(a[0]===oi?[]:[oi]);popForm(p.info)}
  function popForm(info){
    const p=S.pop,it=find(p.id);if(!it)return;
    const room=maxQty(it)-(S.cart[p.id]||0);
    const modH=hasMods(it)?it.mods.map((g,gi)=>`<div class="mg"><label class="fl">${esc(g.n)}${g.req?' <span class="rq1">wajib</span>':''}${g.multi?' <small>(boleh lebih dari satu)</small>':''}</label><div class="chips">${g.o.map((o,oi)=>`<button type="button" class="chip ${((p.sel||{})[gi]||[]).includes(oi)?'on':''}" onclick="popPick(${gi},${oi},${g.multi?1:0})">${esc(o.n)}${o.p?' +'+money(o.p):''}</button>`).join('')}</div></div>`).join(''):'';
    const extra=popSel().reduce((a,x)=>a+x.p,0);
    openModal(`${info?`<div class="pop-im">${thumb(it)}</div>`:''}
    <h3 style="margin:${info?'14px':'0'} 0 2px;font-size:20px">${esc(it.name)}</h3>
    ${info?`<div style="color:var(--mu);font-size:13px">${esc(it.cat)} · <span>Stok: ${it.stock}</span></div>`:''}
    <div class="pp-price">${money(it.price+extra)}</div>${modH}
    <label class="fl" style="text-align:center">Jumlah</label>
    <div class="pop-q"><span class="qty"><button onclick="popQ(-1)" ${p.q<=1?'disabled':''}>−</button><span>${p.q}</span><button onclick="popQ(1)" ${p.q>=room?'disabled':''}>+</button></span></div>
    <div class="chg" style="background:var(--chip);color:var(--tx)"><span>Subtotal</span><span>${money(rnd((it.price+extra)*p.q))}</span></div>
    <button class="btn" onclick="popAdd()">Tambah ke Pesanan</button>
    <button class="btn sec" onclick="closeModal()">Batal</button>`);
  }
  function popQ(d){
    const p=S.pop,it=find(p.id);if(!it)return;
    p.q=Math.max(1,Math.min(maxQty(it)-(S.cart[p.id]||0),p.q+d));popForm(p.info);
  }
  function popAdd(){
    const p=S.pop;if(!p)return;const it=find(p.id);if(!it)return;
    if(hasMods(it)){
      for(let gi=0;gi<it.mods.length;gi++){const g=it.mods[gi];if(g.req&&!(((p.sel||{})[gi]||[]).length)){toast('Pilih '+g.n+' dulu');return}}
      const sel=popSel(),k=modKey(p.id,sel);if(sel.length)S.cm[k]={sel};chg(k,p.q);
    }else chg(p.id,p.q);
    S.pop=null;closeModal()}
  function chg(id,d){
    const it=find(bid(id));if(!it)return;
    let n=(S.cart[id]||0)+d;
    const mx=maxQty(it,id);if(n>mx){n=mx;toast('Stok tidak mencukupi')}
    if(n<=0)delete S.cart[id];else S.cart[id]=n;
    renderGrid();renderInvoice();
  }
  Object.assign(window, {
    renderCats: renderCats,
    filtered: filtered,
    renderPop: renderPop,
    renderGrid: renderGrid,
    renderGrid0: renderGrid0,
    tapItem: tapItem,
    gridAdd: gridAdd,
    gridSub: gridSub,
    popSel: popSel,
    popPick: popPick,
    popForm: popForm,
    popQ: popQ,
    popAdd: popAdd,
    chg: chg
  });
})(window);
