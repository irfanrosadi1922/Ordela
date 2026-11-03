/* POS kitchen display: live tickets, station filters and ticket-state updates. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
  const live=a=>(a||[]).filter(x=>!x.del);
  const bar=(t,btn)=>'<div class="bar"><h2>'+t+'</h2>'+(btn||'')+'</div>';
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
  window.kdsSet=async function(src,id,st){
    if(src==='loc'){const k=db.kds.find(x=>x.id===id);if(k){k.st=st;k.u=Date.now();save()}V.kds();return}
    try{const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action:st===1?'cook':st===2?'ready':'unready'})});if(!r.ok)throw 0;
      const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}if(S.view==='kds')V.kds()}catch(e){toast('Gagal mengubah status')}
  };
  setInterval(()=>{if(!document.hidden&&S.view==='kds')V.kds()},20000);
})(window);
