/* Business stocktake page: barcode/manual counts, discrepancy review and application. */
(function (window) {
  'use strict';
  const P2=window.P2;
  const V=P2.views;
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
})(window);
