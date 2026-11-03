/* Business AI assistant: store-scoped analysis, guided help and per-account chat history. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
  const PER=[['today','Hari ini'],['7d','7 hari'],['month','Bulan ini'],['all','Semua']];
  /* ================= ASISTEN ORDELA (berbasis aturan, berjalan di perangkat, tanpa API key) ================= */
  const AI={msgs:[],busy:0,why:'',uid:'',loaded:false,loading:false,saveChain:Promise.resolve()};
  const aiN=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const aiHas=(q,...w)=>w.some(x=>q.includes(x));
  function aiRange(q){
    const d=n=>dkey(Date.now()-n*864e5),t=dkey(Date.now());
    if(aiHas(q,'kemarin'))return{k:'yest',l:'kemarin',f:d(1),t:d(1),need:1};
    if(aiHas(q,'minggu','7 hari','tujuh hari'))return{k:'w',l:'7 hari terakhir',f:d(6),t:t,need:1};
    if(aiHas(q,'bulan','30 hari'))return{k:'m',l:'30 hari terakhir',f:d(29),t:t,need:1};
    if(aiHas(q,'tahun'))return{k:'y',l:'365 hari terakhir',f:d(364),t:t,need:1};
    return{k:'t',l:'hari ini',f:t,t:t,need:0};
  }
  const aiOrders=r=>db.orders.filter(x=>{const k=dkey(x.t);return k>=r.f&&k<=r.t});
  function aiTop(os,by){const m={};os.forEach(o=>(o.lines||[]).forEach(l=>{const n=l.bn||l.name;if(!n)return;const e=m[n]||(m[n]={n,q:0,v:0});e.q+=+l.qty||0;e.v+=(+l.qty||0)*(+l.price||0)}));return Object.values(m).sort((a,b)=>by==='v'?b.v-a.v:b.q-a.q)}
  const AIH={ // bantuan memakai aplikasi: [kata kunci, jawaban]
   split:[['split','pisah tagihan','bagi tagihan','patungan'],'Split bill: di layar Bayar tekan <b>Pisah tagihan per item</b>, pilih item untuk tamu pertama, bayar, lalu sisanya muncul otomatis untuk dibayar berikutnya.'],
   shift:[['shift','laci','buka kasir','tutup kasir','kas awal'],'Shift: buka menu <b>Shift Kasir</b> → isi kas awal → <b>Mulai Shift</b>. Saat selesai, hitung uang laci dan tutup shift; selisih kas dihitung otomatis.'],
   menu:[['tambah menu','tambah item','menu baru','produk baru','tambah produk'],'Tambah menu: buka <b>Inventori</b> → tombol tambah item → isi nama, harga, modal, stok, kategori (opsional foto, stasiun Dapur/Bar, satuan beli) → Simpan.'],
   opname:[['opname','hitung stok','cek stok fisik'],'Stok opname: menu <b>Stok Opname</b> → masukkan atau scan hitungan fisik tiap item → <b>Tinjau</b> selisih → Terapkan. Perubahan tercatat di riwayat stok.'],
   gift:[['kartu hadiah','gift','voucher'],'Kartu hadiah: menu <b>Kartu Hadiah</b> → <b>Jual Kartu</b> (kode + nominal). Saat pembayaran, masukkan kode kartu di kolom kartu hadiah; saldo terpotong otomatis.'],
   rsv:[['reservasi','booking meja','pesan meja'],'Reservasi: menu <b>Reservasi</b> → tambah (nama, meja, jam, jumlah orang). Meja yang dipesan tampil biru di halaman Meja.'],
   cabang:[['cabang','hapus cabang','toko baru'],'Cabang: <b>Menu Utama → Cabang</b>. Tiap cabang punya menu, stok, dan karyawan sendiri. Owner pusat bisa pindah cabang, melihat laporan gabungan, transfer stok, dan menghapus cabang (wajib sandi).'],
   print:[['printer','cetak','struk','bluetooth'],'Printer: menu <b>Printer</b> → sambungkan printer Bluetooth/USB → tes cetak. Tiket dapur bisa dipisah per stasiun di Layar Dapur.'],
   meja:[['meja','dine in','pindah meja'],'Meja: isi nomor meja saat mengambil pesanan di kasir; meja otomatis tampil terisi di halaman <b>Meja</b> sampai dikosongkan.'],
   online:[['gofood','grabfood','shopeefood','ojol','online food','integrasi'],'Online food: <b>Menu Utama → Integrasi</b> → Connect platform → salin URL penerima → daftarkan di platform/mitra Anda. Pesanan masuk di <b>Pesanan Online</b>.'],
   promo:[['promo','diskon','kode promo'],'Promo: menu <b>Promo</b> (owner) → buat promo persen/nominal, periode dan kode. Dipakai di layar Bayar.'],
   absen:[['absen','absensi','payroll','gaji'],'Absensi: menu <b>Absensi</b> untuk clock in/out (lokasi dan foto). Gaji dihitung di <b>Payroll</b> (owner).']};
  function aiAnswer(raw){
    const q=aiN(raw);if(!q)return'Silakan tulis pertanyaan Anda.';
    if(aiHas(q,'kenapa','mengapa','penyebab','analisis','analisa','rekomendasi','sarankan','strategi','menu apa','menu mana','cocok didiskon','omzet turun','omset turun','penjualan turun')&&aiHas(q,'omzet','omset','penjualan','transaksi','menu','diskon','promo','stok','laba','toko'))return null;
    const own=isOwner(),H=can('hist')||own;const r=aiRange(q);
    const gate=()=>r.need&&!H?'Data '+r.l+' butuh izin <b>Riwayat</b>. Saya bisa menjawab untuk <b>hari ini</b>.':'';
    const os=aiOrders(r),rev=os.reduce((a,b)=>a+(+b.total||0),0);
    if(aiHas(q,'halo','hai','hello','selamat')&&q.split(' ').length<4)return'Halo! Saya asisten Ordela. Tanya omzet, menu terlaris, stok menipis, jam ramai, atau cara memakai fitur.';
    if(aiHas(q,'terlaris','laris','best seller','paling banyak','populer','sering dibeli')&&!aiHas(q,'kategori','bayar','pembayaran','metode','qris','tunai')){const g=gate();if(g)return g;const t=aiTop(os,aiHas(q,'omzet','pendapatan')?'v':'q').slice(0,5);
      return t.length?`Menu terlaris ${r.l}:<br>`+t.map((x,i)=>`${i+1}. <b>${esc(x.n)}</b> — ${x.q} terjual · ${money(x.v)}`).join('<br>'):'Belum ada penjualan '+r.l+'.'}
    if(aiHas(q,'kurang laku','paling sepi','tidak laku','jarang')){const g=gate();if(g)return g;const m={};db.items.filter(i=>!i.bundle).forEach(i=>m[i.name]=0);aiTop(os).forEach(x=>{if(x.n in m)m[x.n]=x.q});
      const l=Object.entries(m).sort((a,b)=>a[1]-b[1]).slice(0,5);return l.length?`Menu paling sepi ${r.l}:<br>`+l.map(([n,v],i)=>`${i+1}. <b>${esc(n)}</b> — ${v} terjual`).join('<br>')+'<br><small>Pertimbangkan promo atau ubah posisi menu.</small>':'Belum ada menu.'}
    if(aiHas(q,'kategori')){const g=gate();if(g)return g;const m={};os.forEach(o=>(o.lines||[]).forEach(l=>{const it=find(l.id),c=(it&&it.cat)||'Lainnya';m[c]=(m[c]||0)+(+l.qty||0)*(+l.price||0)}));
      const l=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);return l.length?`Pendapatan per kategori ${r.l}:<br>`+l.map(([n,v])=>`• <b>${esc(n)}</b> — ${money(v)}`).join('<br>'):'Belum ada penjualan '+r.l+'.'}
    if(aiHas(q,'jam ramai','ramai','sepi jam','jam sibuk','peak')){const g=gate();if(g)return g;const h=Array(24).fill(0);os.forEach(o=>h[new Date(o.t).getHours()]++);const mx=Math.max(...h);if(!mx)return'Belum ada transaksi '+r.l+'.';
      const top=h.map((n,i)=>[i,n]).filter(z=>z[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([i,n])=>`<b>${String(i).padStart(2,'0')}.00–${String(i+1).padStart(2,'0')}.00</b> (${n} transaksi)`);return`Jam paling ramai ${r.l}: `+top.join(', ')}
    if(aiHas(q,'metode','bayar','qris','tunai','cash')&&aiHas(q,'berapa','paling','dominan','pembayaran','metode','qris','tunai')&&!aiHas(q,'cara')){const g=gate();if(g)return g;const m={};os.forEach(o=>{const k=o.method||'Lainnya';m[k]=(m[k]||0)+(+o.total||0)});const l=Object.entries(m).sort((a,b)=>b[1]-a[1]);
      return l.length?`Pembayaran ${r.l}:<br>`+l.map(([n,v])=>`• <b>${esc(n)}</b> — ${money(v)}`).join('<br>'):'Belum ada transaksi '+r.l+'.'}
    if(aiHas(q,'stok','habis','menipis','hampir')&&!aiHas(q,'opname')){if(!(can('inv')||own))return'Informasi stok butuh izin <b>Inventori</b>.';
      const it=db.items.filter(i=>!i.bundle&&!i.ns),out=it.filter(i=>i.stock<=0),low=it.filter(i=>i.stock>0&&i.stock<=i.min);
      if(!out.length&&!low.length)return'Semua stok aman 👍';return(out.length?`<b>Habis (${out.length}):</b> ${out.slice(0,10).map(i=>esc(i.name)).join(', ')}<br>`:'')+(low.length?`<b>Menipis (${low.length}):</b> ${low.slice(0,10).map(i=>esc(i.name)+' ('+i.stock+')').join(', ')}`:'')}
    if(aiHas(q,'laba','untung','profit','margin')){if(!own&&!can('hist'))return'Laba hanya untuk owner atau yang punya izin Riwayat.';const g=gate();if(g)return g;
      const cost=os.reduce((a,o)=>a+(o.lines||[]).reduce((z,l)=>z+(+l.cost||0)*(+l.qty||0),0),0);return`Laba kotor ${r.l}: <b>${money(rev-cost)}</b> (omzet ${money(rev)} − modal ${money(cost)}${rev?' · margin '+Math.round((rev-cost)/rev*100)+'%':''}).`}
    if(aiHas(q,'pengeluaran','biaya','kas keluar')){if(!(can('exp')||own))return'Pengeluaran butuh izin <b>Pengeluaran</b>.';const g=gate();if(g)return g;const e=(db.exps||[]).filter(x=>!x.del&&x.dir!=='in'&&x.cat!=='Kas masuk'&&dkey(x.t)>=r.f&&dkey(x.t)<=r.t);return`Pengeluaran ${r.l}: <b>${money(e.reduce((a,b)=>a+(+b.amt||0),0))}</b> (${e.length} catatan).`}
    if(aiHas(q,'member','pelanggan setia','langganan')){if(!(can('mem')||own))return'Data member butuh izin <b>Member</b>.';const m={};db.orders.forEach(o=>{if(o.mem&&o.mem.name)m[o.mem.name]=(m[o.mem.name]||0)+(+o.total||0)});const l=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);
      return l.length?'Member teratas (belanja):<br>'+l.map(([n,v],i)=>`${i+1}. <b>${esc(n)}</b> — ${money(v)}`).join('<br>'):'Belum ada transaksi dengan member.'}
    if(aiHas(q,'omzet','pendapatan','penjualan','pemasukan','transaksi','rata rata','rata2','turun','naik')){const g=gate();if(g)return g;
      let s=`Penjualan ${r.l}: <b>${money(rev)}</b> dari <b>${os.length}</b> transaksi${os.length?' · rata-rata '+money(rev/os.length)+' per transaksi':''}.`;
      if(r.k==='t'||r.k==='yest'){const p=aiOrders({f:dkey(Date.now()-(r.k==='t'?1:2)*864e5),t:dkey(Date.now()-(r.k==='t'?1:2)*864e5)});const pr=p.reduce((a,b)=>a+(+b.total||0),0);if(H&&pr)s+=`<br>Dibanding hari sebelumnya (${money(pr)}): <b>${rev>=pr?'naik ':'turun '}${Math.abs(Math.round((rev-pr)/pr*100))}%</b>.`}
      return s}
    if(aiHas(q,'shift')&&aiHas(q,'berjalan','aktif','sekarang','status')){const c=shiftCur();return c?'Shift sedang berjalan sejak '+esc(dstr(c.t||c.start)):'Tidak ada shift yang berjalan.'}
    if(aiHas(q,'upsell','rekomendasi','tawarkan','paket','sering bareng','berpasangan','pasangan')){const g=gate();if(g)return g;const pair={};db.orders.slice(0,400).forEach(o=>{const n=[...new Set((o.lines||[]).map(l=>l.bn||l.name).filter(Boolean))];for(let i=0;i<n.length;i++)for(let j=i+1;j<n.length;j++){const k=[n[i],n[j]].sort().join(' + ');pair[k]=(pair[k]||0)+1}});
      const l=Object.entries(pair).sort((a,b)=>b[1]-a[1]).slice(0,5);return l.length?'Pasangan menu yang sering dibeli bersama — tawarkan saat melayani:<br>'+l.map(([n,c])=>`• <b>${esc(n)}</b> (${c}×)`).join('<br>'):'Belum cukup data transaksi untuk melihat pasangan menu.'}
    const dm=raw.match(/deskripsi(?: menu)?\s+(.+)/i);
    if(dm&&aiHas(q,'deskripsi')){const n=dm[1].trim().slice(0,40);return`Contoh deskripsi untuk <b>${esc(n)}</b>:<br>“${esc(n)} dibuat segar setiap hari dengan bahan pilihan — gurih, pas di lidah, dan cocok dinikmati kapan saja.”<br><small>Sesuaikan dengan rasa dan bahan asli menu Anda.</small>`}
    for(const k in AIH)if(aiHas(q,...AIH[k][0])){
       // Pertanyaan rekomendasi menu diskon adalah analisis sales, bukan panduan membuat promo.
       if(k==='promo'&&aiHas(q,'menu apa','menu mana','rekomendasi','sarankan','sebaiknya','harus didiskon','perlu didiskon','cocok didiskon','yang didiskon','menu untuk diskon'))continue;
       return AIH[k][1];
     }
    return null;
  }
  const AIMISS='Maaf, saya belum paham pertanyaan itu. Coba: “omzet hari ini”, “menu terlaris minggu ini”, “stok menipis”, “jam ramai”, “laba bulan ini”, “cara split bill”, atau “pasangan menu untuk upsell”.';
  /* ringkasan data (hanya angka agregat, tanpa nama/HP pelanggan) untuk AI cloud, sesuai hak akses */
  function aiCtx(){
    const own=isOwner(),H=can('hist')||own,L=[];
    const d=n=>dkey(Date.now()-n*864e5),t=dkey(Date.now());
    const orders=r=>aiOrders(r),total=os=>os.reduce((a,o)=>a+(+o.total||0),0);
    const cogs=os=>os.reduce((a,o)=>a+(o.lines||[]).reduce((z,l)=>z+(+l.cost||0)*(+l.qty||0),0),0);
    const stat=os=>({n:os.length,v:total(os),avg:os.length?total(os)/os.length:0,cost:cogs(os)});
    const fmt=x=>x.n+' transaksi; omzet '+Math.round(x.v)+'; rata-rata transaksi '+Math.round(x.avg);
    const this7=orders({f:d(6),t}),prev7=orders({f:d(13),t:d(7)});
    const this30=orders({f:d(29),t}),prev30=orders({f:d(59),t:d(30)});
    L.push('TOKO AKTIF: '+(db.set&&db.set.store||'-')+'. Semua angka hanya untuk toko/cabang yang sedang aktif. Mata uang: '+((db.set&&db.set.cur)||'Rp')+'.');
    L.push('Tanggal lokal hari ini: '+t);
    L.push('Hari ini: '+fmt(stat(orders({f:t,t}))));
    if(H){
      L.push('7 hari terakhir ('+d(6)+' s.d. '+t+'): '+fmt(stat(this7)));
      L.push('7 hari sebelumnya ('+d(13)+' s.d. '+d(7)+'): '+fmt(stat(prev7)));
      L.push('30 hari terakhir: '+fmt(stat(this30)));
      L.push('30 hari sebelumnya: '+fmt(stat(prev30)));
      const daily=[];for(let i=6;i>=0;i--){const day=d(i),os=orders({f:day,t:day});daily.push(day+': '+os.length+' transaksi, omzet '+Math.round(total(os)));}
      L.push('RINCIAN HARIAN 7 HARI TERAKHIR: '+daily.join(' | '));
      const top7=aiTop(this7,'v').slice(0,12),topPrev=aiTop(prev7,'v').slice(0,8);
      L.push('MENU 7 HARI TERAKHIR (urut omzet): '+(top7.length?top7.map(x=>x.n+' ('+x.q+' terjual; omzet '+Math.round(x.v)+')').join('; '):'belum ada'));
      L.push('MENU 7 HARI SEBELUMNYA: '+(topPrev.length?topPrev.map(x=>x.n+' ('+x.q+' terjual; omzet '+Math.round(x.v)+')').join('; '):'belum ada'));
      const top30=aiTop(this30,'v').slice(0,10);
      L.push('MENU TERLARIS 30 HARI: '+(top30.length?top30.map(x=>x.n+' ('+x.q+'x; '+Math.round(x.v)+')').join('; '):'belum ada'));
      const sold={};this30.forEach(o=>(o.lines||[]).forEach(l=>{const n=l.bn||l.name;if(n)sold[n]=(sold[n]||0)+(+l.qty||0)}));
      const slow=db.items.filter(i=>!i.bundle&&!i.ns).map(i=>({n:i.name,q:sold[i.name]||0,p:+i.price||0})).sort((a,b)=>a.q-b.q).slice(0,10);
      L.push('MENU PENJUALAN TERENDAH 30 HARI: '+(slow.length?slow.map(x=>x.n+' ('+x.q+' terjual; harga '+Math.round(x.p)+')').join('; '):'tidak tersedia'));
      const h=Array(24).fill(0);this30.forEach(o=>h[new Date(o.t).getHours()]++);L.push('TRANSAKSI PER JAM 30 HARI (jam 0-23): '+h.join(','));
      const pm={};this30.forEach(o=>{pm[o.method||'Lainnya']=(pm[o.method||'Lainnya']||0)+(+o.total||0)});L.push('METODE BAYAR 30 HARI: '+Object.entries(pm).map(([k,v])=>k+' '+Math.round(v)).join('; '));
      const ty={};this30.forEach(o=>{ty[o.type||'-']=(ty[o.type||'-']||0)+1});L.push('TIPE PESANAN 30 HARI: '+Object.entries(ty).map(([k,v])=>k+' '+v).join('; '));
      if(own){const ex=(db.exps||[]).filter(x=>!x.del&&x.dir!=='in'&&x.cat!=='Kas keluar'&&dkey(x.t)>=d(29)&&dkey(x.t)<=t);L.push('PENGELUARAN 30 HARI: '+Math.round(ex.reduce((a,x)=>a+(+x.amt||0),0))+' dari '+ex.length+' catatan.');}
      L.push('HPP 7 HARI: '+Math.round(cogs(this7))+'; laba kotor 7 hari: '+Math.round(total(this7)-cogs(this7)));
      L.push('HPP 7 HARI SEBELUMNYA: '+Math.round(cogs(prev7))+'; laba kotor periode sebelumnya: '+Math.round(total(prev7)-cogs(prev7)));
    }
    if(own||can('inv')){
      const it=db.items.filter(i=>!i.bundle&&!i.ns);
      L.push('JUMLAH ITEM STOK: '+it.length+'; stok habis: '+it.filter(i=>+i.stock<=0).length+'; stok menipis: '+it.filter(i=>+i.stock>0&&+i.stock<=+i.min).length);
      L.push('STOK HABIS: '+(it.filter(i=>+i.stock<=0).map(i=>i.name).slice(0,15).join(', ')||'-'));
      L.push('STOK MENIPIS: '+(it.filter(i=>+i.stock>0&&+i.stock<=+i.min).map(i=>i.name+' ('+i.stock+')').slice(0,15).join('; ')||'-'));
    }
    if(own){
      const activeSh=(db.shifts||[]).filter(x=>!x.del&&!x.close);
      L.push('SHIFT KASIR: '+activeSh.length+' shift sedang berjalan.');
      const promos=(db.promos||[]).filter(x=>!x.del);
      L.push('PROMO TERCATAT: '+promos.length+' promo (AI tidak boleh mengubah promo tanpa persetujuan owner).');
    }
    L.push('MENU & HARGA: '+db.items.filter(i=>!i.bundle&&!i.ns).slice(0,50).map(i=>i.name+' harga '+i.price+' modal '+(i.cost??'tidak diisi')+' stok '+(i.stock??'tidak diisi')).join('; '));
    return L.join('\\n').slice(0,5900);
  }
  function aiFormat(raw){
    const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
    const lines=String(raw||'').replace(/\r/g,'').split('\n');
    const out=[];let list='',items=[];
    const flush=()=>{if(!items.length)return;out.push('<'+list+' style="margin:6px 0 10px;padding-left:22px">'+items.map(x=>'<li style="margin:4px 0">'+inline(x)+'</li>').join('')+'</'+list+'>');items=[];list='';};
    for(const rawLine of lines){
      const line=rawLine.trim();if(!line){flush();continue;}let m;
      if((m=line.match(/^#{1,3}\s+(.+)$/))){flush();out.push('<div style="font-weight:750;font-size:1.04em;margin:12px 0 5px">'+inline(m[1])+'</div>');continue;}
      if((m=line.match(/^[-•*]\s+(.+)$/))){if(list!=='ul'){flush();list='ul';}items.push(m[1]);continue;}
      if((m=line.match(/^\d+[.)]\s+(.+)$/))){if(list!=='ol'){flush();list='ol';}items.push(m[1]);continue;}
      flush();out.push('<p style="margin:5px 0 8px;line-height:1.55">'+inline(line)+'</p>');
    }
    flush();return out.join('');
  }
  async function aiCloud(q){
    const C=window.POS_SB;if(!(C&&C.url)||!(CL.on&&CL.tok))return null;
    // AI.msgs sudah berisi pesan pengguna terbaru. Bersihkan markup tampilan
    // sebelum mengirim riwayat agar model hanya menerima teks percakapan.
    const history=AI.msgs.slice(-20).map(m=>{
      let content=String(m.t||'');
      if(!m.me){const el=document.createElement('div');el.innerHTML=content;content=el.textContent||el.innerText||'';content=content.replace(/dijawab AI\s*$/i,'').trim();}
      return {role:m.me?'user':'assistant',content:content.slice(0,2000)};
    }).filter(m=>m.content);
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),35000);
    try{const r=await fetch(C.url+'/functions/v1/ai-chat',{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,q,ctx:aiCtx(),messages:history})});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&typeof j.answer==='string'&&j.answer.trim())return aiFormat(j.answer)+'<small style="display:block;opacity:.58;margin-top:8px">✦ Ordela AI</small>';
      AI.why=r.status===404?'fungsi ai-chat belum di-deploy (404)':r.status===501?'secret AI_API_KEY belum diisi':'';
      if(r.status===404||r.status===501)return null;
      if(r.status===401&&/jwt/i.test(JSON.stringify(j))){AI.why='Verify JWT pada fungsi ai-chat masih menyala';return null}
      return esc(j.error||'Maaf, jawaban AI kosong. Coba kirim sekali lagi.')}catch(e){AI.why=e&&e.name==='AbortError'?'permintaan melewati batas waktu 35 detik':'fungsi ai-chat tidak terjangkau (periksa koneksi atau CORS)';return null}finally{clearTimeout(timer)}
  }
  
  function aiSafeHtml(raw){
    const root=document.createElement('div');root.innerHTML=String(raw||'');
    const allowed=new Set(['B','STRONG','EM','I','CODE','BR','P','UL','OL','LI','SMALL','DIV']);
    const clean=node=>{
      Array.from(node.childNodes).forEach(child=>{
        if(child.nodeType===1){
          if(!allowed.has(child.tagName)){child.replaceWith(document.createTextNode(child.textContent||''));return}
          Array.from(child.attributes).forEach(a=>child.removeAttribute(a.name));
          clean(child);
        }else if(child.nodeType!==3)child.remove();
      });
    };
    clean(root);return root.innerHTML;
  }
  const aiTm=()=>new Date().toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  const aiBub=m=>`<div class="cr ${m.me?'me':''}">${m.me?'':'<span class="cav"><img class="ai-logo" src="brand/ordela-mark.svg" alt="Ordela"></span>'}<div class="cbw"><div class="cb">${m.me?esc(m.t):aiSafeHtml(m.t)}</div><small>${esc(m.ts||'')}</small></div></div>`;
  const AISUG=['Omzet hari ini','Menu terlaris minggu ini','Stok menipis','Jam ramai','Laba bulan ini','Pasangan menu untuk upsell','Cara split bill','Cara buka shift'];
  function aiScroll(){const l=$('#aiLog');if(l)l.scrollTop=l.scrollHeight}
  async function aiHistoryRequest(action,messages){
    const C=window.POS_SB;if(!(C&&C.url)||!(CL.on&&CL.tok))throw new Error('Sesi cloud tidak tersedia');
    const r=await fetch(C.url+'/functions/v1/ai-chat',{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,action,messages})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Riwayat chat gagal diproses');return j;
  }
  async function aiHistoryLoad(uid){
    try{
      const j=await aiHistoryRequest('history_load');
      if(AI.uid!==uid)return;
      AI.msgs=Array.isArray(j.messages)?j.messages.slice(-60):[];
    }catch(e){AI.msgs=[]}
    AI.loaded=true;AI.loading=false;
    const log=$('#aiLog');if(log){
      log.innerHTML=AI.msgs.length?AI.msgs.map(aiBub).join(''):aiBub({t:'Halo! 👋 Saya asisten Ordela. Tanyakan penjualan, stok, jam ramai, atau cara memakai aplikasi. Saya hanya menampilkan data sesuai hak akses Anda.',ts:aiTm()});
      aiScroll();
    }
    const input=$('#aiIn'),go=$('#aiGo');if(input)input.disabled=false;if(go)go.disabled=false;
  }
  function aiHistorySave(){
    if(!AI.uid||!AI.loaded||!CL.tok)return;
    const snapshot=AI.msgs.slice(-60);AI.saveChain=AI.saveChain.then(()=>aiHistoryRequest('history_save',snapshot)).catch(()=>{});
  }
  V.ai=function(){
    const el=$('#v-ai');if(!el)return;
    const uid=CL.on&&CL.tok&&CL.me&&CL.me.id?String(CL.me.id):'';
    if(AI.uid!==uid){AI.uid=uid;AI.msgs=[];AI.loaded=!uid;AI.loading=false;}
    const load=!!uid&&!AI.loaded&&!AI.loading;if(load)AI.loading=true;
    el.innerHTML=`<div class="chat" id="aiChat"><div class="chh"><span class="cav lg"><img class="ai-logo" src="brand/ordela-mark.svg" alt="Ordela"></span><div class="cht"><b>Asisten Ordela</b><small><i class="cdot"></i>Siap membantu · jawaban dari data toko ini</small></div><button class="cclr" type="button" onclick="P2.aiClear()" aria-label="Hapus percakapan" title="Hapus percakapan">Hapus</button></div>
    <div class="clog" id="aiLog">${AI.loading?'<p class="hint">Memuat riwayat percakapan…</p>':AI.msgs.length?AI.msgs.map(aiBub).join(''):aiBub({t:'Halo! 👋 Saya asisten Ordela. Tanyakan penjualan, stok, jam ramai, atau cara memakai aplikasi. Saya hanya menampilkan data sesuai hak akses Anda.',ts:aiTm()})}</div>
    <div class="csg" id="aiSug">${AISUG.map(x=>`<button type="button" onclick="P2.aiAsk(this.textContent)">${x}</button>`).join('')}</div>
    <form class="cin" onsubmit="event.preventDefault();P2.aiSend();return false"><input id="aiIn" ${AI.loading?'disabled':''} placeholder="Tulis pertanyaan…" autocomplete="off" maxlength="200" enterkeyhint="send"><button class="csend" id="aiGo" ${AI.loading?'disabled':''} type="submit" aria-label="Kirim"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></button></form></div>`;
    aiScroll();if(load)aiHistoryLoad(uid);
  };
  P2.aiSend=function(){const i=$('#aiIn');if(!i)return;const v=i.value;i.value='';P2.aiAsk(v)};
  P2.aiAsk=async function(t){
    t=String(t||'').trim().slice(0,200);if(!t||AI.busy||AI.loading)return;
    const log=$('#aiLog');if(!log){return}
    if(!AI.msgs.length)log.innerHTML='';
    const add=m=>{m.ts=aiTm();AI.msgs.push(m);log.insertAdjacentHTML('beforeend',aiBub(m));aiScroll()};
    add({me:1,t});let a=null;try{a=aiAnswer(t)}catch(e){a='Maaf, terjadi kesalahan saat membaca data.'}
    if(a===null){AI.busy=1;const go=$('#aiGo');if(go)go.disabled=true;
      log.insertAdjacentHTML('beforeend','<div class="cr" id="aiTyp"><span class="cav"><img class="ai-logo" src="brand/ordela-mark.svg" alt="Ordela"></span><div class="cbw"><div class="cb typ"><i></i><i></i><i></i></div></div></div>');aiScroll();
      AI.why='';try{a=await aiCloud(t)}catch(e){AI.why='terjadi kesalahan saat menghubungi AI';a=null}finally{const ty=$('#aiTyp');if(ty)ty.remove();AI.busy=0;if($('#aiGo'))$('#aiGo').disabled=false}if(a===null)a='Maaf, aku belum berhasil menghubungi AI. Coba kirim lagi sebentar ya.'+(AI.why&&isOwner()?'<br><small style="opacity:.65">Detail: '+esc(AI.why)+'.</small>':'')}
    add({t:a});if(AI.msgs.length>60)AI.msgs.splice(0,AI.msgs.length-60);aiHistorySave();
    const i=$('#aiIn');if(i&&matchMedia('(hover:hover)').matches)i.focus();
  };
  P2.aiClear=function(){AI.msgs=[];if(AI.uid)aiHistoryRequest('history_clear').catch(()=>{});V.ai()};
  P2.aiAnswer=aiAnswer;P2.aiCtx=aiCtx;
})(window);
