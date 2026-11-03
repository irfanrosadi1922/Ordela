/* Business Integration Center: provider connections, webhook URLs and test orders. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
  const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
  /* ================= INTEGRASI CENTER (online food) ================= */
  const IG={gofood:{n:'GoFood',d:'Pesanan dari GoFood masuk otomatis ke Pesanan & Layar Dapur.',c:'#00aa13',food:1,f:[['merchant','Merchant / Store ID dari GoBiz',0],['key','API key / Client secret (opsional)',1]]},
    grabfood:{n:'GrabFood',d:'Pesanan dari GrabFood masuk otomatis ke Pesanan & Layar Dapur.',c:'#00b14f',food:1,f:[['merchant','Merchant ID dari GrabMerchant',0],['key','API key / Client secret (opsional)',1]]},
    shopeefood:{n:'ShopeeFood',d:'Pesanan dari ShopeeFood masuk otomatis ke Pesanan & Layar Dapur.',c:'#ee4d2d',food:1,f:[['merchant','Merchant / Store ID',0],['key','API key / Partner key (opsional)',1]]},
    webhook:{n:'Webhook Keluar',d:'Kirim setiap transaksi/pesanan baru ke sistem Anda (JSON, ditandatangani HMAC-SHA256 bila Secret diisi).',c:'#0ea5e9',f:[['url','URL https',1],['secret','Secret tanda tangan (opsional)',1]]}};
  let IGL=null,IGERR='';
  const igUrl=t=>((window.POS_SB&&window.POS_SB.url)||'https://PROJECT.supabase.co')+'/functions/v1/food-hook?k='+t;
  V.integ=async function(){
    const el=$('#v-integ');if(!el)return;const H=bar('<i class="ic" data-ic="plug"></i>Integrasi Center');
    if(!(CL.on&&CL.me)){el.innerHTML=H+'<div class="panel"><p class="hint">Integrasi hanya tersedia dalam mode server (login akun). Masuk dulu untuk menyambungkan layanan.</p></div>';return}
    if(!IGL){el.innerHTML=H+'<div class="panel"><p class="hint">Memuat…</p></div>';
      try{const r=await api('/api/integrations');const j=await r.json();if(!r.ok)throw new Error(j.error||'');IGL=j.items;IGERR=''}catch(e){IGL=null;IGERR=e.message||'Gagal memuat';el.innerHTML=H+`<div class="panel"><p class="hint">${esc(IGERR)}</p><button class="btn sec" onclick="P2.igReload()">Coba lagi</button></div>`;return}}
    const by={};IGL.forEach(x=>by[x.kind]=x);
    const card=k=>{const m=IG[k],x=by[k];
      const st=!x?'Belum tersambung':!x.enabled?'Dijeda':m.food?(x.status==='aktif'?'Pesanan terakhir · '+esc(dstr(x.last_at)):'Menunggu pesanan pertama'):x.status==='gagal'?'Terakhir gagal':x.http&&x.http>=400?'Ditolak ('+x.http+')':x.status==='terkirim'?'Terkirim'+(x.last_at?' · '+esc(dstr(x.last_at)):''):'Tersambung';
      const bad=x&&(x.status==='gagal'||(x.http&&x.http>=400));
      return `<div class="igc"><div class="igh"><span class="igd" style="background:${m.c}"></span><b>${m.n}</b><span class="tag ${x?(bad?'neg':'pos'):''}">${st}</span></div><p class="hint">${m.d}</p>
      <div class="two">${x?`<button class="btn sm" onclick="P2.igForm('${k}')">Ubah</button>${m.food?`<button class="btn sm sec" onclick="P2.igHook('${k}')">URL penerima</button><button class="btn sm sec" style="grid-column:1/-1" onclick="P2.igTest('${k}')">Buat pesanan contoh</button>`:`<button class="btn sm sec" onclick="P2.igTest('${k}')">Kirim tes</button>`}`:`<button class="btn sm" style="grid-column:1/-1" onclick="P2.igForm('${k}')">Connect</button>`}</div></div>`};
    el.innerHTML=H+`<p class="hint" style="margin:0 0 10px">Sambungkan akun online food restoran ini. Pesanan yang masuk otomatis menjadi pesanan bertipe GoFood/GrabFood/ShopeeFood di halaman Pesanan dan Layar Dapur. Kunci disimpan terenkripsi di server dan tidak pernah ditampilkan lagi.</p>
    <div class="igg">${['gofood','grabfood','shopeefood'].map(card).join('')}</div>
    <div class="panel" style="margin-top:12px"><h3>Cara kerja</h3><p class="hint" style="margin:0">Setiap restoran punya <b>URL penerima</b> sendiri. Platform atau mitra integrasi Anda (aggregator, GoBiz/GrabMerchant partner, Zapier/Make/n8n) mengirim pesanan ke URL itu dengan POST JSON, misalnya <code>{"id":"GF-123","customer_name":"Budi","items":[{"name":"Nasi Goreng","qty":2,"price":25000}],"total":50000}</code>. Akses API resmi GoFood/GrabFood/ShopeeFood diberikan platform kepada mitra terdaftar; Ordela tidak menggantikan proses pendaftaran itu.</p></div>
    <h3 style="margin:14px 0 6px">Lanjutan</h3><div class="igg">${card('webhook')}</div>`;
  };
  P2.igForm=function(k){
    const m=IG[k],x=(IGL||[]).find(i=>i.kind===k),ev=x?x.events:['sale','order'];
    openModal(`<h3>${m.n}</h3><p class="hint" style="margin:0 0 6px">${m.d}</p>
    ${m.f.map(([n,l,sec])=>{const cur=x&&x.fields[n],set=sec&&cur&&cur.set;return `<label class="fl" for="ig_${n}">${l}</label><input class="fi" id="ig_${n}" autocomplete="off" autocapitalize="off" spellcheck="false" ${sec?'type="password"':''} value="${sec?'':esc((cur||'')+'')}" placeholder="${set?'Tersimpan — kosongkan untuk tetap memakai':''}">`}).join('')}
    ${m.food?'':`<label class="tgl"><input type="checkbox" id="ig_sale" ${ev.includes('sale')?'checked':''}><span>Transaksi baru</span></label><label class="tgl"><input type="checkbox" id="ig_order" ${ev.includes('order')?'checked':''}><span>Pesanan online</span></label>`}
    <label class="tgl"><input type="checkbox" id="ig_on" ${!x||x.enabled?'checked':''}><span>Aktif</span></label>
    <button class="btn" onclick="P2.igSave('${k}')">${x?'Simpan':'Sambungkan'}</button>${x?`<button class="btn sec" style="color:var(--bad)" onclick="P2.igDel('${k}')">Putuskan</button>`:''}<button class="btn sec" onclick="closeModal()">Batal</button>`);
  };
  async function igCall(path,body){const r=await api(path,{method:path==='/api/integrations'?'PUT':'POST',body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Gagal');IGL=j.items;return j}
  P2.igSave=async function(k){
    const m=IG[k],b={kind:k,enabled:$('#ig_on').checked,events:m.food?[]:['sale','order'].filter(e=>$('#ig_'+e).checked)};m.f.forEach(([n])=>b[n]=$('#ig_'+n).value.trim());
    try{const j=await igCall('/api/integrations',b);closeModal();toast('Tersimpan');V.integ();if(j.hook)P2.igShow(k,j.hook)}catch(e){toast(e.message)}
  };
  P2.igShow=function(k,t){const u=igUrl(t);openModal(`<h3>URL penerima ${IG[k].n}</h3><p class="hint" style="margin:0 0 6px">Salin dan simpan sekarang — token ini <b>hanya ditampilkan sekali</b>. Daftarkan URL ini di platform/mitra integrasi Anda sebagai tujuan pesanan (POST JSON).</p><textarea class="fi" id="igU" rows="3" readonly onfocus="this.select()">${esc(u)}</textarea>
    <button class="btn" onclick="P2.igCopy()">Salin URL</button><p class="hint" style="margin:6px 0">Fungsi penerima perlu di-deploy sekali di Supabase (<code>food-hook</code>, lihat panduan di repo). Tombol “Buat pesanan contoh” menguji alur tanpa platform.</p><button class="btn sec" onclick="closeModal()">Selesai</button>`)};
  P2.igCopy=function(){const e=$('#igU');e.select();try{navigator.clipboard.writeText(e.value);toast('URL disalin')}catch(x){document.execCommand('copy');toast('URL disalin')}};
  P2.igHook=function(k){openModal(`<h3>URL penerima ${IG[k].n}</h3><p class="hint" style="margin:0 0 8px">Demi keamanan, URL lama tidak bisa ditampilkan lagi. Buat token baru bila hilang — URL lama otomatis berhenti berlaku.</p><button class="btn" onclick="P2.igRegen('${k}')">Buat URL baru</button><button class="btn sec" onclick="closeModal()">Batal</button>`)};
  P2.igRegen=async function(k){try{const j=await igCall('/api/integrations/hook',{kind:k});closeModal();P2.igShow(k,j.hook);V.integ()}catch(e){toast(e.message)}};
  P2.igReload=function(){IGL=null;V.integ()};
  P2.igTest=async function(k){try{await igCall('/api/integrations/test',{kind:k});toast(IG[k].food?'Pesanan contoh dibuat — cek halaman Pesanan':'Tes terkirim');V.integ()}catch(e){toast(e.message)}};
  P2.igDel=async function(k){if(!confirm('Putuskan '+IG[k].n+'? Kredensial dan URL penerima dihapus.'))return;try{await igCall('/api/integrations/delete',{kind:k});closeModal();toast('Diputuskan');V.integ()}catch(e){toast(e.message)}};
})(window);
