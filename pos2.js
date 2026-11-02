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

/* ================= PENGELUARAN & LABA ================= */
const EXP_CATS=['Belanja bahan','Gaji','Sewa','Listrik/Air/Gas','Transport','Perawatan','Marketing','Lainnya'];
const EP={per:'month'};
window.expPer=function(p){EP.per=p;V.exp()};
function profit(r){
  let rev=0,cogs=0,n=0;db.orders.forEach(o=>{if(!inR(o.t,r))return;n++;rev+=+o.total||0;(o.lines||[]).forEach(l=>{cogs+=(+l.cost||0)*(+l.qty||0)})});
  const exs=live(db.exps).filter(e=>inR(e.t,r)&&e.dir!=='in'&&e.cat!=='Kas keluar');
  const opex=exs.reduce((a,e)=>a+e.amt,0);
  return{rev:rnd(rev),cogs:rnd(cogs),opex:rnd(opex),gross:rnd(rev-cogs),net:rnd(rev-cogs-opex),n};
}
V.exp=function(){
  const el=$('#v-exp');if(!el)return;const r=periodRange(EP.per),p=profit(r),own=isOwner();
  const list=live(db.exps).filter(e=>inR(e.t,r)&&e.dir!=='in').sort((a,b)=>b.t<a.t?-1:1);
  el.innerHTML=bar('<i class="ic" data-ic="card"></i>Pengeluaran &amp; Laba','<button class="btn sm" style="width:auto;margin:0" onclick="expForm()">+ Catat Pengeluaran</button>')+perChips(EP.per,'expPer')
  +`<div class="kp">${kc('Pendapatan',money(p.rev))}${kc('Modal barang (HPP)','−'+money(p.cogs))}${kc('Pengeluaran','−'+money(p.opex))}${kc('Laba bersih',money(p.net),p.net<0?'neg':'pos')}</div>
  <p class="hint" style="margin:6px 2px 12px">Laba bersih = pendapatan − modal barang terjual − pengeluaran operasional. Pembelian stok tidak dihitung sebagai pengeluaran karena modalnya sudah masuk ke modal barang.</p>
  <div class="panel"><h3>Daftar Pengeluaran</h3>${list.length?list.map(e=>`<div class="li" style="cursor:default"><span class="l"><b>${esc(e.cat)}${e.note?' · '+esc(e.note):''}</b><small>${esc(dstr(e.t))} · ${esc(e.by||'')}${e.src==='kas'?' · dari kas laci':''}</small></span><span class="r"><b>${money(e.amt)}</b>${own?`<small><a href="#" onclick="expDel('${e.id}');return false" style="color:var(--bad)">hapus</a></small>`:''}</span></div>`).join(''):'<p class="hint">Belum ada pengeluaran pada periode ini.</p>'}</div>`;
};
window.expForm=function(){
  const cur=shiftCur();
  openModal(`<h3>Catat Pengeluaran</h3><label class="fl">Kategori</label><select class="fi" id="exCat">${EXP_CATS.map(c=>`<option>${c}</option>`).join('')}</select>
  <label class="fl">Jumlah</label><input class="fi" id="exAmt" type="number" min="0" step="any" inputmode="decimal"><label class="fl">Keterangan</label><input class="fi" id="exNote" maxlength="80" placeholder="Opsional">
  <label class="fl">Dibayar dari</label><select class="fi" id="exSrc"><option value="lain">Transfer / sumber lain</option>${cur?'<option value="kas">Kas laci (shift berjalan)</option>':''}</select>
  <button class="btn" onclick="expSave()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.expSave=function(){
  const a=num($('#exAmt').value);if(!a){toast('Isi jumlah');return}const cur=shiftCur(),src=$('#exSrc').value;
  db.exps.unshift({id:'e'+uid(),t:nowIso(),by:myName(),cat:$('#exCat').value,amt:a,note:($('#exNote').value||'').trim(),src,sh:(src==='kas'&&cur)?cur.id:null,u:Date.now()});
  save();closeModal();toast('Pengeluaran dicatat');V.exp();
};
window.expDel=function(id){if(!isOwner())return;const e=db.exps.find(x=>x.id===id);if(!e||!confirm('Hapus pengeluaran ini?'))return;e.del=1;e.u=Date.now();save();V.exp()};

/* ================= PEMBELIAN & PEMASOK ================= */
const BP={tab:'buy',lines:[],sup:'',pay:'lunas'};
window.buyTab=function(t){BP.tab=t;V.buy()};
const debtOf=b=>Math.max(0,rnd((+b.total||0)-(b.pays||[]).reduce((a,p)=>a+p.amt,0)));
V.buy=function(){
  const el=$('#v-buy');if(!el)return;
  const sups=live(db.sups),buys=live(db.buys).sort((a,b)=>b.t<a.t?-1:1),debts=buys.filter(b=>debtOf(b)>0);
  const tabs=`<div class="itabs">${[['buy','Pembelian',buys.length],['sup','Pemasok',sups.length],['debt','Hutang',debts.length]].map(([k,l,n])=>`<button class="${BP.tab===k?'on':''}" onclick="buyTab('${k}')">${l} <b>${n}</b></button>`).join('')}</div>`;
  let body='';
  if(BP.tab==='buy')body=`<div class="panel"><h3>Riwayat Pembelian</h3>${buys.length?buys.slice(0,60).map(b=>{const d=debtOf(b);return`<button class="li" onclick="buyDetail('${b.id}')"><span class="l"><b>${esc(supName(b.sup))}</b><small>${esc(dstr(b.t))} · ${(b.lines||[]).length} item</small></span><span class="r"><b>${money(b.total)}</b><small style="color:${d?'var(--bad)':'var(--ok)'}">${d?'hutang '+money(d):'lunas'}</small></span></button>`}).join(''):'<p class="hint">Belum ada pembelian. Catat pembelian agar stok bertambah otomatis.</p>'}</div>`;
  if(BP.tab==='sup')body=`<div class="panel"><h3>Pemasok</h3>${sups.length?sups.map(s=>`<button class="li" onclick="supForm('${s.id}')"><span class="l"><b>${esc(s.name)}</b><small>${esc(s.phone||'')}${s.note?' · '+esc(s.note):''}</small></span><span class="r"><small>${(() => {const d=buys.filter(b=>b.sup===s.id).reduce((a,b)=>a+debtOf(b),0);return d?'hutang '+money(d):''})()}</small></span></button>`).join(''):'<p class="hint">Belum ada pemasok.</p>'}<button class="btn sec" onclick="supForm()">+ Tambah Pemasok</button></div>`;
  if(BP.tab==='debt')body=`<div class="panel"><h3>Hutang ke Pemasok</h3>${debts.length?debts.map(b=>`<button class="li" onclick="buyDetail('${b.id}')"><span class="l"><b>${esc(supName(b.sup))}</b><small>${esc(dstr(b.t))}</small></span><span class="r"><b style="color:var(--bad)">${money(debtOf(b))}</b><small>dari ${money(b.total)}</small></span></button>`).join('')+`<div class="tbt"><span>Total hutang</span><b>${money(debts.reduce((a,b)=>a+debtOf(b),0))}</b></div>`:'<p class="hint">Tidak ada hutang.</p>'}</div>`;
  el.innerHTML=bar('<i class="ic" data-ic="download"></i>Pembelian &amp; Pemasok','<button class="btn sm" style="width:auto;margin:0" onclick="buyForm()">+ Catat Pembelian</button>')+tabs+body;
};
const supName=id=>{const s=db.sups.find(x=>x.id===id);return s?s.name:'Tanpa pemasok'};
window.supForm=function(id){
  const s=id?db.sups.find(x=>x.id===id):{name:'',phone:'',note:''};
  openModal(`<h3>${id?'Ubah':'Tambah'} Pemasok</h3><label class="fl">Nama</label><input class="fi" id="spN" maxlength="60" value="${esc(s.name)}"><label class="fl">No. HP</label><input class="fi" id="spP" maxlength="30" value="${esc(s.phone||'')}" inputmode="tel"><label class="fl">Catatan</label><input class="fi" id="spC" maxlength="120" value="${esc(s.note||'')}">
  <button class="btn" onclick="supSave('${id||''}')">Simpan</button>${id?`<button class="btn sec" onclick="supDel('${id}')">Hapus</button>`:''}<button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.supSave=function(id){
  const n=($('#spN').value||'').trim();if(!n){toast('Nama wajib diisi');return}
  if(id){const s=db.sups.find(x=>x.id===id);Object.assign(s,{name:n,phone:$('#spP').value.trim(),note:$('#spC').value.trim(),u:Date.now()})}
  else db.sups.unshift({id:'p'+uid(),name:n,phone:$('#spP').value.trim(),note:$('#spC').value.trim(),u:Date.now()});
  save();closeModal();V.buy();if($('#bySup'))buySupOpts();
};
window.supDel=function(id){const s=db.sups.find(x=>x.id===id);if(!s||!confirm('Hapus pemasok ini?'))return;s.del=1;s.u=Date.now();save();closeModal();V.buy()};
function buyItems(){return db.items.filter(i=>!isB(i))}
window.buyForm=function(){
  BP.lines=[{id:'',q:1,c:0}];BP.pay='lunas';
  openModal(`<h3>Catat Pembelian</h3><label class="fl">Pemasok</label><div class="spr"><select class="fi" id="bySup"></select><button type="button" class="mini" onclick="supForm()">+ Baru</button></div>
  <label class="fl">Barang dibeli</label><div id="byRows"></div><button type="button" class="mini" onclick="BP_add()">+ Tambah barang</button>
  <div class="tbt"><span>Total</span><b id="byTot"></b></div>
  <label class="fl">Pembayaran</label><select class="fi" id="byPay" onchange="BP.pay=this.value;byPayUI()"><option value="lunas">Lunas (transfer / sumber lain)</option><option value="kas">Lunas dari kas laci</option><option value="hutang">Hutang (bayar nanti)</option><option value="dp">Bayar sebagian</option></select>
  <div id="byDpW" hidden><label class="fl">Dibayar sekarang</label><input class="fi" id="byDp" type="number" min="0" step="any"></div>
  <label class="fl">Catatan</label><input class="fi" id="byNote" maxlength="120" placeholder="Opsional">
  <button class="btn" onclick="buySave()">Simpan Pembelian</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  buySupOpts();BP_render();
};
function buySupOpts(){const e=$('#bySup');if(!e)return;const cur=e.value;e.innerHTML='<option value="">Tanpa pemasok</option>'+live(db.sups).map(s=>`<option value="${s.id}" ${s.id===cur?'selected':''}>${esc(s.name)}</option>`).join('')}
window.byPayUI=function(){$('#byDpW').hidden=BP.pay!=='dp'};
window.BP_add=function(){BP.lines.push({id:'',q:1,c:0});BP_render()};
window.BP_del=function(i){BP.lines.splice(i,1);if(!BP.lines.length)BP.lines.push({id:'',q:1,c:0});BP_render()};
window.BP_set=function(i,f,v){const l=BP.lines[i];if(f==='id'){l.id=v;const it=find(v);if(it&&!l.c)l.c=it.cost||0;BP_render()}else{l[f]=num(v);BP_tot()}};
function BP_render(){
  const e=$('#byRows');if(!e)return;
  e.innerHTML=BP.lines.map((l,i)=>`<div class="bpr"><select class="fi" onchange="BP_set(${i},'id',this.value)"><option value="">Pilih barang…</option>${buyItems().map(x=>`<option value="${esc(x.id)}" ${x.id===l.id?'selected':''}>${esc(x.name)}${x.ns?' (bahan)':''}</option>`).join('')}</select>
  <input class="fi" type="number" min="0" step="1" value="${l.q}" aria-label="Jumlah" oninput="BP_set(${i},'q',this.value)"><input class="fi" type="number" min="0" step="any" value="${l.c||''}" placeholder="Harga satuan" aria-label="Harga satuan" oninput="BP_set(${i},'c',this.value)"><button type="button" class="mini" onclick="BP_del(${i})">✕</button></div>`).join('');
  BP_tot();
}
function BP_tot(){const t=rnd(BP.lines.reduce((a,l)=>a+(+l.q||0)*(+l.c||0),0));const e=$('#byTot');if(e)e.textContent=money(t);return t}
window.buySave=function(){
  const ls=BP.lines.filter(l=>l.id&&l.q>0);if(!ls.length){toast('Pilih barang yang dibeli');return}
  const total=BP_tot(),cur=shiftCur(),pay=BP.pay;let paid=0;
  if(pay==='lunas'||pay==='kas')paid=total;else if(pay==='dp')paid=Math.min(total,num($('#byDp').value));
  if(pay==='kas'&&!cur){toast('Buka shift dulu untuk membayar dari kas laci');return}
  const sup=$('#bySup').value,now=nowIso(),id='b'+uid();
  const b={id,t:now,by:myName(),sup,lines:ls.map(l=>({id:l.id,name:(find(l.id)||{}).name||'',q:Math.floor(l.q),c:l.c})),total,note:($('#byNote').value||'').trim(),pays:[],u:Date.now()};
  if(paid>0)b.pays.push({t:now,amt:paid,src:pay==='kas'?'kas':'lain',sh:pay==='kas'&&cur?cur.id:null});
  ls.forEach(l=>{const it=find(l.id);if(!it)return;const q=Math.floor(l.q);it.stock=(+it.stock||0)+q;logAdd(it.name,q,'Pembelian '+supName(sup),it.stock,now);if(isOwner()&&l.c>0)it.cost=l.c});
  db.buys.unshift(b);db.log=db.log.slice(0,LOG_MAX);save();closeModal();toast('Pembelian dicatat, stok bertambah');V.buy();
};
window.buyDetail=function(id){
  const b=db.buys.find(x=>x.id===id);if(!b)return;const d=debtOf(b);
  openModal(`<h3>${esc(supName(b.sup))}</h3><p class="hint" style="margin:0 0 6px">${esc(dstr(b.t))} · oleh ${esc(b.by||'')}</p><table class="dl">${(b.lines||[]).map(l=>`<tr><td>${l.q}× ${esc(l.name)}<br><small>${money(l.c)}</small></td><td>${money(l.q*l.c)}</td></tr>`).join('')}<tr class="tt"><td>Total</td><td>${money(b.total)}</td></tr></table>
  ${(b.pays||[]).length?`<table class="dl">${b.pays.map(p=>`<tr><td>Bayar ${esc(dstr(p.t))}${p.src==='kas'?' (kas laci)':''}</td><td>${money(p.amt)}</td></tr>`).join('')}</table>`:''}
  ${d?`<div class="chg neg"><span>Sisa hutang</span><span>${money(d)}</span></div><label class="fl">Bayar hutang</label><input class="fi" id="dbAmt" type="number" min="0" step="any" value="${d}"><select class="fi" id="dbSrc"><option value="lain">Transfer / sumber lain</option>${shiftCur()?'<option value="kas">Kas laci</option>':''}</select><button class="btn" onclick="debtPay('${b.id}')">Bayar</button>`:'<div class="chg"><span>Lunas</span><span></span></div>'}
  ${b.note?`<div class="nt">${esc(b.note)}</div>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
window.debtPay=function(id){
  const b=db.buys.find(x=>x.id===id);if(!b)return;const a=Math.min(debtOf(b),num($('#dbAmt').value));if(!a){toast('Isi jumlah');return}
  const src=$('#dbSrc').value,cur=shiftCur();b.pays=b.pays||[];b.pays.push({t:nowIso(),amt:a,src,sh:src==='kas'&&cur?cur.id:null});b.u=Date.now();save();closeModal();toast('Pembayaran hutang dicatat');V.buy();
};

/* ================= MEMBER ================= */
const MP={q:''};
V.mem=function(){
  const el=$('#v-mem');if(!el)return;const q=MP.q.trim().toLowerCase();
  const l=live(db.members).filter(m=>!q||(m.name||'').toLowerCase().includes(q)||String(m.phone||'').includes(q)).sort((a,b)=>(b.spent||0)-(a.spent||0));
  el.innerHTML=bar('<i class="ic" data-ic="users"></i>Member','<button class="btn sm" style="width:auto;margin:0" onclick="memForm()">+ Member Baru</button>')
  +`<div class="panel"><input class="fi" placeholder="Cari nama / no. HP" value="${esc(MP.q)}" oninput="MP_q(this.value)">
  ${isOwner()?`<div class="two" style="margin-top:10px"><div><label class="fl">Belanja per 1 poin (Rp)</label><input class="fi" type="number" min="0" value="${+db.set.ptsPer||0}" onchange="db.set.ptsPer=Math.max(0,+this.value||0);save()"></div><div><label class="fl">Nilai 1 poin saat ditukar (Rp)</label><input class="fi" type="number" min="0" value="${+db.set.ptsVal||0}" onchange="db.set.ptsVal=Math.max(0,+this.value||0);save()"></div></div><small class="hint">Contoh: Rp10.000 per poin dan 1 poin = Rp100 berarti cashback 1%. Isi 0 untuk mematikan poin.</small>`:''}</div>
  <div class="panel" style="margin-top:12px"><h3>${l.length} member</h3>${l.length?l.map(m=>`<button class="li" onclick="memDetail('${m.id}')"><span class="l"><b>${esc(m.name)}</b><small>${esc(m.phone||'-')} · ${m.visits||0}× belanja</small></span><span class="r"><b>${m.pts||0} poin</b><small>${money(m.spent||0)}</small></span></button>`).join(''):'<p class="hint">Belum ada member. Daftarkan dari sini atau langsung saat pembayaran.</p>'}</div>`;
};
window.MP_q=function(v){MP.q=v;const p=document.activeElement;V.mem();const i=document.querySelector('#v-mem input.fi');if(i){i.focus();try{i.setSelectionRange(v.length,v.length)}catch(e){}}};
window.memForm=function(id){
  const m=id?db.members.find(x=>x.id===id):{name:'',phone:'',note:''};
  openModal(`<h3>${id?'Ubah':'Member Baru'}</h3><label class="fl">Nama *</label><input class="fi" id="mbN" maxlength="60" value="${esc(m.name)}"><label class="fl">No. HP</label><input class="fi" id="mbP" maxlength="30" value="${esc(m.phone||'')}" inputmode="tel"><label class="fl">Catatan</label><input class="fi" id="mbC" maxlength="120" value="${esc(m.note||'')}">
  <button class="btn" onclick="memSave('${id||''}')">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.memSave=function(id){
  const n=($('#mbN').value||'').trim();if(!n){toast('Nama wajib diisi');return}const ph=$('#mbP').value.trim();
  if(ph&&live(db.members).some(m=>m.phone===ph&&m.id!==id)){toast('No. HP sudah terdaftar');return}
  if(id){Object.assign(db.members.find(x=>x.id===id),{name:n,phone:ph,note:$('#mbC').value.trim(),u:Date.now()})}
  else db.members.unshift({id:'m'+uid(),name:n,phone:ph,note:$('#mbC').value.trim(),pts:0,visits:0,spent:0,t:nowIso(),u:Date.now()});
  save();closeModal();V.mem();
};
window.memDetail=function(id){
  const m=db.members.find(x=>x.id===id);if(!m)return;const os=db.orders.filter(o=>o.mem&&o.mem.id===id).slice(0,8);
  openModal(`<h3>${esc(m.name)}</h3><p class="hint" style="margin:0 0 6px">${esc(m.phone||'-')}${m.note?' · '+esc(m.note):''}</p>
  <div class="kp">${kc('Poin',m.pts||0)}${kc('Belanja',m.visits||0+'×')}${kc('Total belanja',money(m.spent||0))}</div>
  <h4 style="margin:12px 0 4px">Transaksi terakhir</h4>${os.length?os.map(o=>`<div class="li" style="cursor:default"><span class="l"><b>${esc(o.no)}</b><small>${esc(dstr(o.t))}</small></span><span class="r"><b>${money(o.total)}</b><small>+${o.mem.earn||0}${o.mem.used?' / −'+o.mem.used:''} poin</small></span></div>`).join(''):'<p class="hint">Belum ada.</p>'}
  <div class="acts" style="flex-wrap:wrap;margin-top:10px"><button class="btn sm" onclick="memForm('${id}')">Ubah</button>${isOwner()?`<button class="btn sm sec" onclick="memAdj('${id}')">Atur poin</button><button class="btn sm sec" onclick="memDel('${id}')">Hapus</button>`:''}<button class="btn sm sec" onclick="closeModal()">Tutup</button></div>`);
};
window.memAdj=function(id){const m=db.members.find(x=>x.id===id);const v=prompt('Poin baru untuk '+m.name+':',m.pts||0);if(v===null)return;m.pts=Math.max(0,Math.floor(+v||0));m.u=Date.now();save();closeModal();V.mem()};
window.memDel=function(id){const m=db.members.find(x=>x.id===id);if(!m||!confirm('Hapus member '+m.name+'?'))return;m.del=1;m.u=Date.now();save();closeModal();V.mem()};

/* ================= PROMO & VOUCHER (owner) ================= */
const DAYS=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
V.promo=function(){
  const el=$('#v-promo');if(!el)return;const l=live(db.promos);
  el.innerHTML=bar('<i class="ic" data-ic="bolt"></i>Promo &amp; Voucher','<button class="btn sm" style="width:auto;margin:0" onclick="promoForm()">+ Promo Baru</button>')
  +`<p class="hint" style="margin:0 2px 10px">Promo otomatis berlaku sendiri (mis. happy hour). Promo dengan kode dipakai kasir lewat kolom Kode promo. Hanya satu promo (yang paling hemat) dipakai per transaksi.</p>
  <div class="panel">${l.length?l.map(p=>{const u=promoUsed(p.id),w=[p.auto?'otomatis':'kode '+(p.code||'-'),p.type==='%'?p.val+'%':money(p.val),+p.min?'min '+money(p.min):'',p.days&&p.days.length?p.days.map(d=>DAYS[d]).join(','):'',p.h1&&p.h2?p.h1+'–'+p.h2:'',p.d1||p.d2?(p.d1||'')+' s/d '+(p.d2||''):''].filter(Boolean).join(' · ');
    return`<button class="li" onclick="promoForm('${p.id}')"><span class="l"><b>${esc(p.name)}</b><small>${esc(w)}</small></span><span class="r"><b class="${p.on===false?'neg':'pos'}">${p.on===false?'mati':'aktif'}</b><small>${u}× dipakai</small></span></button>`}).join(''):'<p class="hint">Belum ada promo.</p>'}</div>`;
};
window.promoForm=function(id){
  if(!isOwner()){toast('Hanya owner yang boleh mengatur promo');return}
  const p=id?db.promos.find(x=>x.id===id):{name:'',code:'',type:'%',val:10,min:0,cap:0,max:0,days:[],h1:'',h2:'',d1:'',d2:'',auto:false,on:true};
  window.PF={days:[...(p.days||[])]};
  openModal(`<h3>${id?'Ubah':'Promo Baru'}</h3><label class="fl">Nama promo *</label><input class="fi" id="prN" maxlength="40" value="${esc(p.name)}" placeholder="Mis. Happy Hour">
  <div class="two"><div><label class="fl">Tipe</label><select class="fi" id="prT"><option value="%" ${p.type==='%'?'selected':''}>Persen (%)</option><option value="n" ${p.type!=='%'?'selected':''}>Potongan Rp</option></select></div><div><label class="fl">Nilai</label><input class="fi" id="prV" type="number" min="0" step="any" value="${p.val}"></div></div>
  <div class="two"><div><label class="fl">Min. belanja</label><input class="fi" id="prM" type="number" min="0" value="${p.min||0}"></div><div><label class="fl">Maks. potongan (untuk %)</label><input class="fi" id="prC" type="number" min="0" value="${p.cap||0}"></div></div>
  <label class="tgl"><input type="checkbox" id="prA" ${p.auto?'checked':''} onchange="$('#prCodeW').hidden=this.checked"><span>Berlaku otomatis (tanpa kode)</span></label>
  <div id="prCodeW" ${p.auto?'hidden':''}><label class="fl">Kode voucher</label><input class="fi" id="prK" maxlength="20" value="${esc(p.code||'')}" style="text-transform:uppercase" placeholder="Mis. HEMAT10"></div>
  <label class="fl">Hari berlaku (kosong = tiap hari)</label><div class="chips" id="prD">${DAYS.map((d,i)=>`<button type="button" class="chip ${PF.days.includes(i)?'on':''}" onclick="PF_day(${i},this)">${d}</button>`).join('')}</div>
  <div class="two"><div><label class="fl">Jam mulai</label><input class="fi" id="prH1" type="time" value="${esc(p.h1||'')}"></div><div><label class="fl">Jam selesai</label><input class="fi" id="prH2" type="time" value="${esc(p.h2||'')}"></div></div>
  <div class="two"><div><label class="fl">Tanggal mulai</label><input class="fi" id="prD1" type="date" value="${esc(p.d1||'')}"></div><div><label class="fl">Tanggal selesai</label><input class="fi" id="prD2" type="date" value="${esc(p.d2||'')}"></div></div>
  <div class="two"><div><label class="fl">Batas pemakaian (0 = tak terbatas)</label><input class="fi" id="prX" type="number" min="0" value="${p.max||0}"></div><div></div></div>
  <label class="tgl"><input type="checkbox" id="prO" ${p.on===false?'':'checked'}><span>Aktif</span></label>
  <button class="btn" onclick="promoSave('${id||''}')">Simpan</button>${id?`<button class="btn sec" onclick="promoDel('${id}')">Hapus</button>`:''}<button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.PF_day=function(i,b){const k=PF.days.indexOf(i);if(k>=0)PF.days.splice(k,1);else PF.days.push(i);b.classList.toggle('on',k<0)};
window.promoSave=function(id){
  const name=($('#prN').value||'').trim();if(!name){toast('Nama promo wajib diisi');return}
  const auto=$('#prA').checked,code=($('#prK').value||'').trim().toUpperCase();
  if(!auto&&!code){toast('Isi kode voucher atau pilih otomatis');return}
  if(code&&live(db.promos).some(p=>p.id!==id&&String(p.code||'').toUpperCase()===code)){toast('Kode sudah dipakai promo lain');return}
  const v=num($('#prV').value);if(!v){toast('Isi nilai promo');return}
  const d={name,type:$('#prT').value==='%'?'%':'n',val:v,min:num($('#prM').value),cap:num($('#prC').value),auto,code:auto?'':code,days:[...PF.days].sort(),h1:$('#prH1').value,h2:$('#prH2').value,d1:$('#prD1').value,d2:$('#prD2').value,max:num($('#prX').value),on:$('#prO').checked,u:Date.now()};
  if(id)Object.assign(db.promos.find(x=>x.id===id),d);else db.promos.unshift({id:'r'+uid(),...d});
  save();closeModal();V.promo();renderInvoice();
};
window.promoDel=function(id){const p=db.promos.find(x=>x.id===id);if(!p||!confirm('Hapus promo ini?'))return;p.del=1;p.u=Date.now();save();closeModal();V.promo();renderInvoice()};

/* ================= LAYAR DAPUR ================= */
const KS={0:'Baru',1:'Dimasak',2:'Siap'};
V.kds=function(){
  const el=$('#v-kds');if(!el)return;
  const on=(typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>o.status==='new'||o.status==='accepted').map(o=>({src:'co',id:o.id,k:o.kds||0,t:o.t,title:o.tbl?'Meja '+o.tbl:o.num,sub:o.name,lines:o.lines,note:o.note,from:o.by?'Server: '+o.by:'Pesanan pelanggan'}));
  const lo=live(db.kds).filter(k=>(k.st||0)<3).map(k=>({src:'loc',id:k.id,k:k.st||0,t:k.t,title:k.tbl?'Meja '+k.tbl:k.no,sub:k.cust||'',lines:k.lines,note:k.note,from:'Kasir'}));
  const act=on.concat(lo).sort((a,b)=>a.t<b.t?-1:1);
  const col=k=>act.filter(o=>o.k===k);
  const q=o=>`'${o.src}','${String(o.id).replace(/'/g,"")}'`;
  const card=o=>{const mins=Math.max(0,Math.floor((Date.now()-new Date(o.t))/60000));return`<div class="kdc ${mins>=15?'late':mins>=8?'warn':''}"><div class="kdh"><b>${esc(o.title)}</b><span>${esc(o.sub)}</span><small>${mins} mnt</small></div>
    <ul>${o.lines.map(l=>`<li><b>${l.qty}×</b> ${esc(l.name)}</li>`).join('')}</ul>${o.note?`<div class="nt">${esc(o.note)}</div>`:''}<small class="hint">${esc(o.from)}</small>
    <div class="acts" style="margin-top:8px">${o.k===0?`<button class="btn sm" onclick="kdsSet(${q(o)},1)">Mulai masak</button>`:''}${o.k===1?`<button class="btn sm" onclick="kdsSet(${q(o)},2)">Siap saji</button>`:''}${o.k===2?`<button class="btn sm sec" onclick="kdsSet(${q(o)},0)">Batal siap</button>${o.src==='loc'?`<button class="btn sm" onclick="kdsSet(${q(o)},3)">Selesai</button>`:''}`:''}</div></div>`};
  const own=isOwner();
  el.innerHTML=bar('<i class="ic" data-ic="cook"></i>Layar Dapur')+(own?`<div class="panel" style="margin-bottom:10px"><label class="tgl"><input type="checkbox" ${db.set.kdsOn?'checked':''} onchange="db.set.kdsOn=this.checked;save()"><span>Kirim pesanan kasir ke dapur<small>Setiap transaksi di kasir otomatis muncul di layar ini.</small></span></label></div>`:'')+`<div class="kdg">${[0,1,2].map(k=>`<div class="kdcol"><h3>${KS[k]} <b>${col(k).length}</b></h3>${col(k).map(card).join('')||'<p class="hint">Kosong</p>'}</div>`).join('')}</div>`;
};

/* ================= CABANG ================= */
P2.branch=async function(){
  closeAll();
  try{
    const j=await (await api('/api/branches')).json();if(!j.list)throw 0;
    openModal(`<h3>Cabang</h3><p class="hint" style="margin:0 0 8px">Tiap cabang punya menu, stok, laporan, dan karyawan sendiri. Ketuk untuk berpindah.</p>
    <div class="brl">${j.list.map(x=>`<div class="brw"><button class="brb ${x.id===j.active?'on':''}" onclick="P2.brSwitch(${x.id})"><b>${esc(x.name)}</b><small>${x.id===j.hq?'Pusat':'Cabang'}${x.id===j.active?' · aktif':''}</small></button>${j.canAdd&&x.id!==j.hq?`<button class="brx" aria-label="Hapus cabang" onclick="P2.brDel(${x.id},'${esc(x.name).replace(/'/g,"\\'")}',${x.id===j.active},${j.hq})"><i class="ic solo" data-ic="trash"></i></button>`:''}</div>`).join('')}</div>
    ${j.canAdd?`<label class="fl" for="brN">Tambah cabang baru</label><input class="fi" id="brN" maxlength="60" placeholder="Nama cabang"><button class="btn" onclick="P2.brAdd()">Buat &amp; buka cabang</button>`:''}
    <button class="btn sec" onclick="closeModal()">Tutup</button>`);
  }catch(e){toast('Gagal memuat cabang (perlu koneksi)')}
};
async function brApply(j){
  CL.me.store={code:j.code,name:j.name};setMe(CL.me);
  await localOwnerGuard(CL.me);closeModal();
  try{await syncNow()}catch(e){}
  applyBrand();applyAccess();go('pos');toast('Cabang aktif: '+j.name);
}
P2.brSwitch=async function(id){
  try{const r=await api('/api/branches/switch',{method:'POST',body:JSON.stringify({id})});const j=await r.json();if(!r.ok)throw 0;await brApply(j)}catch(e){toast('Gagal berpindah cabang')}
};
P2.brDel=async function(id,name,isActive,hq){
  if(!confirm('Hapus cabang "'+name+'"?\n\nSemua data cabang ini (menu, stok, transaksi, karyawan, pesanan) akan dihapus permanen dan tidak bisa dikembalikan.'))return;
  const pw=prompt('Masukkan kata sandi Anda untuk menghapus cabang "'+name+'"');if(!pw)return;
  try{const r=await api('/api/branches/delete',{method:'POST',body:JSON.stringify({id,password:pw})});const j=await r.json();
    if(!r.ok){toast(j.error||'Gagal menghapus cabang');return}
    toast('Cabang dihapus');
    if(isActive){const l=await (await api('/api/branches')).json();const h=l.list.find(x=>x.id===hq)||l.list[0];await brApply(h)}else P2.branch()
  }catch(e){toast('Gagal menghapus cabang')}
};
P2.brAdd=async function(){
  const n=($('#brN').value||'').trim();if(n.length<2){toast('Isi nama cabang');return}
  try{const r=await api('/api/branches',{method:'POST',body:JSON.stringify({name:n})});const j=await r.json();if(!r.ok)throw j;await brApply(j)}catch(e){toast((e&&e.error)||'Gagal membuat cabang')}
};

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

/* ================= STOK OPNAME (halaman sendiri) ================= */
const OPN={q:'',cnt:{},only:'all',hl:''};
P2.opnReset=function(){OPN.cnt={};OPN.hl='';const el=$('#v-opname');if(el)el.dataset.built='';if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();if(S.view==='opname')V.opname()};
const opItems=()=>db.items.filter(i=>!isB(i));
V.opname=function(){
  const el=$('#v-opname');if(!el)return;if(el.dataset.built&&document.activeElement&&el.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&document.activeElement.id!=='opQ')return;
  const q=OPN.q.trim().toLowerCase(),emp=isStaffMode();
  let l=opItems().filter(i=>!q||i.name.toLowerCase().includes(q)||String(i.bc||'').includes(q)||(i.cat||'').toLowerCase().includes(q));
  const cnt=id=>OPN.cnt[id],has=id=>cnt(id)!==undefined&&cnt(id)!=='';
  const n=opItems().filter(i=>has(i.id)).length,dif=opItems().filter(i=>has(i.id)&&+cnt(i.id)!==+i.stock).length;
  if(OPN.only==='todo')l=l.filter(i=>!has(i.id));else if(OPN.only==='diff')l=l.filter(i=>has(i.id)&&+cnt(i.id)!==+i.stock);
  const row=i=>{const c=cnt(i.id),d=has(i.id)?Math.round((+c-i.stock)*1000)/1000:null;
    return`<div class="opr ${OPN.hl===i.id?'hl':''}" id="opr_${i.id}"><div class="th" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:var(--bg2);flex:none">${thumb(i)}</div><div class="on"><b>${esc(i.name)}${i.ns?' <small>· Bahan</small>':''}</b><small>Sistem: ${i.stock}${i.bc?' · '+esc(i.bc):''}</small></div>
    <input type="number" inputmode="decimal" step="any" min="0" placeholder="Fisik" value="${has(i.id)?c:''}" data-id="${i.id}" oninput="P2.opSet('${i.id}',this.value)"><span class="df ${d>0?'gu':d<0?'gd':''}" id="opd_${i.id}">${d===null?'':d===0?'✓':(d>0?'+':'')+d}</span></div>`};
  const first=!el.dataset.built;
  el.innerHTML=`<div class="bar"><h2><i class="ic" data-ic="check"></i>Stok Opname</h2></div>
  <p class="hint" style="margin:-4px 2px 10px">Hitung stok fisik dengan scan barcode, ketik manual, atau lewat Excel. Selisih ditinjau dulu sebelum stok berubah.</p>
  <div class="bar"><input class="fi pill" id="opQ" placeholder="Cari atau scan barcode" value="${esc(OPN.q)}" oninput="OPN_q(this.value)" onkeydown="if(event.key==='Enter')P2.opEnter(this)" autocomplete="off" style="flex:1;min-width:160px"><button class="btn sm" onclick="P2.opScan()"><i class="ic" data-ic="camera"></i>Scan</button></div>
  <div class="opact"><button class="btn sec" onclick="opnOpen()"><i class="ic" data-ic="download"></i>Excel</button><button class="btn" id="opGo" onclick="P2.opReview()" ${n?'':'disabled'}>Tinjau &amp; Terapkan (${n})</button></div>
  <div class="itabs"><button class="${OPN.only==='all'?'on':''}" onclick="P2.opF('all')">Semua <b>${opItems().length}</b></button><button class="${OPN.only==='todo'?'on':''}" onclick="P2.opF('todo')">Belum dihitung <b>${opItems().length-n}</b></button><button class="${OPN.only==='diff'?'on':''}" onclick="P2.opF('diff')">Selisih <b>${dif}</b></button></div>
  <div id="opList">${l.map(row).join('')||'<div class="empty" style="padding:24px 0">Tidak ada item.</div>'}</div>
`;
  el.dataset.built='1';
  if(first||!document.activeElement||document.activeElement===document.body){}
};
window.OPN_q=function(v){OPN.q=v;clearTimeout(OPN.t);OPN.t=setTimeout(()=>{const el=$('#v-opname');const f=document.activeElement;const pos=f&&f.selectionStart;V.opname();const q=$('#opQ');if(q&&f&&f.id==='opQ'){q.focus();try{q.setSelectionRange(pos,pos)}catch(e){}}},150)};
P2.opF=function(f){OPN.only=f;V.opname()};
P2.opSet=function(id,v){
  OPN.cnt[id]=v;const i=find(id),d=v===''?null:Math.round((+v-i.stock)*1000)/1000,e=document.getElementById('opd_'+id);
  if(e){e.textContent=d===null?'':d===0?'✓':(d>0?'+':'')+d;e.className='df '+(d>0?'gu':d<0?'gd':'')}
  const n=opItems().filter(x=>OPN.cnt[x.id]!==undefined&&OPN.cnt[x.id]!=='').length,g=$('#opGo');if(g){g.disabled=!n;g.innerHTML='Tinjau &amp; Terapkan ('+n+')'}
};
function opFocus(it){
  OPN.q='';OPN.only='all';OPN.hl=it.id;V.opname();
  const r=document.getElementById('opr_'+it.id);if(r){r.scrollIntoView({block:'center'});const inp=r.querySelector('input');if(inp){inp.focus();inp.select()}}
  toast(it.name+' · stok sistem '+it.stock);
}
P2.opEnter=function(el){
  const v=el.value.trim();if(!v)return;
  const it=opItems().find(i=>String(i.bc||'')===v)||opItems().find(i=>i.name.toLowerCase()===v.toLowerCase());
  if(it){opFocus(it)}else toast('Barcode/nama tidak ditemukan di inventori');
};
P2.opScan=function(){
  P2.scan(code=>{const it=opItems().find(i=>String(i.bc||'')===code);if(!it){toast('Barcode '+code+' belum terdaftar');return false}
    closeModal();setTimeout(()=>opFocus(it),50);return true},{keep:true});
};
P2.opReview=function(){
  OP.rows=[];OP.miss=[];OP.bad=[];OP.skip=0;OP.name='Hitung langsung';
  for(const i of opItems()){const c=OPN.cnt[i.id];if(c===undefined||c==='')continue;const n=parseFloat(String(c).replace(',','.'));
    if(!isFinite(n)||n<0){OP.bad.push(i.name+' ('+c+')');continue}const fis=Math.round(n*1000)/1000;OP.rows.push({id:i.id,name:i.name,fis,note:'',on:fis!==i.stock})}
  opnReview();
};

/* ================= MENU UTAMA ================= */
V.menu=function(){
  const el=$('#v-menu');if(!el)return;
  const h=new Date().getHours(),g=h>=4&&h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  const nm=(CL.on&&CL.me&&CL.me.name)||'Owner';
  const G=[['Operasional',[['pos','Kasir','receipt','#ef4444'],['table','Meja','grid','#f59e0b'],['co','Pesanan Online','cart','#0ea5e9'],['kds','Layar Dapur','cook','#f97316'],['shift','Shift Kasir','clock','#8b5cf6'],['alert','Notifikasi','bell','#ec4899']]],
   ['Penjualan & Pelanggan',[['home','Beranda & Laporan','dash','#10b981'],['mem','Member','users','#14b8a6'],['promo','Promo','bolt','#eab308'],['exp','Pengeluaran','card','#64748b']]],
   ['Produk & Stok',[['inv','Inventori','box','#3b82f6'],['opname','Stok Opname','check','#0d9488'],['buy','Pembelian','download','#6366f1']]],
   ['Tim & Toko',[['att','Absensi','clock','#06b6d4'],['usr','Pengguna','users','#a855f7'],['pyr','Payroll','card','#22c55e'],['branch','Cabang','bank','#d946ef'],['prn','Printer','print','#475569'],['set','Pengaturan','sliders','#6b7280'],['acc','Akun Saya','key','#111827']]]];
  const nb=(typeof CO!=='undefined'&&CO.list)?CO.list.filter(o=>o.status==='new').length:0;
  const tile=([v,t,ic,c])=>{const act=v==='branch'?'P2.branch()':`go('${v}')`;
    return`<button class="mgi" onclick="${act}"><span class="mic" style="--g:${c};--g1:color-mix(in srgb,${c} 70%,#fff)"><i class="ic" data-ic="${ic}"></i>${v==='co'&&nb?`<b class="mb">${nb}</b>`:''}</span><span class="t">${esc(t)}</span></button>`};
  const secs=G.map(([t,l])=>{const x=l.filter(([v])=>v==='acc'||canView(v));return x.length?`<div class="mgc"><div class="mgh">${t}</div><div class="mgrid">${x.map(tile).join('')}</div></div>`:''}).join('');
  let st='';
  if(canView('home')){const t0=dayStart(Date.now()),os=(db.orders||[]).filter(o=>new Date(o.t).getTime()>=t0);
    st=`<div class="mst"><div><b>${money(os.reduce((a,o)=>a+(+o.total||0),0))}</b><span>Penjualan hari ini</span></div><div><b>${os.length}</b><span>Transaksi</span></div></div>`}
  el.innerHTML=`<div class="mhero"><small>${g},</small><h2>${esc(nm)}</h2><p>${esc(db.set.store||'Ordela')} · ${new Date().toLocaleDateString(dloc(),{weekday:'long',day:'numeric',month:'long'})}</p>${st}</div>${secs}`;
};
P2.t={get shiftStats(){return shiftStats},get debtOf(){return debtOf},get BP(){return BP}};
window.kdsSet=async function(src,id,st){
  if(src==='loc'){const k=db.kds.find(x=>x.id===id);if(k){k.st=st;k.u=Date.now();save()}V.kds();return}
  try{const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action:st===1?'cook':st===2?'ready':'unready'})});if(!r.ok)throw 0;
    const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}if(S.view==='kds')V.kds()}catch(e){toast('Gagal mengubah status')}
};
setInterval(()=>{if(!document.hidden&&S.view==='kds')V.kds()},20000);
})();
