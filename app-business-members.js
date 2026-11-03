/* Business member management and loyalty-account administration. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const live=a=>(a||[]).filter(x=>!x.del);
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const nowIso=()=>new Date().toISOString();
  const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
  const kc=(t,v,cls)=>'<div class="kc"><div class="kt"><span>'+t+'</span></div><div class="kv"><span class="'+(cls||'')+'">'+v+'</span></div></div>';
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
})(window);
