/* Business finance: operating expenses, profit and supplier purchases. */
(function (window) {
  'use strict';
  const V=window.P2.views;
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const nowIso=()=>new Date().toISOString();
  const live=a=>(a||[]).filter(x=>!x.del);
  const myName=()=>(CL.on&&CL.me)?CL.me.name:'Owner';
  const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
  const num=v=>Math.max(0,+v||0);
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
  const kc=(t,v,cls)=>'<div class="kc"><div class="kt"><span>'+t+'</span></div><div class="kv"><span class="'+(cls||'')+'">'+v+'</span></div></div>';
  function dayStart(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
  function periodRange(p){
    const n=new Date(),t0=dayStart(n);
    if(p==='today')return[t0,Infinity];
    if(p==='7d')return[t0-6*864e5,Infinity];
    if(p==='month')return[new Date(n.getFullYear(),n.getMonth(),1).getTime(),Infinity];
    return[0,Infinity];
  }
  const PER=[['today','Hari ini'],['7d','7 hari'],['month','Bulan ini'],['all','Semua']];
  const perChips=(cur,fn)=>'<div class="chips" style="margin:0 0 10px">'+PER.map(([k,l])=>'<button class="chip '+(cur===k?'on':'')+'" onclick="'+fn+"('"+k+"')"+'">'+l+'</button>').join('')+'</div>';
  const inR=(t,r)=>{const x=+new Date(t);return x>=r[0]&&x<r[1]};
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
  window.BP_set=function(i,f,v){const l=BP.lines[i];if(f==='pu'){l.pu=v==='1';BP_render();return}if(f==='id'){l.id=v;l.pu=false;const it=find(v);if(it&&!l.c)l.c=it.cost||0;BP_render()}else{l[f]=num(v);BP_tot()}};
  function BP_render(){
    const e=$('#byRows');if(!e)return;
    e.innerHTML=BP.lines.map((l,i)=>`<div class="bpr"><select class="fi" onchange="BP_set(${i},'id',this.value)"><option value="">Pilih barang…</option>${buyItems().map(x=>`<option value="${esc(x.id)}" ${x.id===l.id?'selected':''}>${esc(x.name)}${x.ns?' (bahan)':''}</option>`).join('')}</select>
    ${(find(l.id)||{}).pu?`<select class="fi" aria-label="Satuan" onchange="BP_set(${i},'pu',this.value)" style="width:auto;flex:none"><option value="0">satuan</option><option value="1" ${l.pu?'selected':''}>${esc(find(l.id).pu.n)}</option></select>`:''}<input class="fi" type="number" min="0" step="any" value="${l.q}" aria-label="Jumlah" oninput="BP_set(${i},'q',this.value)"><input class="fi" type="number" min="0" step="any" value="${l.c||''}" placeholder="Harga satuan" aria-label="Harga satuan" oninput="BP_set(${i},'c',this.value)"><button type="button" class="mini" onclick="BP_del(${i})">✕</button></div>`).join('');
    BP_tot();
  }
  function BP_tot(){const t=rnd(BP.lines.reduce((a,l)=>a+(+l.q||0)*(+l.c||0),0));const e=$('#byTot');if(e)e.textContent=money(t);return t}
  window.buySave=function(){
    const ls=BP.lines.filter(l=>l.id&&l.q>0);if(!ls.length){toast('Pilih barang yang dibeli');return}
    const total=BP_tot(),cur=shiftCur(),pay=BP.pay;let paid=0;
    if(pay==='lunas'||pay==='kas')paid=total;else if(pay==='dp')paid=Math.min(total,num($('#byDp').value));
    if(pay==='kas'&&!cur){toast('Buka shift dulu untuk membayar dari kas laci');return}
    const sup=$('#bySup').value,now=nowIso(),id='b'+uid();
    const b={id,t:now,by:myName(),sup,lines:ls.map(l=>({id:l.id,name:(find(l.id)||{}).name||'',q:l.q,c:l.c,un:(l.pu&&(find(l.id)||{}).pu)?find(l.id).pu.n:'',bq:Math.round(l.q*((l.pu&&(find(l.id)||{}).pu)?find(l.id).pu.f:1)*1000)/1000})),total,note:($('#byNote').value||'').trim(),pays:[],u:Date.now()};
    if(paid>0)b.pays.push({t:now,amt:paid,src:pay==='kas'?'kas':'lain',sh:pay==='kas'&&cur?cur.id:null});
    ls.forEach(l=>{const it=find(l.id);if(!it)return;const f=(l.pu&&it.pu)?it.pu.f:1,q=Math.round(l.q*f*1000)/1000;it.stock=Math.round(((+it.stock||0)+q)*1000)/1000;logAdd(it.name,q,'Pembelian '+supName(sup)+(f>1?' ('+l.q+' '+it.pu.n+')':''),it.stock,now);if(isOwner()&&l.c>0)it.cost=Math.round(l.c/f*100)/100});
    db.buys.unshift(b);db.log=db.log.slice(0,LOG_MAX);save();closeModal();toast('Pembelian dicatat, stok bertambah');V.buy();
  };
  window.buyDetail=function(id){
    const b=db.buys.find(x=>x.id===id);if(!b)return;const d=debtOf(b);
    openModal(`<h3>${esc(supName(b.sup))}</h3><p class="hint" style="margin:0 0 6px">${esc(dstr(b.t))} · oleh ${esc(b.by||'')}</p><table class="dl">${(b.lines||[]).map(l=>`<tr><td>${l.q}${l.un?' '+esc(l.un):'×'} ${esc(l.name)}<br><small>${money(l.c)}</small></td><td>${money(l.q*l.c)}</td></tr>`).join('')}<tr class="tt"><td>Total</td><td>${money(b.total)}</td></tr></table>
    ${(b.pays||[]).length?`<table class="dl">${b.pays.map(p=>`<tr><td>Bayar ${esc(dstr(p.t))}${p.src==='kas'?' (kas laci)':''}</td><td>${money(p.amt)}</td></tr>`).join('')}</table>`:''}
    ${d?`<div class="chg neg"><span>Sisa hutang</span><span>${money(d)}</span></div><label class="fl">Bayar hutang</label><input class="fi" id="dbAmt" type="number" min="0" step="any" value="${d}"><select class="fi" id="dbSrc"><option value="lain">Transfer / sumber lain</option>${shiftCur()?'<option value="kas">Kas laci</option>':''}</select><button class="btn" onclick="debtPay('${b.id}')">Bayar</button>`:'<div class="chg"><span>Lunas</span><span></span></div>'}
    ${b.note?`<div class="nt">${esc(b.note)}</div>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
  };
  window.debtPay=function(id){
    const b=db.buys.find(x=>x.id===id);if(!b)return;const a=Math.min(debtOf(b),num($('#dbAmt').value));if(!a){toast('Isi jumlah');return}
    const src=$('#dbSrc').value,cur=shiftCur();b.pays=b.pays||[];b.pays.push({t:nowIso(),amt:a,src,sh:src==='kas'&&cur?cur.id:null});b.u=Date.now();save();closeModal();toast('Pembayaran hutang dicatat');V.buy();
  };
  window.BP = BP;
  window.EP = EP;
  window.profit = profit;
  window.debtOf = debtOf;
  window.P2.t.debtOf = debtOf;
  window.P2.t.BP = BP;
})(window);
