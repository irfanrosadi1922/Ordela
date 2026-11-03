/* Business table reservation management. The table-status lookup remains shared with POS. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const live=a=>(a||[]).filter(x=>!x.del);
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const myName=()=>(CL.on&&CL.me)?CL.me.name:'Owner';
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
  const tkey=t=>String(t==null?'':t).trim().toUpperCase();
  const rsAct=()=>live(db.rsv).filter(r=>r.st==='res');
  V.rsv=function(){
    const el=$('#v-rsv');if(!el)return;const l=rsAct().sort((a,b)=>a.t<b.t?-1:1),past=live(db.rsv).filter(r=>r.st!=='res').sort((a,b)=>b.t<a.t?-1:1).slice(0,8);
    const tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':');
    const dy=t=>{const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?'Hari ini':d.toLocaleDateString(dloc(),{weekday:'short',day:'numeric',month:'short'})};
    const row=r=>`<div class="rsr"><span class="tm">${tm(r.t)}</span><span class="in"><b>${esc(r.name)}</b> · Meja ${esc(r.tbl||'-')}<small>${esc(dy(r.t))} · ${r.pax||1} orang${r.phone?' · '+esc(r.phone):''}${r.note?' · '+esc(r.note):''}</small></span>${r.st==='res'?`<span class="ac"><button class="go" onclick="P2.rsvSet('${r.id}','seated')">Datang</button><button onclick="P2.rsvSet('${r.id}','cancel')">Batal</button></span>`:`<small>${r.st==='seated'?'datang':'batal'}</small>`}</div>`;
    el.innerHTML=bar('<i class="ic" data-ic="cal"></i>Reservasi Meja','<button class="btn sm" style="width:auto;margin:0" onclick="P2.rsvForm()">+ Reservasi</button>')+(l.length?l.map(row).join(''):'<div class="panel"><div class="mt">Belum ada reservasi aktif.</div></div>')+(past.length?'<div class="mgh" style="margin:14px 2px 8px">Riwayat terakhir</div>'+past.map(row).join(''):'');
  };
  P2.rsvForm=function(){
    const d=new Date(Date.now()+36e5);const pad=n=>String(n).padStart(2,'0');const v=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':00';
    openModal(`<h3>Reservasi Meja</h3><label class="fl">Nama</label><input class="fi" id="rvN" maxlength="40"><div class="two"><div><label class="fl">No. meja</label><input class="fi" id="rvT" maxlength="12" inputmode="text" autocapitalize="characters"></div><div><label class="fl">Jumlah orang</label><input class="fi" id="rvP" type="number" min="1" value="2"></div></div>
    <label class="fl">Waktu</label><input class="fi" id="rvW" type="datetime-local" value="${v}"><label class="fl">No. HP (opsional)</label><input class="fi" id="rvH" inputmode="tel" maxlength="20"><label class="fl">Catatan (opsional)</label><input class="fi" id="rvC" maxlength="80">
    <button class="btn" onclick="P2.rsvSave()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  };
  P2.rsvSave=function(){
    const n=($('#rvN').value||'').trim(),t=($('#rvT').value||'').trim().slice(0,12),w=$('#rvW').value;if(!n||!t||!w){toast('Isi nama, meja, dan waktu');return}
    const at=new Date(w);if(isNaN(at)){toast('Waktu tidak valid');return}
    if(rsAct().some(r=>tkey(r.tbl)===tkey(t)&&Math.abs(new Date(r.t)-at)<2*36e5)){if(!confirm('Meja '+t+' sudah dipesan dalam rentang 2 jam. Tetap simpan?'))return}
    db.rsv.unshift({id:'v'+uid(),name:n,tbl:t,pax:Math.max(1,+$('#rvP').value||1),t:at.toISOString(),phone:$('#rvH').value.trim(),note:$('#rvC').value.trim(),st:'res',by:myName(),u:Date.now()});
    save();closeModal();toast('Reservasi disimpan');V.rsv();
  };
  P2.rsvSet=function(id,st){const r=db.rsv.find(x=>x.id===id);if(!r)return;r.st=st;r.u=Date.now();save();V.rsv();if(S.view==='table')renderTable()};
})(window);
