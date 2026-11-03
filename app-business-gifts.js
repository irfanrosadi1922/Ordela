/* Business gift-card administration. POS redemption remains in pos2.js. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const live=a=>(a||[]).filter(x=>!x.del);
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const nowIso=()=>new Date().toISOString();
  const myName=()=>(CL.on&&CL.me)?CL.me.name:'Owner';
  const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
  const num=v=>Math.max(0,+v||0);
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
  const kc=(t,v,cls)=>'<div class="kc"><div class="kt"><span>'+t+'</span></div><div class="kv"><span class="'+(cls||'')+'">'+v+'</span></div></div>';
  const gcode=()=>{const c='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let r='GC-';for(let i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];return r};
  V.gift=function(){
    const el=$('#v-gift');if(!el)return;const l=live(db.gifts).sort((a,b)=>b.t<a.t?-1:1);const tot=l.reduce((a,g)=>a+(+g.bal||0),0);
    el.innerHTML=bar('<i class="ic" data-ic="gift"></i>Kartu Hadiah','<button class="btn sm" style="width:auto;margin:0" onclick="P2.giftForm()">+ Jual Kartu</button>')
    +`<div class="kp">${kc('Kartu aktif',l.filter(g=>g.bal>0).length)}${kc('Saldo belum terpakai',money(tot))}</div>
    <div class="panel"><h3>Daftar Kartu</h3>${l.length?l.map(g=>`<button class="li" onclick="P2.giftDetail('${g.id}')"><span class="l"><b>${esc(g.code)}</b><small>${esc(g.name||'Tanpa nama')} · ${esc(dstr(g.t))}</small></span><span class="r"><b>${money(g.bal)}</b><small>dari ${money(g.init)}</small></span></button>`).join(''):'<div class="mt">Belum ada kartu hadiah.</div>'}</div>`;
  };
  P2.giftForm=function(){
    openModal(`<h3>Jual Kartu Hadiah</h3><label class="fl">Kode kartu</label><input class="fi" id="gcC" value="${gcode()}" maxlength="20" autocapitalize="characters"><label class="fl">Nominal</label><input class="fi" id="gcA" type="number" min="0" step="any" inputmode="decimal"><label class="fl">Nama pemilik (opsional)</label><input class="fi" id="gcN" maxlength="40">
    <p class="hint" style="margin:6px 0">Uang diterima tunai: bila shift berjalan, otomatis dicatat sebagai kas masuk. Penjualan kartu bukan pendapatan; pendapatan dihitung saat kartu dipakai belanja.</p>
    <button class="btn" onclick="P2.giftSave()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  };
  P2.giftSave=function(){
    const c=($('#gcC').value||'').trim().toUpperCase(),a=num($('#gcA').value);if(!c||!a){toast('Isi kode dan nominal');return}
    if(live(db.gifts).some(g=>String(g.code).toUpperCase()===c)){toast('Kode sudah dipakai');return}
    const now=nowIso(),cur=shiftCur();
    db.gifts.unshift({id:'g'+uid(),code:c,name:($('#gcN').value||'').trim(),init:a,bal:a,t:now,by:myName(),hist:[{t:now,d:a,note:'Penjualan kartu'}],u:Date.now()});
    if(cur)db.exps.unshift({id:'e'+uid(),t:now,by:myName(),cat:'Kas masuk',amt:a,note:'Jual kartu hadiah '+c,src:'kas',dir:'in',sh:cur.id,u:Date.now()});
    save();closeModal();toast('Kartu hadiah dibuat');V.gift();
  };
  P2.giftDetail=function(id){
    const g=db.gifts.find(x=>x.id===id);if(!g)return;
    openModal(`<h3>${esc(g.code)}</h3><p class="hint" style="margin:0 0 6px">${esc(g.name||'Tanpa nama')} · saldo <b>${money(g.bal)}</b></p><table class="dl">${(g.hist||[]).map(h=>`<tr><td>${esc(dstr(h.t))}<br><small>${esc(h.note)}</small></td><td class="${h.d<0?'neg':'pos'}">${h.d<0?'−':'+'}${money(Math.abs(h.d))}</td></tr>`).join('')}</table>
    <label class="fl">Isi ulang saldo</label><input class="fi" id="gcT" type="number" min="0" step="any" inputmode="decimal" placeholder="Nominal"><button class="btn" onclick="P2.giftTop('${id}')">Isi Ulang</button>
    ${isOwner()?`<button class="btn sec" style="color:var(--bad)" onclick="P2.giftDel('${id}')">Hapus kartu</button>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
  };
  P2.giftTop=function(id){const g=db.gifts.find(x=>x.id===id),a=num($('#gcT').value);if(!g||!a)return;const now=nowIso(),cur=shiftCur();
    g.bal=rnd((+g.bal||0)+a);g.init=rnd((+g.init||0)+a);g.hist.unshift({t:now,d:a,note:'Isi ulang'});g.u=Date.now();
    if(cur)db.exps.unshift({id:'e'+uid(),t:now,by:myName(),cat:'Kas masuk',amt:a,note:'Isi ulang kartu '+g.code,src:'kas',dir:'in',sh:cur.id,u:Date.now()});
    save();closeModal();V.gift();toast('Saldo ditambah')};
  P2.giftDel=function(id){const g=db.gifts.find(x=>x.id===id);if(!g||!confirm('Hapus kartu '+g.code+'? Sisa saldo hilang.'))return;g.del=1;g.u=Date.now();save();closeModal();V.gift()};
  
  
})(window);
