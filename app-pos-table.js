/* POS table occupancy, reservation indicators and table actions. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const locEsc=v=>String(v==null?'':v);
  function locTbl(k){const o=[];
    (db.holds||[]).filter(h=>!h.del&&h.tbl&&(!k||tkey(h.tbl)===tkey(k))).forEach(h=>o.push({kind:'hold',tbl:h.tbl,id:h.id,t:h.t,by:h.by,cust:h.cust,n:Object.values(h.cart).reduce((a,b)=>a+b,0),total:holdTotal(h)}));
    (db.occ||[]).filter(x=>!x.del&&(!k||tkey(x.tbl)===tkey(k))).forEach(x=>o.push({kind:'occ',tbl:x.tbl,id:x.id,t:x.t,by:x.by,cust:x.cust,no:x.no,total:x.total}));
    return o}
  function tblStep(d){db.set.tblN=Math.max(1,Math.min(60,(+db.set.tblN||9)+d));save();renderTable()}
  function renderTable(){
    const el=$('#tableBox');if(!el)return;
    const act=(typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>tkey(o.tbl)&&(o.status==='new'||o.status==='accepted'));
    const n=Math.max(1,Math.min(60,+db.set.tblN||9)),names=[];
    for(let i=1;i<=n;i++)names.push(String(i));
    act.forEach(o=>{const k=tkey(o.tbl);if(!names.includes(k))names.push(k)});
    const LT=locTbl();LT.forEach(x=>{const k=tkey(x.tbl);if(!names.includes(k))names.push(k)});
    const lt=k=>LT.filter(x=>tkey(x.tbl)===k);
    const by=k=>act.filter(o=>tkey(o.tbl)===k);
    const st=k=>{const a=by(k),l=lt(k);return(a.some(o=>o.status==='accepted')||l.some(x=>x.kind==='occ'))?'p':(a.length||l.length)?'n':(window.P2&&P2.rsvFor(k).length?'r':'f')};
    const c={f:0,n:0,p:0,r:0};names.forEach(k=>c[st(k)]++);
    const lbl={f:'Kosong',n:'Baru · belum bayar',p:'Diproses',r:'Dipesan'};
    const rv=k=>{const q=window.P2?P2.rsvFor(k)[0]:null;return q?'<small>'+new Date(q.t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')+' · '+esc(q.name)+'</small>':''};
    const paid=o=>o.pst===2,pl=k=>{const a=by(k),l=lt(k);if(!a.length&&!l.length)return '';return(a.every(paid)&&!l.some(x=>x.kind==='hold'))?'Sudah bayar':'Belum bayar'};
    el.innerHTML=`
    <div class="hm-h"><div><h2>Meja</h2></div>
      ${isOwner()||can('set')?`<span class="stp">Jumlah meja <button onclick="tblStep(-1)" aria-label="Kurangi">−</button>${n}<button onclick="tblStep(1)" aria-label="Tambah">+</button></span>`:''}</div>
    <div class="tbg">
      <div class="panel"><div class="tbs">${names.map(k=>{const s=st(k),a=by(k),l=lt(k);return`<button type="button" class="tbc ${s==='f'?'':s}" onclick="tblOpen('${esc(k).replace(/'/g,"\\'")}')"><b>${esc(k)}</b><small>${s==='p'?'Diproses · '+pl(k):lbl[s]}</small>${rv(k)}${l.length&&!a.length?`<small>${l.length} pesanan kasir${[...new Set(l.map(x=>x.by).filter(Boolean))].length?' · '+esc([...new Set(l.map(x=>x.by).filter(Boolean))].join(', ')):''}</small>`:''}${a.length?`<small>${a.length} pesanan${[...new Set(a.map(o=>o.by).filter(Boolean))].length?' · '+esc([...new Set(a.map(o=>o.by).filter(Boolean))].join(', ')):''}</small>`:''}</button>`}).join('')}</div>
        <div class="tlg"><span><i style="background:#6fd6a0"></i>Kosong: ${c.f}</span><span><i style="background:#f7c244"></i>Pesanan baru: ${c.n}</span><span><i style="background:var(--b)"></i>Diproses: ${c.p}</span><span><i style="background:#60a5fa"></i>Dipesan: ${c.r}</span></div></div>
      <div class="panel"><h3>Pesanan Aktif</h3>${act.length?act.map(o=>`<button class="li" onclick="coDet(${o.id})"><span class="l"><b>Meja ${esc(o.tbl)} · ${esc(o.name)}</b><small>${o.lines.reduce((a,l)=>a+l.qty,0)} item · ${esc(ago(o.t))}${o.by?' · '+esc(o.by):''}</small></span><span class="r"><b>${money(o.total)}</b><small>${o.status==='new'?'baru':'diproses'}</small></span><span class="ch">›</span></button>`).join(''):'<div class="mt">Belum ada pesanan online aktif dengan nomor meja.</div>'}${LT.map(x=>`<button class="li" onclick="tblOpen('${esc(tkey(x.tbl)).replace(/'/g,"\\'")}')"><span class="l"><b>Meja ${esc(x.tbl)} · ${esc(x.cust||'Kasir')}</b><small>${x.kind==='hold'?x.n+' item · ditahan':esc(x.no)} · ${esc(ago(x.t))}${x.by?' · '+esc(x.by):''}</small></span><span class="r"><b>${money(x.total)}</b><small>${x.kind==='hold'?'belum bayar':'sudah bayar'}</small></span><span class="ch">›</span></button>`).join('')}</div>
    </div>`;
  }
  
  async function tblClear(k){
    const a=(CO.list||[]).filter(o=>tkey(o.tbl)===tkey(k)&&(o.status==='new'||o.status==='accepted'));const oc=(db.occ||[]).filter(x=>!x.del&&tkey(x.tbl)===tkey(k));
    if(!a.length){if(oc.length&&confirm('Pelanggan di meja '+k+' sudah pergi? Meja jadi kosong.')){oc.forEach(x=>{x.del=1;x.u=Date.now()});save();toast('Meja '+k+' dikosongkan');renderTable()}closeModal();return}
    const unp=a.filter(o=>o.pst!==2),tot=unp.reduce((x,o)=>x+o.total,0);
    if(unp.length&&!can('pos')){toast('Ada pesanan belum dibayar, minta kasir');return}
    const msg=unp.length?'Meja '+k+' dikosongkan.\n\n'+unp.length+' pesanan BELUM DIBAYAR ('+money(tot)+') akan dibatalkan dan tidak masuk penjualan. Lanjutkan?':'Pelanggan di meja '+k+' sudah pergi? Pesanan ditandai selesai dan meja jadi kosong.';
    if(!confirm(msg))return;
    let ok=true;for(const o of a){const r=await coAct(o.id,o.pst===2?'done':'cancel');if(!r)ok=false}
    oc.forEach(x=>{x.del=1;x.u=Date.now()});if(oc.length)save();
    closeModal();toast(ok?'Meja '+k+' dikosongkan':'Sebagian pesanan gagal diubah');
    try{const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}}catch(e){}
    if(S.view==='table')renderTable();
  }
  function tblOpen(k){
    const a=(CO.list||[]).filter(o=>tkey(o.tbl)===tkey(k)&&(o.status==='new'||o.status==='accepted')),tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
    const sl=o=>o.status==='new'?'Menunggu diterima':'Sedang diproses',pay=o=>o.pst===2?'Sudah bayar':'Belum bayar';
    const lc=locTbl(k);
    openModal(`<h3>Meja ${esc(k)}</h3>`+(a.length||lc.length?lc.map(x=>`<div class="tbo"><div class="tbh"><b>${x.kind==='hold'?'Pesanan ditahan':esc(x.no)}${x.cust?' · '+esc(x.cust):''}</b><span class="pst ${x.kind==='occ'?'ok':'w'}">${x.kind==='occ'?'Sudah bayar':'Belum bayar'}</span></div><small>Kasir: <b>${esc(x.by||'-')}</b> · ${tm(x.t)}</small><div class="tbt"><span>Total</span><b>${money(x.total)}</b></div>${x.kind==='hold'&&ORDELA_APP_MODE==='pos'&&can('pos')?'<button class="btn sec" onclick="closeModal();holdList()">Buka pesanan ditahan</button>':''}</div>`).join('')+a.map(o=>`<div class="tbo"><div class="tbh"><b>${esc(o.num)} · ${esc(o.name)}</b><span class="pst ${o.pst===2?'ok':'w'}">${pay(o)}</span></div>
      <small>${sl(o)} · ${tm(o.t)} · Dilayani: <b>${o.by?esc(o.by):'Pelanggan (pesan sendiri)'}</b></small>
      <div class="tbl">${o.lines.map(l=>`<div><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>`).join('')}</div>
      ${o.note?`<small>Catatan: ${esc(o.note)}</small>`:''}<div class="tbt"><span>Total</span><b>${money(o.total)}</b></div>
      <button class="btn sec" onclick="closeModal();coDet(${o.id})">Detail pesanan</button></div>`).join(''):'<p class="hint">Meja ini kosong, belum ada pesanan aktif.</p>')
    +((a.length||lc.some(x=>x.kind==='occ'))&&(can('co')||can('pos'))?(a.every(o=>o.pst===2)||can('pos')?`<button class="btn sec" onclick="tblClear('${esc(k).replace(/'/g,"\\'")}')"><i class="ic" data-ic="check"></i>Kosongkan Meja ${esc(k)}</button>`:'<p class="hint">Ada pesanan belum dibayar. Hanya kasir yang bisa mengosongkan meja ini.</p>'):'')
    +(can('co')?`<button class="btn" onclick="closeModal();noOpen('${esc(k).replace(/'/g,"\\'")}')">+ Ambil Pesanan di Meja ${esc(k)}</button>`:'')+`<button class="btn sec" onclick="closeModal()">Tutup</button>`);
  }
  Object.assign(window, {
    locTbl: locTbl,
    tblStep: tblStep,
    renderTable: renderTable,
    tblClear: tblClear,
    tblOpen: tblOpen
  });
})(window);
