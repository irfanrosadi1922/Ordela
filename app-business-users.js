/* Owner-only Business user administration, roles and audit log. */
(function (window) {
  'use strict';
  /* ----- halaman Pengguna (owner) ----- */
  const USR={list:[],log:[]};
  const ACT_LBL={'ubah-profil':'Ubah profil','ubah-payroll':'Ubah payroll','hapus-akun-sendiri':'Hapus akun sendiri','login':'Masuk','logout':'Keluar','login-gagal':'Gagal masuk','tambah-user':'Tambah pengguna','ubah-user':'Ubah pengguna','hapus-user':'Hapus pengguna','reset-sandi':'Reset sandi','ganti-sandi':'Ganti sandi','ditolak':'Perubahan ditolak','reset-owner':'Reset sandi owner'};
  function fmtLast(t){if(!t)return 'belum pernah masuk';const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')}
  async function renderUsr(){
    const el=$('#usrList');if(!el)return;
    try{
      const j=await (await api('/api/users')).json();USR.list=j.users||[];
      const a=await (await api('/api/audit')).json();USR.log=a.log||[];
    }catch(e){if(e.message!=='auth')el.innerHTML='<div class="empty">Gagal memuat pengguna</div>';return}
    const me=CL.me?CL.me.id:0;
    el.innerHTML=USR.list.map(u=>{const own=u.role==='owner',pr=own?[]:Object.keys(PERM_SHORT).filter(p=>u.perms.includes(p));
      return `<div class="coc usr ${u.active?'':'cancelled'}" style="border-left-color:${own?'var(--b)':'#d4d4d4'}">
      <div class="coh"><span class="av">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span><span class="cn">${esc(u.name)}</span><span class="ct">@${esc(u.username)}${u.id===me?' · Anda':''}</span><time>${esc(fmtLast(u.lastLogin))}</time></div>
      <div class="cof" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="pst ${own?'w':'ok'}">${esc(usrRoleLabel(u.role))}</span>${u.active?'':'<span class="pst">nonaktif</span>'}${u.single?'<span class="pst">1 perangkat</span>':''}
        ${own?'<span class="pchip on">Semua fitur</span>':pr.map(p=>`<span class="pchip on">${PERM_SHORT[p]}</span>`).join('')||'<span class="pchip">Tanpa izin</span>'}</div>
      <div class="cob"><button class="btn sec" onclick="usrForm(${u.id})"><i class="ic" data-ic="edit"></i>Ubah</button><button class="btn sec" onclick="usrPw(${u.id})"><i class="ic" data-ic="key"></i>Reset sandi</button>
        ${u.id!==me?`<button class="btn sec" onclick="usrToggle(${u.id})">${u.active?'<i class="ic" data-ic="pause"></i>Nonaktifkan':'<i class="ic" data-ic="play"></i>Aktifkan'}</button><button class="btn sec" onclick="usrDel(${u.id})"><i class="ic" data-ic="trash"></i>Hapus</button>`:''}</div></div>`}).join('')||'<div class="empty">Belum ada pengguna</div>';
    usrLogDraw();
  }
  const ULOG={sort:'new',act:'',user:'',page:0,size:5};
  function usrLogPage(p){ULOG.page=Math.max(0,p);usrLogDraw()}
  function usrLogDraw(){
    const bar=$('#usrLogBar'),el=$('#usrLog');if(!bar||!el)return;
    const acts=[...new Set(USR.log.map(x=>x.action))].sort((a,b)=>(ACT_LBL[a]||a).localeCompare(ACT_LBL[b]||b)),us=[...new Set(USR.log.map(x=>x.uname).filter(Boolean))].sort();
    bar.innerHTML=`<select class="logsel" aria-label="Urutkan" onchange="ULOG.sort=this.value;ULOG.page=0;usrLogDraw()">${[['new','Terbaru'],['old','Terlama'],['user','Pengguna A–Z'],['act','Aksi A–Z']].map(([v,t])=>`<option value="${v}" ${ULOG.sort===v?'selected':''}>${t}</option>`).join('')}</select>
    <select class="logsel" aria-label="Filter aksi" onchange="ULOG.act=this.value;ULOG.page=0;usrLogDraw()"><option value="">Semua aksi</option>${acts.map(a=>`<option value="${esc(a)}" ${ULOG.act===a?'selected':''}>${esc(ACT_LBL[a]||a)}</option>`).join('')}</select>
    <select class="logsel" aria-label="Filter pengguna" onchange="ULOG.user=this.value;ULOG.page=0;usrLogDraw()"><option value="">Semua pengguna</option>${us.map(u=>`<option value="${esc(u)}" ${ULOG.user===u?'selected':''}>@${esc(u)}</option>`).join('')}</select>`;
    let l=USR.log.filter(x=>(!ULOG.act||x.action===ULOG.act)&&(!ULOG.user||x.uname===ULOG.user));
    const tm=x=>String(x.t||''),nm=x=>String(x.uname||'').toLowerCase(),ac=x=>String(ACT_LBL[x.action]||x.action).toLowerCase();
    l=l.slice().sort(ULOG.sort==='old'?(a,b)=>tm(a)<tm(b)?-1:tm(a)>tm(b)?1:0:ULOG.sort==='user'?(a,b)=>nm(a)<nm(b)?-1:nm(a)>nm(b)?1:(tm(a)<tm(b)?1:-1):ULOG.sort==='act'?(a,b)=>ac(a)<ac(b)?-1:ac(a)>ac(b)?1:(tm(a)<tm(b)?1:-1):(a,b)=>tm(a)<tm(b)?1:tm(a)>tm(b)?-1:0);
    const pages=Math.max(1,Math.ceil(l.length/ULOG.size));ULOG.page=Math.min(ULOG.page,pages-1);const start=ULOG.page*ULOG.size;
    el.innerHTML=l.length?l.slice(start,start+ULOG.size).map(x=>`<div class="dbs"><span><b>${esc(ACT_LBL[x.action]||x.action)}</b>${x.uname?' · @'+esc(x.uname):''}${x.detail?' · <span style="color:var(--mu)">'+esc(x.detail)+'</span>':''}</span><span style="color:var(--mu);white-space:nowrap">${esc(fmtLast(x.t))}</span></div>`).join(''):'<div class="empty">Tidak ada aktivitas</div>';
    if(l.length)el.innerHTML+=`<div class="cob" style="align-items:center;justify-content:space-between;gap:8px;margin-top:10px"><span style="color:var(--mu);font-size:12px">${start+1}–${Math.min(start+ULOG.size,l.length)} dari ${l.length} aktivitas</span><span style="display:flex;gap:6px"><button class="btn sec sm" onclick="usrLogPage(${ULOG.page-1})" ${ULOG.page===0?'disabled':''}>Sebelumnya</button><button class="btn sec sm" onclick="usrLogPage(${ULOG.page+1})" ${ULOG.page>=pages-1?'disabled':''}>Berikutnya</button></span></div>`;
  }
  const permRow=(p,on,extra,cls)=>`<label class="tgl prm"><input type="checkbox" ${cls?'class="'+cls+'"':''} value="${p}" ${on?'checked':''} ${extra||''}><span><b>${PERM_LBL[p]}</b><small>${PERM_DESC[p]}</small></span></label>`;
  function permBoxes(sel){return Object.keys(PERM_LBL).map(p=>permRow(p,sel.includes(p),'','upm')).join('')}
  /* jabatan bawaan yang disembunyikan owner (per toko, db.set.hiddenRoles = array kunci). Owner dan Staf tidak bisa disembunyikan. */
  function jbHidden(){return Array.isArray(db.set.hiddenRoles)?db.set.hiddenRoles:[]}
  function usrRoleList(){const d=Array.isArray(db.set.staffRoles)?db.set.staffRoles:[],hid=jbHidden();return [...new Set(['Owner',...JB_BASE.filter(r=>jbKey(r)==='staff'||!hid.includes(jbKey(r))),...d].map(x=>String(x||'').trim()).filter(Boolean))].slice(0,30)}
  /* izin awal tiap jabatan bawaan; terisi otomatis saat jabatan dipilih, tetap bisa diubah per karyawan */
  const ROLE_PERMS={kasir:['pos','shift','mem','co','prn'],pelayan:['co'],koki:['co','kds'],barista:['pos','shift','mem','co','prn'],manajer:['pos','shift','co','kds','mem','inv','opn','buy','exp','hist','prn','set','att'],'admin gudang':['inv','opn','buy'],server:['co'],kitchen:['co','kds'],staff:['pos','shift','mem','co','prn'],staf:['pos','shift','mem','co','prn']};
  function rolePermsOf(k){const o=db.set.rolePerms&&db.set.rolePerms[k];return Array.isArray(o)?o:ROLE_PERMS[k]}
  /* panel Kelola Jabatan: tambah, ubah nama, hapus jabatan buatan sendiri, dan atur izin awal tiap jabatan (per toko) */
  const JB_BASE=['Kasir','Pelayan','Koki','Barista','Manajer','Admin Gudang','Server','Kitchen','Staf'];
  function jbKey(n){const k=usrRoleKey(n);return k==='staf'?'staff':k}
  function jbCount(k){return (USR.list||[]).filter(u=>usrRoleKey(u.role)===k).length}
  function jbOpen(msg,bad){
    if(!isOwner())return;
    const list=usrRoleList().filter(r=>usrRoleKey(r)!=='owner');
    openModal(`<h3>Jabatan</h3><p class="hint" style="margin:0 0 10px">Izin di jabatan dipakai sebagai izin awal saat jabatan dipilih untuk karyawan. Izin tiap karyawan tetap bisa diubah sendiri.</p>
    ${msg?`<p class="hint" style="${bad?'color:var(--bad)':'color:var(--ok)'}">${esc(msg)}</p>`:''}
    <div class="jbl">${list.map(r=>{const k=jbKey(r),pm=rolePermsOf(k)||['co'];return `<button type="button" class="jbr" onclick="jbEdit('${esc(k)}')"><span class="tx"><b>${esc(usrRoleLabel(r))}</b><small>${jbCount(k)} karyawan · ${pm.length} izin</small></span>${pfi('chev',18)}</button>`}).join('')}</div>
    <button class="btn" type="button" onclick="jbNew()">+ Jabatan Baru</button><button class="btn sec" type="button" onclick="closeModal()">Tutup</button>`);
  }
  function jbNew(msg){
    openModal(`<h3>Jabatan Baru</h3><label class="fl" for="jbNew">Nama jabatan</label><input class="fi" id="jbNew" maxlength="32" placeholder="Mis. Kepala Dapur" autocomplete="off">
    <p class="hint" id="jbMsg" style="min-height:16px;color:var(--bad)">${esc(msg||'')}</p><button class="btn" type="button" onclick="jbAdd()">Tambah</button><button class="btn sec" type="button" onclick="jbOpen()">Batal</button>`);
    const i=$('#jbNew');if(i)i.focus();
  }
  function jbEdit(k,msg){
    const r=usrRoleList().find(x=>jbKey(x)===k);if(!r)return jbOpen();
    const cus=usrRoleCustom().some(x=>usrRoleKey(x)===usrRoleKey(r)),pm=rolePermsOf(k)||['co'],n=jbCount(k),canDel=cus||(k!=='staff'&&JB_BASE.some(x=>jbKey(x)===k));
    openModal(`<h3>${esc(usrRoleLabel(r))}</h3><p class="hint" style="margin:0 0 6px">${n} karyawan memakai jabatan ini.${msg?' <b style="color:var(--ok)">'+esc(msg)+'</b>':''}</p>
    ${cus?`<label class="fl" for="jbRn">Nama jabatan</label><input class="fi" id="jbRn" maxlength="32" value="${esc(usrRoleLabel(r))}" onchange="jbRename('${esc(k)}',this.value)">`:''}
    <label class="fl">Izin awal</label><div class="prms">${Object.keys(PERM_LBL).map(pk=>permRow(pk,pm.includes(pk),`onchange="jbPerm('${esc(k)}','${pk}',this.checked)"`)).join('')}</div>
    ${canDel?`<button class="btn sec" type="button" style="color:var(--bad)" onclick="${cus?`jbDel('${esc(k)}')`:`jbHide('${esc(k)}')`}"><i class="ic" data-ic="trash"></i>Hapus jabatan</button>`:''}
    <button class="btn" type="button" onclick="jbOpen()">Selesai</button>`);
  }
  function jbCheck(v,except){
    v=(v||'').trim().replace(/\s+/g,' ');if(!v)return['Isi nama jabatan dulu'];if(v.length>32)return['Maksimal 32 karakter'];
    if(['owner','new'].includes(usrRoleKey(v)))return['Nama ini khusus sistem'];
    if(usrRoleList().some(x=>usrRoleKey(x)===usrRoleKey(v)&&usrRoleKey(x)!==except))return['Jabatan sudah ada'];
    return[null,v]}
  function jbAdd(){
    const raw=$('#jbNew').value,hidBase=JB_BASE.find(r=>jbKey(r)===jbKey(raw)&&jbHidden().includes(jbKey(r)));
    if(hidBase){db.set.hiddenRoles=jbHidden().filter(x=>x!==jbKey(hidBase));save();return jbEdit(jbKey(hidBase),'Jabatan ditambahkan kembali')}   // nama jabatan bawaan yang pernah dihapus = dipulihkan
    const [er,v]=jbCheck(raw);if(er)return jbNew(er);
    if(usrRoleList().length>=30)return jbNew('Maksimal 30 jabatan');
    db.set.staffRoles=[...usrRoleCustom(),v];db.set.rolePerms=Object.assign({},db.set.rolePerms,{[jbKey(v)]:['co']});save();jbEdit(jbKey(v),'Jabatan ditambahkan. Atur izinnya.');
  }
  function jbPerm(k,pk,on){
    const cur=(rolePermsOf(k)||['co']).filter(x=>x!==pk);if(on)cur.push(pk);
    db.set.rolePerms=Object.assign({},db.set.rolePerms,{[k]:Object.keys(PERM_LBL).filter(x=>cur.includes(x))});save();
  }
  async function jbRename(k,nv){
    const [er,v]=jbCheck(nv,k);if(er)return jbEdit(k,er);
    const nk=jbKey(v),users=(USR.list||[]).filter(u=>usrRoleKey(u.role)===k);
    try{for(const u of users){const r=await api('/api/users/'+u.id,{method:'PUT',body:JSON.stringify({role:nk})});if(!r.ok){const j=await r.json().catch(()=>({}));return jbOpen(j.error||'Gagal mengubah nama',true)}}}catch(e){return}
    db.set.staffRoles=usrRoleCustom().map(x=>usrRoleKey(x)===k?v:x);
    const rp=Object.assign({},db.set.rolePerms);if(rp[k]){rp[nk]=rp[k];if(nk!==k)delete rp[k]}db.set.rolePerms=rp;save();
    await renderUsr();jbEdit(nk,'Nama diubah'+(users.length?' ('+users.length+' karyawan ikut diperbarui)':''));
  }
  function jbHide(k){
    if(k==='staff'||k==='owner'||!JB_BASE.some(r=>jbKey(r)===k))return;
    const n=jbCount(k);db.set.hiddenRoles=[...new Set([...jbHidden(),k])];save();   // izin awal di rolePerms sengaja dibiarkan agar pulih sama
    jbOpen('Jabatan '+usrRoleLabel(k)+' dihapus dari daftar'+(n?' ('+n+' karyawan tetap memakainya)':''));
  }
  function jbRestore(k){db.set.hiddenRoles=jbHidden().filter(x=>x!==k);save();jbOpen('Jabatan '+usrRoleLabel(k)+' dipulihkan');}
  function jbRestoreAll(){const n=jbHidden().length;db.set.hiddenRoles=[];save();jbOpen(n+' jabatan dipulihkan');}
  function jbDel(k){
    const n=jbCount(k);
    db.set.staffRoles=usrRoleCustom().filter(x=>usrRoleKey(x)!==k);const rp=Object.assign({},db.set.rolePerms);delete rp[k];db.set.rolePerms=rp;save();
    jbOpen('Jabatan dihapus dari daftar'+(n?' ('+n+' karyawan tetap memakainya)':''));
  }
  function usrRolePick(){
    usrRoleSw();const k=usrRoleKey($('#uRole').value),pr=rolePermsOf(k);
    if(pr&&k!=='owner')document.querySelectorAll('.upm').forEach(x=>x.checked=pr.includes(x.value));
    usrRoleDelShow();
  }
  function usrRoleCustom(){return Array.isArray(db.set.staffRoles)?db.set.staffRoles:[]}
  function usrRoleDelShow(){const b=$('#uRoleDel');if(!b)return;const k=usrRoleKey($('#uRole').value);b.style.display=usrRoleCustom().some(x=>usrRoleKey(x)===k)?'':'none'}
  function usrRoleDel(){
    const k=usrRoleKey($('#uRole').value);if(!usrRoleCustom().some(x=>usrRoleKey(x)===k))return;
    db.set.staffRoles=usrRoleCustom().filter(x=>usrRoleKey(x)!==k);save();
    $('#uRole').innerHTML=usrRoleOptions('staff');usrRolePick();$('#uRoleErr').textContent='Jabatan dihapus dari daftar (karyawan lama tetap memakainya)';
  }
  
  function usrRoleOptions(selected){const L=usrRoleList();if(selected&&!L.some(r=>(usrRoleKey(r)==='staf'?'staff':usrRoleKey(r))===selected))L.push(selected);return L.map(r=>{const v=usrRoleKey(r)==='staf'?'staff':usrRoleKey(r);return `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(usrRoleLabel(r))}</option>`}).join('')}
  function usrAddRole(){const i=$('#uNewRole'),e=$('#uRoleErr'),v=(i.value||'').trim().replace(/\s+/g,' ');if(!v){e.textContent='Isi nama jabatan dulu';return}if(v.length>32){e.textContent='Maksimal 32 karakter';return}if(['owner','new'].includes(usrRoleKey(v))){e.textContent='Nama ini khusus sistem';return}const roles=usrRoleList();if(roles.some(x=>usrRoleKey(x)===usrRoleKey(v))){e.textContent='Jabatan sudah ada';return}if(roles.length>=30){e.textContent='Maksimal 30 jabatan';return}db.set.staffRoles=[...roles,v];save();const sel=$('#uRole');sel.innerHTML=usrRoleOptions(usrRoleKey(v));i.value='';e.textContent='Jabatan disimpan';usrRolePick()}
  
  function usrRoleSw(){const o=$('#uRole').value.trim().toLowerCase()==='owner';const sg=$('#uSingle');if(sg&&sg.dataset.t!=='1')sg.checked=!o;$('#uPerms').style.display=o?'none':''}
  function usrForm(id){
    const u=id?USR.list.find(x=>x.id===id):null;
    openModal(`<h3>${u?'Ubah Pengguna':'Tambah Pengguna'}</h3>
    <label class="fl">Nama</label><input class="fi" id="uName" maxlength="40" value="${esc(u?u.name:'')}" placeholder="mis. Siti">
    <label class="fl">Username (untuk login)</label><input class="fi" id="uUser" maxlength="24" value="${esc(u?u.username:'')}" ${u?'disabled':''} autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="huruf kecil/angka, mis. siti">
    ${u?'':`<label class="fl">Kata sandi awal</label><input class="fi" id="uPw" type="text" autocomplete="off" placeholder="minimal 6 karakter">`}
    <label class="fl" for="uRole">Jabatan</label>
    <select class="fi" id="uRole" onchange="usrRolePick()" ${u&&u.id===(CL.me||{}).id?'disabled':''}>${usrRoleOptions(u?usrRoleKey(u.role):'staff')}</select>
    <p class="hint" style="margin:6px 2px 0">Memilih jabatan mengisi izin di bawah secara otomatis. Atur jabatan lewat tombol Jabatan di halaman Pengguna.</p>
    <div id="uPerms"><label class="fl">Hak akses</label><div class="prms">${permBoxes(u?(u.perms||[]):['pos','co','prn'])}</div>
      <p class="hint" style="margin:6px 2px 0">Menu Pengguna, Payroll, dan Absensi &amp; Shift hanya untuk owner.</p></div>
    <label class="tgl prm" style="margin-top:10px"><input type="checkbox" id="uSingle" data-t="${u?'1':''}" ${u?(u.single?'checked':''):'checked'} onchange="this.dataset.t='1'"><span><b>Satu perangkat saja</b><small>Karyawan hanya bisa masuk di satu perangkat sekaligus.</small></span></label>
    <p class="hint" id="uErr" style="color:var(--bad);min-height:16px"></p>
    <button class="btn" onclick="usrSave(${id||0})">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
    usrRoleSw();usrRoleDelShow();
  }
  async function usrSave(id){
    const rawRole=$('#uRole').value.trim();const role=usrRoleKey(rawRole)==='owner'?'owner':usrRoleKey(rawRole)==='staf'?'staff':usrRoleKey(rawRole);const body={name:$('#uName').value.trim(),role,perms:[...document.querySelectorAll('.upm:checked')].map(x=>x.value),single:$('#uSingle').checked};
    if(!id){body.username=$('#uUser').value.trim().toLowerCase();body.password=$('#uPw').value}
    if(!body.name){$('#uErr').textContent='Nama wajib diisi';return}
    try{
      const r=await api(id?'/api/users/'+id:'/api/users',{method:id?'PUT':'POST',body:JSON.stringify(body)}),j=await r.json();
      if(!r.ok){$('#uErr').textContent=j.error||'Gagal menyimpan';return}
      closeModal();toast(id?'Pengguna diperbarui':'Pengguna ditambahkan');renderUsr();
    }catch(e){if(e.message!=='auth')$('#uErr').textContent='Tidak bisa terhubung ke server'}
  }
  function usrPw(id){
    const u=USR.list.find(x=>x.id===id);
    openModal(`<h3>Reset Sandi</h3><div class="hint">Pengguna <b>${esc(u.name)}</b> (@${esc(u.username)})</div>
    <label class="fl">Sandi baru</label><input class="fi" id="rPw" type="text" autocomplete="off" placeholder="minimal 6 karakter">
    <p class="hint" id="rErr" style="color:var(--bad);min-height:16px"></p>
    <button class="btn" onclick="usrPwSave(${id})">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  }
  async function usrPwSave(id){
    const pw=$('#rPw').value;if(pw.length<6){$('#rErr').textContent='Minimal 6 karakter';return}
    try{const r=await api('/api/users/'+id,{method:'PUT',body:JSON.stringify({password:pw})}),j=await r.json();if(!r.ok){$('#rErr').textContent=j.error||'Gagal';return}closeModal();toast('Sandi direset');renderUsr()}catch(e){if(e.message!=='auth')$('#rErr').textContent='Tidak bisa terhubung ke server'}
  }
  async function usrToggle(id){
    const u=USR.list.find(x=>x.id===id);if(!u)return;
    try{const r=await api('/api/users/'+id,{method:'PUT',body:JSON.stringify({active:!u.active})}),j=await r.json();if(!r.ok){toast(j.error||'Gagal');return}toast(u.active?'Akun dinonaktifkan':'Akun diaktifkan');renderUsr()}catch(e){}
  }
  function usrDel(id){
    const u=USR.list.find(x=>x.id===id);if(!u)return;
    ask('Hapus pengguna?','Akun "'+u.name+'" (@'+u.username+') dihapus permanen. Riwayat penjualan tidak terpengaruh.','Hapus',async()=>{
      try{const r=await api('/api/users/'+id,{method:'DELETE'}),j=await r.json();if(!r.ok){toast(j.error||'Gagal');return}toast('Pengguna dihapus');renderUsr()}catch(e){}
    });
  }
  window.USR = USR;
  window.ULOG = ULOG;
  Object.assign(window, {
    fmtLast: fmtLast,
    renderUsr: renderUsr,
    usrLogPage: usrLogPage,
    usrLogDraw: usrLogDraw,
    permBoxes: permBoxes,
    jbHidden: jbHidden,
    usrRoleList: usrRoleList,
    rolePermsOf: rolePermsOf,
    jbKey: jbKey,
    jbCount: jbCount,
    jbOpen: jbOpen,
    jbNew: jbNew,
    jbEdit: jbEdit,
    jbCheck: jbCheck,
    jbAdd: jbAdd,
    jbPerm: jbPerm,
    jbRename: jbRename,
    jbHide: jbHide,
    jbRestore: jbRestore,
    jbRestoreAll: jbRestoreAll,
    jbDel: jbDel,
    usrRolePick: usrRolePick,
    usrRoleCustom: usrRoleCustom,
    usrRoleDelShow: usrRoleDelShow,
    usrRoleDel: usrRoleDel,
    usrRoleOptions: usrRoleOptions,
    usrAddRole: usrAddRole,
    usrRoleSw: usrRoleSw,
    usrForm: usrForm,
    usrSave: usrSave,
    usrPw: usrPw,
    usrPwSave: usrPwSave,
    usrToggle: usrToggle,
    usrDel: usrDel
  });
})(window);
