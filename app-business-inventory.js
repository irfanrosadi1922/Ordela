/* Business inventory stock-count import, review and adjustment feature. */
(function (window) {
  'use strict';
  /* ---------- stok opname: hitung fisik di Excel, unggah, tinjau selisih, terapkan ---------- */
  const OP={rows:[],skip:0,miss:[],bad:[],name:''};
  async function zipRead(buf){
    const dv=new DataView(buf),u=new Uint8Array(buf),td=new TextDecoder();let e=-1;
    for(let i=u.length-22;i>=Math.max(0,u.length-65558);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
    if(e<0)throw new Error('bukan file xlsx');
    const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const ent={};
    for(let k=0;k<n;k++){
      if(dv.getUint32(p,true)!==0x02014b50)break;
      const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
      ent[td.decode(u.subarray(p+46,p+46+nl))]={meth,csz,lo};p+=46+nl+el+cl;
    }
    return async name=>{
      const f=ent[name];if(!f)return null;
      const s0=f.lo+30+dv.getUint16(f.lo+26,true)+dv.getUint16(f.lo+28,true),raw=u.subarray(s0,s0+f.csz);
      if(f.meth===0)return td.decode(raw);
      if(typeof DecompressionStream==='undefined')throw new Error('browser belum mendukung baca xlsx, simpan sebagai CSV');
      return td.decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    };
  }
  async function xlsxRead(buf){
    const get=await zipRead(buf),P=t=>new DOMParser().parseFromString(t,'application/xml');
    const wb=await get('xl/workbook.xml'),rel=await get('xl/_rels/workbook.xml.rels');let path='xl/worksheets/sheet1.xml';
    if(wb&&rel){const sh=P(wb).getElementsByTagName('sheet')[0],rid=sh&&(sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));
      const r=[...P(rel).getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid);
      if(r){const t=r.getAttribute('Target');path=t[0]==='/'?t.slice(1):'xl/'+t}}
    const ss=await get('xl/sharedStrings.xml'),strs=ss?[...P(ss).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
    const sx=await get(path);if(!sx)throw new Error('lembar tidak ditemukan');
    return [...P(sx).getElementsByTagName('row')].map(r=>{const row=[];
      [...r.getElementsByTagName('c')].forEach(c=>{
        let ci=0;for(const ch of (c.getAttribute('r')||'A').replace(/\d+/g,''))ci=ci*26+ch.charCodeAt(0)-64;ci--;
        const t=c.getAttribute('t');let v;
        if(t==='inlineStr')v=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');
        else{const ve=c.getElementsByTagName('v')[0];v=ve?ve.textContent:'';if(t==='s')v=strs[+v]||'';else if(t!=='str'&&t!=='b'&&t!=='e'&&v!==''&&!isNaN(v))v=+v}
        row[ci]=v});
      return row});
  }
  function csvRead(t){
    t=t.replace(/^﻿/,'');const first=t.split(/\r?\n/)[0]||'',d=[';','\t',','].map(x=>[x,first.split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
    const rows=[];let r=[],c='',q=false;
    for(let i=0;i<t.length;i++){const ch=t[i];
      if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
      else if(ch==='"')q=true;else if(ch===d){r.push(c);c=''}
      else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';rows.push(r);r=[]}
      else c+=ch}
    if(c!==''||r.length){r.push(c);rows.push(r)}
    return rows;
  }
  function dlBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
  function opnTemplate(){
    const its=db.items.filter(i=>!isB(i));
    if(!its.length){toast('Belum ada item untuk dihitung');return}
    const rows=[['Kode','Nama','Kategori','Stok Sistem','Stok Fisik','Catatan']].concat(its.map(i=>[i.id,i.name,i.cat||'',+i.stock||0,'','']));
    dlBlob(OrdelaXlsx.build([{name:'Stok Opname',rows,head:1,w:[14,30,16,13,13,28]}],0),'stok-opname-'+dkey(new Date())+'.xlsx');
    toast('Template diunduh. Isi kolom Stok Fisik lalu unggah kembali.');
  }
  function opnOpen(){
    S.opnDone=null;
    openModal(`<h3>Stok Opname</h3>
    <p style="margin:0 0 12px;color:var(--mu);font-size:13px;line-height:1.55">Hitung stok fisik di Excel, lalu unggah hasilnya. Selisih ditinjau dulu sebelum stok diubah, dan setiap perubahan tercatat di Riwayat Perubahan Stok.</p>
    <div class="opn-step"><b>1</b><div><strong>Unduh template Excel</strong><small>Berisi semua item beserta stok sistem saat ini.</small></div></div>
    <button class="btn sec" type="button" onclick="opnTemplate()"><i class="ic" data-ic="download"></i>Unduh Template (.xlsx)</button>
    <div class="opn-step"><b>2</b><div><strong>Isi kolom “Stok Fisik”</strong><small>Kosongkan baris yang tidak dihitung, barisnya akan dilewati.</small></div></div>
    <div class="opn-step"><b>3</b><div><strong>Unggah file hasil hitung</strong><small>Format .xlsx atau .csv. Item dicocokkan lewat Kode, atau Nama bila kolom Kode dihapus.</small></div></div>
    <label class="btn" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">Pilih File Excel<input type="file" id="opnFile" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onchange="opnLoad(this)"></label>
    <button class="btn sec" type="button" onclick="closeModal()">Tutup</button>`);
  }
  async function opnLoad(inp){
    const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
    if(f.size>8e6){toast('File terlalu besar');return}
    let rows;
    try{
      const buf=await f.arrayBuffer();
      rows=(/\.csv$/i.test(f.name)||f.type==='text/csv')?csvRead(new TextDecoder().decode(buf)):await xlsxRead(buf);
    }catch(e){toast('File tidak bisa dibaca: '+(e&&e.message||'format salah'));return}
    const norm=x=>String(x==null?'':x).trim().toLowerCase();
    let hi=rows.findIndex(r=>r&&r.some(c=>/fisik/.test(norm(c))));
    if(hi<0){toast('Kolom “Stok Fisik” tidak ditemukan. Pakai template dari aplikasi.');return}
    const h=rows[hi].map(norm),col=re=>h.findIndex(x=>re.test(x));
    const cK=col(/^(kode|id|sku)$/),cN=col(/^(nama|name|item|menu)/),cF=col(/fisik/),cC=col(/catatan|keterangan|note/);
    if(cK<0&&cN<0){toast('Kolom Kode atau Nama tidak ditemukan');return}
    OP.rows=[];OP.miss=[];OP.bad=[];OP.skip=0;const seen=new Set();
    const byName=new Map();db.items.forEach(i=>{if(!isB(i)){const k=norm(i.name);if(!byName.has(k))byName.set(k,i)}});
    rows.slice(hi+1).forEach((r,ix)=>{
      if(!r)return;const raw=r[cF],label=norm(r[cN])?String(r[cN]).trim():String(r[cK]||'').trim()||('baris '+(hi+ix+2));
      if(raw===''||raw==null||norm(raw)==='')return OP.skip++;
      let it=cK>=0&&norm(r[cK])?db.items.find(i=>i.id===String(r[cK]).trim()):null;
      if(!it&&cN>=0)it=byName.get(norm(r[cN]));
      if(!it||isB(it))return OP.miss.push(label);
      const n=typeof raw==='number'?raw:parseFloat(String(raw).replace(',','.'));
      if(!isFinite(n)||n<0)return OP.bad.push(label+' ('+raw+')');
      if(seen.has(it.id)){OP.bad.push(label+' (dobel)');return}seen.add(it.id);
      const fis=Math.round(n*1000)/1000;OP.rows.push({id:it.id,name:it.name,fis,note:cC>=0?String(r[cC]==null?'':r[cC]).trim().slice(0,60):'',on:fis!==it.stock});
    });
    OP.name=f.name;opnReview();
  }
  function opnReview(){
    const emp=isStaffMode(),rs=OP.rows.map(r=>({r,i:find(r.id)})).filter(x=>x.i);
    const diff=rs.filter(x=>x.r.fis!==x.i.stock),same=rs.length-diff.length;
    const sel=diff.filter(x=>x.r.on),qty=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock),0),val=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock)*(+x.i.cost||0),0);
    const warn=(t,a)=>a.length?`<details class="opn-w"><summary>${t} (${a.length})</summary><div>${a.slice(0,50).map(esc).join('<br>')}${a.length>50?'<br>…':''}</div></details>`:'';
    openModal(`<h3>Tinjau Selisih</h3>
    <p style="margin:0 0 10px;color:var(--mu);font-size:12.5px">${esc(OP.name)} · ${rs.length} item terbaca · ${same} sama dengan sistem · ${OP.skip} baris kosong dilewati</p>
    ${diff.length?`<div class="tw opn-tw"><table class="opn-t"><thead><tr><th></th><th>Item</th><th class="num">Sistem</th><th class="num">Fisik</th><th class="num">Selisih</th></tr></thead><tbody>${diff.map(x=>{const d=x.r.fis-x.i.stock;
      return`<tr><td><input type="checkbox" ${x.r.on?'checked':''} onchange="OP.rows.find(q=>q.id==='${x.r.id}').on=this.checked;opnSum()" aria-label="Terapkan"></td><td><b>${esc(x.i.name)}</b>${x.r.note?`<small>${esc(x.r.note)}</small>`:''}</td><td class="num">${x.i.stock}</td><td class="num"><input class="fi opn-in" type="number" min="0" step="1" value="${x.r.fis}" oninput="opnEdit('${x.r.id}',this)"></td><td class="num"><span class="chgp ${d<0?'gd':'gu'}" id="opd_${x.r.id}">${d>0?'+':''}${d}</span></td></tr>`}).join('')}</tbody></table></div>
    <div class="opn-sum" id="opnSum"></div>
    <label class="fl" for="opnNote">Catatan opname (opsional)</label><input class="fi" id="opnNote" maxlength="40" placeholder="Mis. Opname akhir bulan">`
    :`<div class="empty" style="padding:22px 0">Tidak ada selisih. Stok fisik sama dengan stok sistem.</div>`}
    ${warn('Tidak ditemukan di inventori',OP.miss)}${warn('Angka tidak valid / dobel',OP.bad)}
    ${diff.length?`<button class="btn" id="opnGo" type="button" onclick="opnApply()">Terapkan Selisih</button>`:''}
    <button class="btn sec" type="button" onclick="${diff.length&&OP.name!=='Hitung langsung'?'opnOpen()':'closeModal()'}">${diff.length&&OP.name!=='Hitung langsung'?'Kembali':'Tutup'}</button>`);
    if(diff.length)opnSum();
  }
  function opnEdit(id,el){
    const r=OP.rows.find(q=>q.id===id),i=find(id);if(!r||!i)return;
    r.fis=Math.max(0,Math.round((+el.value||0)*1000)/1000);const d=r.fis-i.stock,e=$('#opd_'+id);
    if(e){e.textContent=(d>0?'+':'')+d;e.className='chgp '+(d<0?'gd':'gu')}
    opnSum();
  }
  function opnSum(){
    const emp=isStaffMode(),sel=OP.rows.map(r=>({r,i:find(r.id)})).filter(x=>x.i&&x.r.on&&x.r.fis!==x.i.stock);
    const q=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock),0),v=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock)*(+x.i.cost||0),0);
    const b=$('#opnSum');if(b)b.innerHTML=`<span><small>Item diubah</small><b>${sel.length}</b></span><span><small>Selisih total</small><b>${q>0?'+':''}${q}</b></span>${emp?'':`<span><small>Nilai selisih (modal)</small><b class="${v<0?'neg':''}">${v<0?'− ':''}${money(Math.abs(v))}</b></span>`}`;
    const g=$('#opnGo');if(g)g.disabled=!sel.length;
  }
  function opnApply(){
    const note=(($('#opnNote')||{}).value||'').trim(),tag='Stok opname '+new Date().toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+(note?' · '+note:'');
    const done=[];
    OP.rows.forEach(r=>{
      if(!r.on)return;const i=find(r.id);if(!i||isB(i)||i.stock===r.fis)return;
      const before=i.stock,d=r.fis-before;i.stock=r.fis;logAdd(i.name,d,tag+(r.note?' ('+r.note+')':''),r.fis);
      done.push([i.name,i.cat||'',before,r.fis,d,+i.cost||0,r.note]);
    });
    if(!done.length){closeModal();return}
    db.log=db.log.slice(0,LOG_MAX);save();renderInv();if(window.P2&&P2.opnReset)P2.opnReset();
    S.opnDone={rows:done,tag};
    const q=done.reduce((a,x)=>a+x[4],0);
    openModal(`<div class="lgo"><div class="lgi" style="background:var(--greenbg);color:var(--ok)"><i class="ic" data-ic="check"></i></div><h3>Stok opname selesai</h3>
    <p>${done.length} item disesuaikan (selisih total ${q>0?'+':''}${q}). Perubahan tercatat di Riwayat Perubahan Stok.</p>
    <button class="btn" type="button" onclick="opnReport()">Unduh Laporan Hasil (Excel)</button>
    <button class="btn sec" type="button" onclick="closeModal()">Selesai</button></div>`);
  }
  function opnReport(){
    const o=S.opnDone;if(!o)return;const emp=isStaffMode();
    const head=['Item','Kategori','Stok Sistem','Stok Fisik','Selisih'].concat(emp?[]:['Modal / unit','Nilai Selisih']).concat(['Catatan']);
    const rows=[head].concat(o.rows.map((x,k)=>{const n=k+2,r=[x[0],x[1],x[2],x[3],x[4]];if(!emp){r.push(x[5]);r.push({f:`E${n}*F${n}`,v:x[4]*x[5]})}r.push(x[6]);return r}));
    if(!emp){const n=o.rows.length+1;rows.push(['TOTAL','','','',{f:`SUM(E2:E${n})`,v:o.rows.reduce((a,x)=>a+x[4],0)},'',{f:`SUM(G2:G${n})`,v:o.rows.reduce((a,x)=>a+x[4]*x[5],0)},''])}
    dlBlob(OrdelaXlsx.build([{name:'Hasil Opname',rows,head:1,w:[30,16,13,13,11,13,15,26]}],dec()),'hasil-stok-opname-'+dkey(new Date())+'.xlsx');
  }
  window.OP = OP;
  Object.assign(window, {
    zipRead: zipRead,
    xlsxRead: xlsxRead,
    csvRead: csvRead,
    dlBlob: dlBlob,
    opnTemplate: opnTemplate,
    opnOpen: opnOpen,
    opnLoad: opnLoad,
    opnReview: opnReview,
    opnEdit: opnEdit,
    opnSum: opnSum,
    opnApply: opnApply,
    opnReport: opnReport
  });
})(window);
