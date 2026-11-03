/* Business promo and voucher administration. POS discount calculation remains in app-core.js. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const live=a=>(a||[]).filter(x=>!x.del);
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const num=v=>Math.max(0,+v||0);
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
  const DAYS=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
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
})(window);
