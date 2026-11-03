/* Business branch administration, consolidated reporting and stock transfer. */
(function (window) {
  'use strict';
  const P2=window.P2;
  function dayStart(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
  /* ================= CABANG ================= */
  P2.branch=async function(){
    closeAll();
    try{
      const j=await (await api('/api/branches')).json();if(!j.list)throw 0;
      openModal(`<h3>Cabang</h3><p class="hint" style="margin:0 0 8px">Tiap cabang punya menu, stok, laporan, dan karyawan sendiri. Ketuk untuk berpindah.</p>
      <div class="brl">${j.list.map(x=>`<div class="brw"><button class="brb ${x.id===j.active?'on':''}" onclick="P2.brSwitch(${x.id})"><b>${esc(x.name)}</b><small>${x.id===j.hq?'Pusat':'Cabang'}${x.id===j.active?' · aktif':''}</small></button>${j.canAdd&&x.id!==j.hq?`<button class="brx" aria-label="Hapus cabang" onclick="P2.brDel(${x.id},'${esc(x.name).replace(/'/g,"\\'")}',${x.id===j.active},${j.hq})"><i class="ic solo" data-ic="trash"></i></button>`:''}</div>`).join('')}</div>
      ${j.canAdd?`<label class="fl" for="brN">Tambah cabang baru</label><input class="fi" id="brN" maxlength="60" placeholder="Nama cabang"><button class="btn" onclick="P2.brAdd()">Buat &amp; buka cabang</button>`:''}
      ${j.canAdd&&j.list.length>1?`<div class="two"><button class="btn sec" onclick="P2.brRep('today')">Laporan Gabungan</button><button class="btn sec" onclick="P2.brTr()">Transfer Stok</button></div>`:''}
      <button class="btn sec" onclick="closeModal()">Tutup</button>`);
      P2.brList=j.list;
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
  P2.brRep=async function(per){
    const now=new Date(),t0=dayStart(now);const from=per==='today'?t0:per==='7d'?t0-6*864e5:new Date(now.getFullYear(),now.getMonth(),1).getTime();
    try{const r=await api('/api/branches/report',{method:'POST',body:JSON.stringify({from:new Date(from).toISOString()})});const j=await r.json();if(!r.ok)throw 0;
      const T=j.rows.reduce((a,x)=>({n:a.n+x.n,t:a.t+x.total,g:a.g+x.gp}),{n:0,t:0,g:0});
      openModal(`<h3>Laporan Gabungan</h3><div class="itabs">${[['today','Hari ini'],['7d','7 hari'],['month','Bulan ini']].map(([k,l])=>`<button class="${k===per?'on':''}" onclick="P2.brRep('${k}')">${l}</button>`).join('')}</div>
      <div class="panel" style="padding:6px 4px">${j.rows.map(x=>`<div class="li" style="cursor:default"><span class="l"><b>${esc(x.name)}${x.hq?' <small>(pusat)</small>':''}</b><small>${x.n} transaksi · est. laba kotor ${money(x.gp)}</small></span><span class="r"><b>${money(x.total)}</b></span></div>`).join('')}
      <div class="li" style="cursor:default;border-top:1px solid var(--ln)"><span class="l"><b>Total semua cabang</b><small>${T.n} transaksi · est. laba kotor ${money(T.g)}</small></span><span class="r"><b>${money(T.t)}</b></span></div></div>
      <p class="hint" style="margin:8px 2px">Laba kotor = penjualan − modal barang. Data tiap cabang sesuai yang sudah tersinkron ke server.</p>
      <button class="btn sec" onclick="P2.branch()">Kembali</button>`);
    }catch(e){toast('Gagal memuat laporan (perlu koneksi)')}
  };
  P2.brTr=function(){
    const o=(P2.brList||[]).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
    openModal(`<h3>Transfer Stok</h3><p class="hint" style="margin:0 0 8px">Pindahkan stok satu item antar cabang. Item harus sudah ada di kedua cabang (cocok lewat barcode atau nama yang sama).</p>
    <div class="two"><div><label class="fl">Dari</label><select class="fi" id="trF">${o}</select></div><div><label class="fl">Ke</label><select class="fi" id="trT">${o}</select></div></div>
    <label class="fl">Nama item atau barcode</label><input class="fi" id="trN" placeholder="Mis. Kopi Susu / 8999..." autocomplete="off">
    <label class="fl">Jumlah</label><input class="fi" id="trQ" type="number" min="0" step="any" inputmode="decimal">
    <button class="btn" onclick="P2.brTrGo()">Transfer</button><button class="btn sec" onclick="P2.branch()">Kembali</button>`);
    const l=P2.brList||[];if(l[1])$('#trT').value=l[1].id;
  };
  P2.brTrGo=async function(){
    const f=+$('#trF').value,t=+$('#trT').value,n=$('#trN').value.trim(),q=+$('#trQ').value;
    if(f===t){toast('Pilih dua cabang yang berbeda');return}if(!n||!(q>0)){toast('Isi item dan jumlah');return}
    const body={from:f,to:t,qty:q};if(/^\d{6,}$/.test(n))body.bc=n;else body.name=n;
    try{const r=await api('/api/branches/transfer',{method:'POST',body:JSON.stringify(body)});const j=await r.json();
      if(!r.ok){toast(j.error||'Transfer gagal');return}
      toast('Transfer '+j.name+' ×'+j.qty+' berhasil');closeModal();try{await syncNow()}catch(e){}
    }catch(e){toast('Transfer gagal (perlu koneksi)')}
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
})(window);
