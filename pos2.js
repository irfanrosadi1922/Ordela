/* Ordela: fitur operasional tambahan — Shift Kasir, Pengeluaran, Pembelian & Pemasok, Member, Promo, Layar Dapur.
   Data tersimpan di db (db.shifts, db.exps, db.buys, db.sups, db.members, db.promos) dan ikut sinkron seperti data lain. */
(function(){
'use strict';
const V={};window.P2={views:V,t:{}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const nowIso=()=>new Date().toISOString();
const live=a=>(a||[]).filter(x=>!x.del);
const myUid=()=>(CL.on&&CL.me)?String(CL.me.id):'local';
const myName=()=>(CL.on&&CL.me)?CL.me.name:'Owner';
const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
const num=v=>Math.max(0,+v||0);
const bar=(t,btn)=>`<div class="bar"><h2>${t}</h2>${btn||''}</div>`;
const kc=(t,v,cls)=>`<div class="kc"><div class="kt"><span>${t}</span></div><div class="kv"><span class="${cls||''}">${v}</span></div></div>`;
function dayStart(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
function periodRange(p){
  const n=new Date(),t0=dayStart(n);
  if(p==='today')return[t0,Infinity];
  if(p==='7d')return[t0-6*864e5,Infinity];
  if(p==='month')return[new Date(n.getFullYear(),n.getMonth(),1).getTime(),Infinity];
  return[0,Infinity];
}
const PER=[['today','Hari ini'],['7d','7 hari'],['month','Bulan ini'],['all','Semua']];
const perChips=(cur,fn)=>`<div class="chips" style="margin:0 0 10px">${PER.map(([k,l])=>`<button class="chip ${cur===k?'on':''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;
const inR=(t,r)=>{const x=+new Date(t);return x>=r[0]&&x<r[1]};

/* ================= SHIFT KASIR ================= */
window.shiftCur=function(){return live(db.shifts).find(s=>!s.close&&s.uid===myUid())||null};
function shiftStats(sh){
  const os=db.orders.filter(o=>o.sh===sh.id);
  let cashIn=0,tips=0,disc=0,total=0;const by={};
  os.forEach(o=>{
    const c=(o.cashIn!=null)?+o.cashIn:(o.method==='Tunai'?+o.total:0);cashIn+=c;tips+=+o.tip||0;disc+=+o.disc||0;total+=+o.total||0;
    if(Array.isArray(o.pays))o.pays.forEach(p=>{by[p.m]=(by[p.m]||0)+p.amt});else{const m=o.method||'-';by[m]=(by[m]||0)+(+o.total||0)+(+o.tip||0)}
  });
  const ex=live(db.exps).filter(e=>e.sh===sh.id&&e.src==='kas'),out=ex.filter(e=>e.dir!=='in').reduce((a,e)=>a+e.amt,0),inn=ex.filter(e=>e.dir==='in').reduce((a,e)=>a+e.amt,0);
  const bp=live(db.buys).reduce((a,b)=>a+((b.pays||[]).filter(p=>p.sh===sh.id&&p.src==='kas').reduce((x,p)=>x+p.amt,0)),0);
  const expected=rnd((+sh.open.cash||0)+cashIn+inn-out-bp);
  return{n:os.length,total:rnd(total),cashIn:rnd(cashIn),tips:rnd(tips),disc:rnd(disc),by,out:rnd(out),inn:rnd(inn),bp:rnd(bp),expected};
}
V.shift=function(){
  const el=$('#v-shift');if(!el)return;
  const cur=shiftCur(),own=isOwner();
  const hist=live(db.shifts).filter(s=>s.close&&(own||s.uid===myUid())).sort((a,b)=>b.open.t<a.open.t?-1:1).slice(0,40);
  let top;
  if(cur){const st=shiftStats(cur);
    top=`<div class="panel"><h3>Shift berjalan</h3><p class="hint" style="margin:0 0 8px">Dibuka ${esc(dstr(cur.open.t))} oleh ${esc(cur.by)} · modal awal ${money(cur.open.cash)}</p>
    <div class="kp">${kc('Transaksi',st.n)}${kc('Penjualan',money(st.total))}${kc('Tunai masuk',money(st.cashIn))}${kc('Kas diharapkan',money(st.expected))}</div>
    <div class="acts" style="flex-wrap:wrap;margin-top:10px"><button class="btn sm" onclick="shiftCloseForm()">Tutup Shift</button><button class="btn sm sec" onclick="cashMoveForm('out')">Kas keluar</button><button class="btn sm sec" onclick="cashMoveForm('in')">Kas masuk</button></div></div>`;
  }else{
    top=`<div class="panel"><h3>Belum ada shift berjalan</h3><p class="hint" style="margin:0 0 10px">Buka shift dengan modal awal laci. Saat tutup shift, uang fisik dihitung dan selisihnya dicatat.</p><button class="btn" onclick="shiftOpenForm()">Buka Shift</button></div>`;
  }
  el.innerHTML=bar('<i class="ic" data-ic="clock"></i>Shift Kasir')+top
   +(own?`<div class="panel" style="margin-top:12px"><label class="tgl"><input type="checkbox" ${db.set.shiftReq?'checked':''} onchange="db.set.shiftReq=this.checked;save()"><span>Wajib buka shift sebelum transaksi<small>Kasir tidak bisa membayar bila belum membuka shift.</small></span></label></div>`:'')
   +`<div class="panel" style="margin-top:12px"><h3>Riwayat Shift</h3>${hist.length?hist.map(s=>{const d=s.close.diff;return`<button class="li" onclick="shiftDetail('${s.id}')"><span class="l"><b>${esc(s.by)} · ${esc(dstr(s.open.t))}</b><small>${s.close.n||0} transaksi · penjualan ${money(s.close.total||0)}</small></span><span class="r"><b class="${d===0?'':(d<0?'neg':'pos')}">${d===0?'Pas':(d>0?'+':'−')+money(Math.abs(d))}</b><small>${d===0?'':(d<0?'kurang':'lebih')}</small></span></button>`}).join(''):'<p class="hint">Belum ada shift yang ditutup.</p>'}</div>`;
};
window.shiftOpenForm=function(){
  if(shiftCur()){toast('Shift sudah berjalan');return}
  openModal(`<h3>Buka Shift</h3><label class="fl">Modal awal di laci</label><input class="fi" id="shCash" type="number" min="0" step="any" value="0" inputmode="decimal">
  <button class="btn" onclick="shiftOpen()">Mulai Shift</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.shiftOpen=function(){
  if(shiftCur())return;const c=num($('#shCash').value);
  db.shifts.unshift({id:'s'+uid(),uid:myUid(),by:myName(),open:{t:nowIso(),cash:c},close:null,u:Date.now()});
  save();closeModal();toast('Shift dibuka');go('shift');
};
window.shiftCloseForm=function(){
  const cur=shiftCur();if(!cur)return;const st=shiftStats(cur);
  openModal(`<h3>Tutup Shift</h3><table class="dl"><tr><td>Modal awal</td><td>${money(cur.open.cash)}</td></tr><tr><td>Penjualan tunai</td><td>${money(st.cashIn)}</td></tr>
  ${st.inn?`<tr><td>Kas masuk</td><td>${money(st.inn)}</td></tr>`:''}${st.out||st.bp?`<tr><td>Kas keluar</td><td>−${money(st.out+st.bp)}</td></tr>`:''}<tr class="tt"><td>Seharusnya di laci</td><td>${money(st.expected)}</td></tr></table>
  <table class="dl">${Object.keys(st.by).map(m=>`<tr><td>${esc(m)}</td><td>${money(st.by[m])}</td></tr>`).join('')}${st.tips?`<tr><td>Tip (di luar penjualan)</td><td>${money(st.tips)}</td></tr>`:''}</table>
  <label class="fl">Uang di laci (hasil hitung)</label><input class="fi" id="shCount" type="number" min="0" step="any" inputmode="decimal" oninput="shiftDiff()">
  <div class="chg" id="shDiff"><span>Selisih</span><span>—</span></div>
  <label class="fl">Catatan</label><input class="fi" id="shNote" maxlength="200" placeholder="Opsional">
  <button class="btn" onclick="shiftClose()">Tutup Shift</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.shiftDiff=function(){
  const cur=shiftCur();if(!cur)return;const st=shiftStats(cur),v=$('#shCount').value;if(v===''){$('#shDiff').innerHTML='<span>Selisih</span><span>—</span>';return}
  const d=rnd(num(v)-st.expected);$('#shDiff').classList.toggle('neg',d<0);
  $('#shDiff').innerHTML=`<span>${d===0?'Pas':d<0?'Kurang':'Lebih'}</span><span>${money(Math.abs(d))}</span>`;
};
window.shiftClose=function(){
  const cur=shiftCur();if(!cur)return;const v=$('#shCount').value;if(v===''){toast('Isi uang di laci');return}
  const st=shiftStats(cur),cnt=num(v);
  cur.close={t:nowIso(),cash:cnt,exp:st.expected,diff:rnd(cnt-st.expected),n:st.n,total:st.total,cashIn:st.cashIn,tips:st.tips,by:st.by,note:($('#shNote').value||'').trim()};
  cur.u=Date.now();save();closeModal();toast('Shift ditutup');go('shift');
};
window.shiftDetail=function(id){
  const s=db.shifts.find(x=>x.id===id);if(!s||!s.close)return;const c=s.close;
  openModal(`<h3>Shift ${esc(s.by)}</h3><table class="dl"><tr><td>Buka</td><td>${esc(dstr(s.open.t))}</td></tr><tr><td>Tutup</td><td>${esc(dstr(c.t))}</td></tr><tr><td>Modal awal</td><td>${money(s.open.cash)}</td></tr>
  <tr><td>Transaksi</td><td>${c.n||0}</td></tr><tr><td>Penjualan</td><td>${money(c.total||0)}</td></tr><tr><td>Tunai masuk</td><td>${money(c.cashIn||0)}</td></tr><tr><td>Seharusnya di laci</td><td>${money(c.exp)}</td></tr><tr><td>Hasil hitung</td><td>${money(c.cash)}</td></tr>
  <tr class="tt"><td>Selisih</td><td>${c.diff===0?'Pas':(c.diff>0?'+':'−')+money(Math.abs(c.diff))}</td></tr></table>${c.note?`<div class="nt">${esc(c.note)}</div>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
window.cashMoveForm=function(dir){
  const cur=shiftCur();if(!cur){toast('Buka shift dulu');return}
  openModal(`<h3>Kas ${dir==='in'?'Masuk':'Keluar'}</h3><label class="fl">Jumlah</label><input class="fi" id="cmAmt" type="number" min="0" step="any" inputmode="decimal"><label class="fl">Keterangan</label><input class="fi" id="cmNote" maxlength="80" placeholder="${dir==='in'?'Mis. tambah uang kembalian':'Mis. beli es batu'}">
  <button class="btn" onclick="cashMove('${dir}')">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.cashMove=function(dir){
  const cur=shiftCur();if(!cur)return;const a=num($('#cmAmt').value);if(!a){toast('Isi jumlah');return}
  db.exps.unshift({id:'e'+uid(),t:nowIso(),by:myName(),cat:dir==='in'?'Kas masuk':'Kas keluar',amt:a,note:($('#cmNote').value||'').trim(),src:'kas',dir,sh:cur.id,u:Date.now()});
  save();closeModal();toast('Tersimpan');V.shift();
};

/* ================= LAYAR DAPUR ================= */
const KS={0:'Baru',1:'Dimasak',2:'Siap'};
const KF={s:''};
P2.kdsStn=s=>{KF.s=s;V.kds()};
V.kds=function(){
  const el=$('#v-kds');if(!el)return;
  const on=(typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>o.status==='new'||o.status==='accepted').map(o=>({src:'co',id:o.id,k:o.kds||0,t:o.t,title:o.tbl?'Meja '+o.tbl:o.num,sub:o.name,lines:o.lines,note:o.note,from:o.by?'Server: '+o.by:'Pesanan pelanggan'}));
  const lo=live(db.kds).filter(k=>(k.st||0)<3).map(k=>({src:'loc',id:k.id,k:k.st||0,t:k.t,title:k.tbl?'Meja '+k.tbl:k.no,sub:k.cust||'',lines:k.lines,note:k.note,from:'Kasir'}));
  const act=on.concat(lo).sort((a,b)=>a.t<b.t?-1:1);
  const sts=[...new Set(act.flatMap(o=>o.lines.map(l=>(find(l.id)||{}).stn||'')).filter(Boolean))];
  if(KF.s&&!sts.includes(KF.s))KF.s='';
  const stOf=l=>(find(l.id)||{}).stn||'';
  const act2=KF.s?act.map(o=>({...o,lines:o.lines.filter(l=>stOf(l)===KF.s)})).filter(o=>o.lines.length):act;
  const col=k=>act2.filter(o=>o.k===k);
  const q=o=>`'${o.src}','${String(o.id).replace(/'/g,"")}'`;
  const card=o=>{const mins=Math.max(0,Math.floor((Date.now()-new Date(o.t))/60000));return`<div class="kdc ${mins>=15?'late':mins>=8?'warn':''}"><div class="kdh"><b>${esc(o.title)}</b><span>${esc(o.sub)}</span><small>${mins} mnt</small></div>
    <ul>${o.lines.map(l=>`<li><b>${l.qty}×</b> ${esc(l.name)}</li>`).join('')}</ul>${o.note?`<div class="nt">${esc(o.note)}</div>`:''}<small class="hint">${esc(o.from)}</small>
    <div class="acts" style="margin-top:8px">${o.k===0?`<button class="btn sm" onclick="kdsSet(${q(o)},1)">Mulai masak</button>`:''}${o.k===1?`<button class="btn sm" onclick="kdsSet(${q(o)},2)">Siap saji</button>`:''}${o.k===2?`<button class="btn sm sec" onclick="kdsSet(${q(o)},0)">Batal siap</button>${o.src==='loc'?`<button class="btn sm" onclick="kdsSet(${q(o)},3)">Selesai</button>`:''}`:''}</div></div>`};
  const own=isOwner();
  el.innerHTML=bar('<i class="ic" data-ic="cook"></i>Layar Dapur')+(own?`<div class="panel" style="margin-bottom:10px"><label class="tgl"><input type="checkbox" ${db.set.kdsOn?'checked':''} onchange="db.set.kdsOn=this.checked;save()"><span>Kirim pesanan kasir ke dapur<small>Setiap transaksi di kasir otomatis muncul di layar ini.</small></span></label><label class="tgl"><input type="checkbox" ${db.set.stSplit?'checked':''} onchange="db.set.stSplit=this.checked;save()"><span>Cetak tiket terpisah per stasiun<small>Item Dapur dan Bar dicetak di slip berbeda (atur stasiun di data menu).</small></span></label></div>`:'')+(sts.length?`<div class="itabs"><button class="${KF.s===''?'on':''}" onclick="P2.kdsStn('')">Semua</button>${sts.map(s=>`<button class="${KF.s===s?'on':''}" onclick="P2.kdsStn('${esc(s).replace(/'/g,"")}')">${esc(s)}</button>`).join('')}</div>`:'')+`<div class="kdg">${[0,1,2].map(k=>`<div class="kdcol"><h3>${KS[k]} <b>${col(k).length}</b></h3>${col(k).map(card).join('')||'<p class="hint">Kosong</p>'}</div>`).join('')}</div>`;
};

/* ================= RIWAYAT PESANAN ================= */
const RW={r:'today',q:'',n:30};
V.riw=function(){
  const el=$('#v-riw');if(!el)return;const H=can('hist');if(!H)RW.r='today';
  const now=Date.now(),days={today:0,'7':6,'30':29,all:9999},from=RW.r==='all'?'':dkey(now-days[RW.r]*864e5);
  const q=RW.q.trim().toLowerCase();
  const rows=db.orders.filter(x=>(!from||dkey(x.t)>=from)&&(!q||[x.no,x.cust,x.tbl,x.type,x.cashier,x.method].some(v=>String(v||'').toLowerCase().includes(q))));
  const tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  let h='',cur='';const show=rows.slice(0,RW.n);
  for(const x of show){const k=dkey(x.t);
    if(k!==cur){cur=k;const g=rows.filter(z=>dkey(z.t)===k);h+=`<div class="dhd"><b>${new Date(x.t).toLocaleDateString(dloc(),{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</b> · ${g.length} Transaksi · <b>${money(g.reduce((a,b)=>a+(+b.total||0),0))}</b></div>`}
    h+=`<button class="li" data-no="${esc(x.no)}" onclick="histOpen(this.dataset.no)"><span class="l"><b>${esc(x.no)}${x.cust?' · '+esc(x.cust):''}</b><small>${tm(x.t)} · ${esc(x.type)}${x.tbl?' · Meja '+esc(x.tbl):''}${x.cashier?' · '+esc(x.cashier):''}</small></span><span class="r"><b>${money(x.total)}</b><small>${esc(x.method||'')}</small></span></button>`}
  const chip=(k,l)=>`<button class="tag ${RW.r===k?'pos':''}" type="button" onclick="P2.riwSet('${k}')">${l}</button>`;
  el.innerHTML=bar('<i class="ic" data-ic="receipt"></i>Riwayat Pesanan')+`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${chip('today','Hari ini')}${H?chip('7','7 hari')+chip('30','30 hari')+chip('all','Semua'):''}</div>
  <input class="fi" id="riwQ" type="search" placeholder="Cari no. struk, nama, meja…" value="${esc(RW.q)}" oninput="P2.riwQ(this.value)" autocomplete="off">
  <div class="panel hp" style="margin-top:8px"><div class="ph"><h3>Transaksi</h3><small class="pl">${rows.length} transaksi · ${money(rows.reduce((a,b)=>a+(+b.total||0),0))}</small></div><div class="lst">${h||'<div style="color:var(--mu);padding:6px 4px">'+(db.orders.length?'Tidak ada transaksi.':'Belum ada transaksi.')+'</div>'}</div>
  ${rows.length>RW.n?'<button class="btn sec morebtn" onclick="P2.riwMore()">Tampilkan lebih banyak</button>':''}</div>`;
};
P2.riwSet=function(r){RW.r=r;RW.n=30;V.riw()};
P2.riwMore=function(){RW.n+=30;V.riw()};
let riwT=0;P2.riwQ=function(v){RW.q=v;RW.n=30;clearTimeout(riwT);riwT=setTimeout(()=>{V.riw();const e=$('#riwQ');if(e){e.focus();e.setSelectionRange(v.length,v.length)}},180)};

/* ================= PISAH TAGIHAN PER ITEM ================= */
const SP={sel:{}};
P2.splitForm=function(){
  SP.sel={};for(const k in S.cart)SP.sel[k]=S.cart[k];
  const rows=Object.keys(S.cart).filter(k=>find(bid(k))).map(k=>{const i=find(bid(k)),sx=lineSfx(k);
    return`<div class="chg"><span>${esc(i.name)}${sx?' <small>('+esc(sx)+')</small>':''}<br><small>${money(linePrice(k))} · ada ${S.cart[k]}</small></span><span class="qs"><button type="button" onclick="P2.spQ('${k.replace(/'/g,"\\'")}',-1)">−</button><b id="sp_${btoa(unescape(encodeURIComponent(k))).replace(/=/g,'')}">${S.cart[k]}</b><button type="button" onclick="P2.spQ('${k.replace(/'/g,"\\'")}',1)">+</button></span></div>`}).join('');
  openModal(`<h3>Pisah Tagihan</h3><p class="hint" style="margin:0 0 8px">Atur jumlah item yang dibayar sekarang. Sisanya tetap di keranjang untuk dibayar berikutnya.</p>${rows}<div class="chg"><span><b>Dibayar sekarang</b></span><b id="spT">${money(spTotal())}</b></div>
  <button class="btn" onclick="P2.spGo()">Bayar yang dipilih</button><button class="btn sec" onclick="payForm()">Kembali</button>`);
};
function spTotal(){let t=0;for(const k in SP.sel)t+=linePrice(k)*SP.sel[k];return rnd(t)}
P2.spQ=function(k,d){
  const n=Math.max(0,Math.min(S.cart[k],(SP.sel[k]||0)+d));SP.sel[k]=n;
  const e=document.getElementById('sp_'+btoa(unescape(encodeURIComponent(k))).replace(/=/g,''));if(e)e.textContent=n;$('#spT').textContent=money(spTotal());
};
P2.spGo=function(){
  const pay={},payM={},rest={},restM={};
  for(const k in S.cart){const a=SP.sel[k]||0,b=S.cart[k]-a;
    if(a>0){pay[k]=a;if(S.cm[k])payM[k]=S.cm[k]}
    if(b>0){rest[k]=b;if(S.cm[k])restM[k]=JSON.parse(JSON.stringify(S.cm[k]))}}
  if(!Object.keys(pay).length){toast('Pilih minimal satu item');return}
  if(Object.keys(rest).length){if(S.rest){for(const k in rest){S.rest.cart[k]=(S.rest.cart[k]||0)+rest[k];if(restM[k]&&!S.rest.cm[k])S.rest.cm[k]=restM[k]}}else S.rest={cart:rest,cm:restM,meta:S.holdMeta||null}}
  S.cart=pay;S.cm=payM;renderInvoice();renderGrid();payForm();
};
window.addEventListener('load',()=>{const cm0=window.closeModal;window.closeModal=function(){
  if(S.rest){for(const k in S.rest.cart){S.cart[k]=(S.cart[k]||0)+S.rest.cart[k];if(S.rest.cm[k]&&!S.cm[k])S.cm[k]=S.rest.cm[k]}S.rest=null;try{renderGrid();renderInvoice();renderCats()}catch(e){}toast('Pisah tagihan dibatalkan')}
  return cm0.apply(this,arguments)}});


/* ================= SCANNER BARCODE (kamera / alat) ================= */
let H5=null;
function loadH5(){return H5||(H5=new Promise((res,rej)=>{if(window.Html5Qrcode)return res();const sc=document.createElement('script');sc.src='html5-qrcode.min.js';sc.onload=()=>res();sc.onerror=()=>{H5=null;rej()};document.head.appendChild(sc)}))}
P2.scan=async function(onCode,o){
  o=o||{};let stop=()=>{},on=true,last='',lastT=0;
  const done=c=>{const now=Date.now();if(c===last&&now-lastT<1800)return;last=c;lastT=now;const r=onCode(c);if(o.once||(o.keep&&r))stop()};
  openModal('<h3>Scan Barcode</h3><div id="scBox"></div><p class="hint" style="margin:8px 0">Arahkan kamera ke barcode. Alat scanner (USB/Bluetooth) cukup dipakai di kolom cari.</p><button class="btn sec" id="scX">Tutup</button>');
  stop=()=>{if(!on)return;on=false;try{if(window.__scQ){const q=window.__scQ;window.__scQ=null;q.stop().then(()=>q.clear()).catch(()=>{})}}catch(e){}closeModal()};
  $('#scX').onclick=stop;
  try{await loadH5();
    const q=new Html5Qrcode('scBox',{verbose:false,useBarCodeDetectorIfSupported:true});window.__scQ=q;
    await q.start({facingMode:'environment'},{fps:10,qrbox:(w,h)=>({width:Math.floor(Math.min(w,320)*.9),height:Math.floor(Math.min(h,240)*.6)})},t=>{if(on)done(String(t).trim())},()=>{});
  }catch(e){stop();toast('Kamera tidak bisa dibuka. Izinkan akses kamera, atau pakai alat scanner / ketik kodenya.')}
};

P2.giftUse=function(){
  const code=($('#pGift').value||'').trim().toUpperCase(),e=$('#pGiftR');if(!code)return;
  const g=live(db.gifts).find(x=>String(x.code).toUpperCase()===code);
  if(!g){e.textContent='Kartu tidak ditemukan';return}
  if(!(+g.bal>0)){e.textContent='Saldo kartu habis';return}
  S.pay.gift=g.id;const pp=$('#pPaid');if(pp&&S.pay.m==='Tunai')pp.value=payTotals().payable;
  e.innerHTML='Saldo '+money(g.bal)+' · <a href="#" onclick="P2.giftClear();return false">lepas</a>';payRefresh();
};
P2.giftClear=function(){S.pay.gift=null;$('#pGiftR').textContent='';$('#pGift').value='';const pp=$('#pPaid');if(pp&&S.pay.m==='Tunai')pp.value=payTotals().payable;payRefresh()};
/* ================= RESERVASI MEJA ================= */
const RS={};
const rsAct=()=>live(db.rsv).filter(r=>r.st==='res');
P2.rsvFor=function(k){const now=Date.now();return rsAct().filter(r=>tkey(r.tbl)===tkey(k)&&new Date(r.t).getTime()<now+3*36e5&&new Date(r.t).getTime()>now-45*6e4)};
const tkey=t=>String(t==null?'':t).trim().toUpperCase();

/* ================= LAYAR PELANGGAN (layar kedua) ================= */
const CDCH=('BroadcastChannel' in window)?new BroadcastChannel('ordela-cd'):null;
P2.cdPush=function(){
  if(!CDCH||window.__isCD)return;
  try{const lines=Object.keys(S.cart).filter(k=>find(bid(k))).map(k=>{const i=find(bid(k)),sx=lineSfx(k);return{n:i.name+(sx?' ('+sx+')':''),q:S.cart[k],p:linePrice(k)*S.cart[k],e:i.emoji||''}});
    const c=calc();CDCH.postMessage({lines,sub:c.sub,disc:c.disc,tax:c.tax,total:c.total,store:db.set.store||'Ordela',cur:{cur:db.set.cur,dec:db.set.dec,loc:db.set.loc,pos:db.set.curPos},qris:(db.set.pay&&db.set.pay.on&&db.set.pay.qris)||''})}catch(e){}
};
P2.cdOpen=function(){const w=window.open(location.pathname+'#cd','ordela-cd','width=900,height=700');if(!w)toast('Izinkan pop-up untuk membuka layar pelanggan');else setTimeout(P2.cdPush,800)};
if(location.hash==='#cd'){
  window.__isCD=true;
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.innerHTML='<div id="cdv" style="min-height:100vh;display:flex;flex-direction:column;font-family:Poppins,system-ui,sans-serif;background:#111;color:#fff;padding:28px"><h1 id="cdS" style="margin:0 0 18px;font-size:28px">Ordela</h1><div id="cdL" style="flex:1"></div><div id="cdT" style="border-top:2px solid #444;padding-top:16px"></div></div>';
    const fm=(v,c)=>{const d=+c.dec||0,n=(+v||0).toLocaleString(c.loc||'id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});return c.pos==='after'?n+' '+(c.cur||''):(c.cur||'Rp')+' '+n};
    const draw=m=>{const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
      document.getElementById('cdS').textContent=m.store;
      document.getElementById('cdL').innerHTML=m.lines.length?m.lines.map(l=>`<div style="display:flex;gap:14px;font-size:24px;padding:8px 0;border-bottom:1px solid #2a2a2a"><span>${e(l.e)}</span><span style="flex:1">${l.q}× ${e(l.n)}</span><b>${fm(l.p,m.cur)}</b></div>`).join(''):'<p style="font-size:28px;opacity:.6;margin-top:40px">Selamat datang! Silakan pilih menu.</p>';
      document.getElementById('cdT').innerHTML=m.lines.length?`${m.disc?`<div style="display:flex;justify-content:space-between;font-size:20px;opacity:.8"><span>Diskon</span><span>−${fm(m.disc,m.cur)}</span></div>`:''}${m.tax?`<div style="display:flex;justify-content:space-between;font-size:20px;opacity:.8"><span>Pajak</span><span>${fm(m.tax,m.cur)}</span></div>`:''}<div style="display:flex;justify-content:space-between;font-size:40px;font-weight:800;margin-top:8px"><span>Total</span><span>${fm(m.total,m.cur)}</span></div>`:''};
    draw({store:'Ordela',lines:[],cur:{}});
    if(CDCH)CDCH.onmessage=ev=>draw(ev.data);
    document.title='Layar Pelanggan';
  });
}

/* ================= MENU UTAMA ================= */
V.menu=function(){
  const el=$('#v-menu');if(!el)return;
  const h=new Date().getHours(),g=h>=4&&h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  const nm=(CL.on&&CL.me&&CL.me.name)||'Owner';
  const G=[['Operasional',[['pos','Kasir','receipt','#ef4444'],['table','Meja','grid','#f59e0b'],['riw','Riwayat Pesanan','list','#8b5cf6'],['ai','Asisten','bolt','#7c3aed'],['co','Pesanan Online','cart','#0ea5e9'],['kds','Layar Dapur','cook','#f97316'],['rsv','Reservasi','cal','#0ea5e9'],['gift','Kartu Hadiah','gift','#f43f5e'],['cd','Layar Pelanggan','dash','#0891b2'],['shift','Shift Kasir','clock','#8b5cf6'],['alert','Notifikasi','bell','#ec4899']]],
   ['Penjualan & Pelanggan',[['home','Beranda & Laporan','dash','#10b981'],['mem','Member','users','#14b8a6'],['promo','Promo','bolt','#eab308'],['exp','Pengeluaran','card','#64748b']]],
   ['Produk & Stok',[['inv','Inventori','box','#3b82f6'],['opname','Stok Opname','check','#0d9488'],['buy','Pembelian','download','#6366f1']]],
   ['Tim & Toko',[['att','Absensi','clock','#06b6d4'],['usr','Pengguna','users','#a855f7'],['pyr','Payroll','card','#22c55e'],['branch','Cabang','bank','#d946ef'],['integ','Integrasi','plug','#0ea5e9'],['prn','Printer','print','#475569'],['set','Pengaturan','sliders','#6b7280'],['acc','Akun Saya','key','#111827']]]];
  const nb=(typeof CO!=='undefined'&&CO.list)?CO.list.filter(o=>o.status==='new').length:0;
  const tile=([v,t,ic,c])=>{const act=v==='branch'?'P2.branch()':v==='cd'?'P2.cdOpen()':`go('${v}')`;
    return`<button class="mgi" onclick="${act}"><span class="mic" style="--g:${c};--g1:color-mix(in srgb,${c} 70%,#fff)"><i class="ic" data-ic="${ic}"></i>${v==='co'&&nb?`<b class="mb">${nb}</b>`:''}</span><span class="t">${esc(t)}</span></button>`};
  const secs=G.map(([t,l])=>{const x=l.filter(([v])=>v==='acc'||canView(v));return x.length?`<div class="mgc"><div class="mgh">${t}</div><div class="mgrid">${x.map(tile).join('')}</div></div>`:''}).join('');
  let st='';
  if(canView('home')){const t0=dayStart(Date.now()),os=(db.orders||[]).filter(o=>new Date(o.t).getTime()>=t0);
    st=`<div class="mst"><div><b>${money(os.reduce((a,o)=>a+(+o.total||0),0))}</b><span>Penjualan hari ini</span></div><div><b>${os.length}</b><span>Transaksi</span></div></div>`}
  el.innerHTML=`<div class="mhero"><small>${g},</small><h2>${esc(nm)}</h2><p>${esc(db.set.store||'Ordela')} · ${new Date().toLocaleDateString(dloc(),{weekday:'long',day:'numeric',month:'long'})}</p>${st}</div>${secs}`;
};
P2.t={get shiftStats(){return shiftStats}};
window.kdsSet=async function(src,id,st){
  if(src==='loc'){const k=db.kds.find(x=>x.id===id);if(k){k.st=st;k.u=Date.now();save()}V.kds();return}
  try{const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action:st===1?'cook':st===2?'ready':'unready'})});if(!r.ok)throw 0;
    const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}if(S.view==='kds')V.kds()}catch(e){toast('Gagal mengubah status')}
};
setInterval(()=>{if(!document.hidden&&S.view==='kds')V.kds()},20000);
})();
