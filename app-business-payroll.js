/* Owner-only Business payroll and attendance reporting feature. */
(function (window) {
  'use strict';
  /* ---------- Payroll (khusus owner): gaji karyawan + rekap absensi. Data disimpan di server (/api/payroll), tidak ikut data yang disinkron ke karyawan ---------- */
  const PY={d:null,mail:false,users:[],tab:'gaji',month:'',rows:[],rowsKey:'',built:false,busy:0,err:'',who:''};
  const PY_TYPES=[['monthly','Bulanan (gaji tetap)'],['daily','Harian (× hari hadir)'],['hourly','Per jam (× jam kerja)']];
  const PY_TLBL={monthly:'Bulanan',daily:'Harian',hourly:'Per jam'};
  const pyNorm=j=>{j=j&&typeof j==='object'?j:{};const o=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};return{rev:+j.rev||0,cfg:{lateRate:0,workDays:26,...o(j.cfg)},emp:o(j.emp),runs:o(j.runs)}};
  function pyMonthNow(){const t=(typeof ATT!=='undefined'&&ATT.today)||dkey(new Date());return t.slice(0,7)}
  function pyRange(m){const [y,mo]=m.split('-').map(Number),last=new Date(Date.UTC(y,mo,0)).getUTCDate();return[m+'-01',m+'-'+String(last).padStart(2,'0')]}
  function pyMonthLbl(m){try{const [y,mo]=m.split('-').map(Number);return new Date(Date.UTC(y,mo-1,1)).toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'UTC'})}catch(e){return m}}
  async function pyLoad(){
    PY.err='';
    try{
      const [r,u]=await Promise.all([api('/api/payroll'),api('/api/users')]);
      const j=await r.json(),uj=await u.json();
      if(!r.ok){PY.err=j.error||'Gagal memuat payroll';return}
      PY.d=pyNorm(j);PY.mail=!!j.mail;PY.users=(uj.users||[]).filter(x=>x.role!=='owner');
    }catch(e){if(e.message!=='auth')PY.err='Tidak bisa terhubung ke server'}
  }
  async function pySave(){
    if(!PY.d)return false;
    try{
      const r=await api('/api/payroll',{method:'PUT',body:JSON.stringify(PY.d)}),j=await r.json();
      if(r.status===409){toast('Data payroll berubah di perangkat lain. Dimuat ulang, coba lagi.');PY.d=pyNorm(j.current||j);return false}
      if(!r.ok){toast(j.error||'Gagal menyimpan payroll');return false}
      PY.d=pyNorm(j);return true;
    }catch(e){if(e.message!=='auth')toast('Tidak bisa terhubung ke server');return false}
  }
  async function pyAttLoad(from,to){
    const k=from+'|'+to;if(PY.rowsKey===k)return;
    const r=await api('/api/att?from='+from+'&to='+to),j=await r.json();
    if(!r.ok)throw new Error(j.error||'Gagal mengambil data absensi');
    if(j.tz)ATT.tz=j.tz;PY.rows=j.rows||[];PY.rowsKey=k;
  }
  /* pasangkan masuk → pulang per karyawan */
  function attPair(rows){
    rows=rows.slice().sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);const open={},days=[];
    rows.forEach(r=>{
      if(r.type==='in'){const d={day:r.day,name:r.name,uname:r.uname,shift:r.shift||'',sched:r.shift?r.sstart+'–'+r.send:'',in:r,out:null};open[r.uname]=d;days.push(d)}
      else{const d=open[r.uname];if(d&&!d.out){d.out=r;delete open[r.uname]}else days.push({day:r.day,name:r.name,uname:r.uname,shift:r.shift||'',sched:r.shift?r.sstart+'–'+r.send:'',in:null,out:r})}
    });
    return days.sort((a,b)=>a.day<b.day?-1:a.day>b.day?1:a.name<b.name?-1:a.name>b.name?1:0);
  }
  function attSumm(days){
    const by={};
    days.forEach(d=>{const k=d.uname,e=by[k]=by[k]||{name:d.name,n:0,ot:0,late:0,lm:0,early:0,ns:0,work:0,set:new Set()};
      if(d.in){if(!e.set.has(d.day)){e.set.add(d.day);e.n++}if(d.in.status==='late'){e.late++;e.lm+=+d.in.mins||0}else if(d.in.status==='ontime')e.ot++;else e.ns++}
      if(d.out&&d.out.status==='early')e.early++;
      if(d.in&&d.out)e.work+=Math.max(0,Math.round((new Date(d.out.t)-new Date(d.in.t))/60000))});
    return by;
  }
  function pyCalc(e,s,adj){
    const cfg=PY.d.cfg;e=e||{};s=s||{n:0,late:0,lm:0,early:0,work:0};adj=adj||{};
    const type=e.type||'monthly',base=+e.base||0,days=s.n,wd=Math.max(1,+cfg.workDays||26);
    const basic=type==='monthly'?base:type==='daily'?base*days:base*s.work/60;
    const meal=(+e.meal||0)*days,allow=+e.allow||0,bonus=+adj.bonus||0,other=+adj.other||0;
    const late=(+cfg.lateRate||0)*s.lm,abs=type==='monthly'&&e.cutAbsent?Math.max(0,wd-days):0,absAmt=abs?base/wd*abs:0;
    const gross=basic+meal+allow+bonus,ded=late+absAmt+other;
    return{type,days,work:s.work,lateN:s.late,lateMin:s.lm,basic:rnd(basic),meal:rnd(meal),allow:rnd(allow),bonus:rnd(bonus),gross:rnd(gross),late:rnd(late),abs,absAmt:rnd(absAmt),other:rnd(other),ded:rnd(ded),net:Math.max(0,rnd(gross-ded)),set:!!(e.base||e.meal||e.allow)};
  }
  function pyRun(m){const r=PY.d.runs[m]=PY.d.runs[m]||{items:{}};r.items=r.items||{};return r}
  function pyItem(m,u){const r=PY.d.runs[m];return(r&&r.items&&r.items[u])||{}}
  function pyRowFor(m,u){
    const it=pyItem(m,u);
    if(it.paid&&it.snap)return{...it.snap,paid:1,paidAt:it.paidAt,note:it.note||''};
    const by=attSumm(attPair(PY.rows));
    return{...pyCalc(PY.d.emp[u],by[u],it),paid:0,note:it.note||''};
  }
  async function pyRender(force){
    const box=$('#pyrBox');if(!box)return;
    if(!force&&PY.built&&$('#pyBody'))return;
    PY.built=true;
    if(!PY.d){box.innerHTML='<div class="empty">Memuat payroll…</div>';await pyLoad();
      if(!PY.d){box.innerHTML=`<div class="empty">${esc(PY.err||'Payroll tidak tersedia')}<br><button class="btn sm" style="width:auto;margin-top:10px" onclick="PY.built=false;pyRender(true)">Coba lagi</button></div>`;return}}
    if(!PY.month)PY.month=pyMonthNow();
    box.innerHTML=`<div class="chips" id="pyTabs">${[['gaji','Gaji'],['kar','Karyawan'],['absen','Rekap Absensi']].map(([k,l])=>`<button type="button" class="chip ${PY.tab===k?'on':''}" onclick="PY.tab='${k}';pyRender(true)">${l}</button>`).join('')}</div><div id="pyBody"></div>`;
    const b=$('#pyBody');
    try{
      if(PY.tab==='gaji')await pyGaji(b);else if(PY.tab==='kar')pyKar(b);else await pyAbsen(b);
    }catch(e){b.innerHTML=`<div class="empty">${esc(e.message||'Gagal memuat')}</div>`}
  }
  /* ----- tab Gaji ----- */
  async function pyGaji(b){
    const [from,to]=pyRange(PY.month);
    b.innerHTML='<div class="empty">Memuat absensi…</div>';await pyAttLoad(from,to);
    const rows=PY.users.map(u=>({u,r:pyRowFor(PY.month,u.username)}));
    const tot=rows.reduce((a,x)=>a+x.r.net,0),paid=rows.filter(x=>x.r.paid).reduce((a,x)=>a+x.r.net,0);
    const attOn=!!attC().on;
    b.innerHTML=`<div class="panel pyw"><div class="pyhd"><div class="pyper">
      <label class="fl" for="pyMonth">Periode gaji</label><input class="fi" type="month" id="pyMonth" value="${esc(PY.month)}" onchange="if(this.value){PY.month=this.value;pyRender(true)}"></div>
      <div class="opn-sum" style="margin-top:12px"><span><small>Total gaji bersih</small><b>${money(tot)}</b></span><span><small>Sudah dibayar</small><b>${money(paid)}</b></span><span><small>Belum dibayar</small><b>${money(tot-paid)}</b></span></div></div>
      ${attOn?'':'<p class="pfhint">Absensi belum aktif, jadi hari hadir tercatat 0. Aktifkan di Pengaturan → Absensi &amp; Shift, atau isi penyesuaian manual.</p>'}
      ${PY.users.length?'':'<div class="empty">Belum ada karyawan. Tambahkan di menu Pengguna.</div>'}
      <div class="pyg">${rows.map(({u,r})=>`<button type="button" class="pyc" onclick="pySlip('${esc(u.username)}')"><span class="av">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span><span class="tx"><b>${esc(u.name)}</b><small>${r.set?esc(PY_TLBL[r.type])+' · '+r.days+' hari hadir'+(r.lateMin?' · telat '+r.lateMin+' mnt':''):'Gaji belum diatur'}</small></span><span class="rt"><b>${money(r.net)}</b><span class="pst ${r.paid?'ok':'w'}">${r.paid?'Dibayar':'Belum'}</span>${pyItem(PY.month,u.username).mailAt?'<small>✉ terkirim</small>':''}</span></button>`).join('')}</div>
      <div class="pyac">${PY.users.length?`<button class="btn" type="button" onclick="pyXlsx()"><i class="ic" data-ic="download"></i>Unduh Payroll (Excel)</button>`:''}
      ${rows.some(x=>x.r.paid)?`<button class="btn sec" type="button" onclick="pyMailAll()">Kirim Semua Slip ke Email</button>`:''}</div>
    </div>`;
  }
  function pySlip(un){
    const u=PY.users.find(x=>x.username===un);if(!u)return;
    const it=pyItem(PY.month,un),r=pyRowFor(PY.month,un),paid=!!r.paid;
    const dis=paid?'disabled':'';
    openModal(`<h3>Slip Gaji</h3><p style="margin:0 0 10px;color:var(--mu);font-size:13px">${esc(u.name)} · ${esc(pyMonthLbl(PY.month))}</p>
    <div id="pySlipB"></div>
    <div class="two"><div><label class="fl" for="pyBonus">Bonus / lembur</label><input class="fi" id="pyBonus" type="number" inputmode="decimal" min="0" step="any" value="${+it.bonus||''}" placeholder="0" ${dis} oninput="pySlipUpd('${esc(un)}')"></div>
    <div><label class="fl" for="pyOther">Potongan lain / kasbon</label><input class="fi" id="pyOther" type="number" inputmode="decimal" min="0" step="any" value="${+it.other||''}" placeholder="0" ${dis} oninput="pySlipUpd('${esc(un)}')"></div></div>
    <label class="fl" for="pyNote">Catatan</label><input class="fi" id="pyNote" maxlength="80" value="${esc(it.note||'')}" ${dis} placeholder="Opsional">
    ${paid?`<p class="pfhint">Dibayar ${esc(it.paidAt?new Date(it.paidAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'')}. Buka lagi untuk mengubah.</p>`:''}
    ${paid?`<p class="pfhint">${u.email?'Email: '+esc(u.email)+(it.mailAt?' · terkirim '+esc(new Date(it.mailAt).toLocaleDateString('id-ID',{day:'numeric',month:'short'})):''):'Karyawan ini belum punya email (diisi sendiri di Akun → Edit Profil), slip belum bisa dikirim.'}</p>${u.email?`<button class="btn" type="button" onclick="pyMail('${esc(un)}')"><i class="ic" data-ic="note"></i>${it.mailAt?'Kirim Ulang Slip ke Email':'Kirim Slip ke Email'}</button>`:''}<button class="btn sec" type="button" onclick="pyPaid('${esc(un)}',0)">Buka Lagi (batalkan status dibayar)</button>`
     :`<button class="btn sec" type="button" onclick="pySlipSave('${esc(un)}',0)">Simpan Penyesuaian</button><button class="btn" type="button" onclick="pySlipSave('${esc(un)}',1)">Simpan &amp; Tandai Dibayar</button>`}
    <button class="btn sec" type="button" onclick="closeModal()">Tutup</button>`);
    pySlipUpd(un);
  }
  function pySlipUpd(un){
    const b=$('#pySlipB');if(!b)return;const m=PY.month,it=pyItem(m,un);
    let r;
    if(it.paid&&it.snap)r={...it.snap};
    else{const by=attSumm(attPair(PY.rows));r=pyCalc(PY.d.emp[un],by[un],{bonus:+($('#pyBonus')||{}).value||0,other:+($('#pyOther')||{}).value||0})}
    const e=PY.d.emp[un]||{},ln=(t,v,sub,neg)=>v||sub?`<div class="pyl"><span>${t}${sub?`<small>${sub}</small>`:''}</span><b class="${neg?'neg':''}">${neg&&v?'− ':''}${money(v)}</b></div>`:'';
    b.innerHTML=`<div class="pyslip">
     ${ln('Gaji pokok ('+esc(PY_TLBL[r.type])+')',r.basic,r.type==='daily'?r.days+' hari × '+money(+e.base||0):r.type==='hourly'?attMn(r.work)+' × '+money(+e.base||0)+'/jam':'')}
     ${ln('Uang makan / transport',r.meal,(+e.meal?r.days+' hari × '+money(+e.meal):''))}
     ${ln('Tunjangan tetap',r.allow)}${ln('Bonus / lembur',r.bonus)}
     <div class="pyl tot"><span>Total pendapatan</span><b>${money(r.gross)}</b></div>
     ${ln('Potongan terlambat',r.late,r.lateMin?r.lateMin+' mnt × '+money(+PY.d.cfg.lateRate||0):'',1)}
     ${ln('Potongan tidak hadir',r.absAmt,r.abs?r.abs+' hari':'',1)}${ln('Potongan lain / kasbon',r.other,'',1)}
     <div class="pyl tot"><span>Total potongan</span><b class="neg">${r.ded?'− ':''}${money(r.ded)}</b></div>
     <div class="pyl net"><span>Gaji bersih</span><b>${money(r.net)}</b></div>
     <small class="pfhint">Hadir ${r.days} hari${r.lateN?' · terlambat '+r.lateN+'×':''} · jam kerja ${esc(attMn(r.work)||'0 mnt')}</small></div>`;
  }
  async function pySlipSave(un,paid){
    const m=PY.month,run=pyRun(m),it=run.items[un]=run.items[un]||{};
    it.bonus=Math.max(0,+($('#pyBonus')||{}).value||0);it.other=Math.max(0,+($('#pyOther')||{}).value||0);it.note=(($('#pyNote')||{}).value||'').trim().slice(0,80);
    if(paid){const by=attSumm(attPair(PY.rows));it.snap=pyCalc(PY.d.emp[un],by[un],it);it.paid=1;it.paidAt=new Date().toISOString()}
    if(await pySave()){closeModal();toast(paid?'Ditandai dibayar':'Penyesuaian disimpan');
      if(paid&&PY.d.cfg.autoMail){const u=PY.users.find(x=>x.username===un);if(u&&u.email)await pyMail(un,1);else if(u)toast('Ditandai dibayar. Slip tidak dikirim: karyawan belum punya email.')}
      pyRender(true)}
    else{await pyLoad();pyRender(true)}
  }
  async function pyPaid(un,v){
    const it=pyRun(PY.month).items[un];if(it){delete it.paid;delete it.snap;delete it.paidAt}
    if(await pySave()){closeModal();toast('Status dibayar dibatalkan')}
    pyRender(true);
  }
  async function pyMail(un,quiet){
    if(!PY.mail){toast('Email slip belum diaktifkan di server. Lihat README (pos.admin_mail).');return false}
    try{
      const r=await api('/api/payroll/slip',{method:'POST',body:JSON.stringify({username:un,month:PY.month})}),j=await r.json();
      if(!r.ok){toast(j.error||'Gagal mengirim slip');return false}
      await pyLoad();if(!quiet)toast('Slip dikirim ke '+(j.to||'email karyawan'));else toast('Dibayar & slip dikirim ke email');
      if(!quiet)pyRender(true);return true;
    }catch(e){if(e.message!=='auth')toast('Tidak bisa terhubung ke server');return false}
  }
  async function pyMailAll(){
    if(!PY.mail){toast('Email slip belum diaktifkan di server. Lihat README (pos.admin_mail).');return}
    const todo=PY.users.filter(u=>pyItem(PY.month,u.username).paid&&u.email),skip=PY.users.filter(u=>pyItem(PY.month,u.username).paid&&!u.email).length;
    if(!todo.length){toast('Tidak ada slip dibayar yang punya email tujuan');return}
    ask('Kirim semua slip?',todo.length+' slip periode '+pyMonthLbl(PY.month)+' akan dikirim ke email karyawan'+(skip?' ('+skip+' karyawan tanpa email dilewati)':'')+'.','Kirim',async()=>{
      let ok=0;for(const u of todo){const r=await api('/api/payroll/slip',{method:'POST',body:JSON.stringify({username:u.username,month:PY.month})}).catch(()=>null);if(r&&r.ok)ok++}
      await pyLoad();toast(ok+' dari '+todo.length+' slip terkirim');pyRender(true)});
  }
  /* ----- tab Karyawan: pengaturan gaji ----- */
  function pyKar(b){
    const c=PY.d.cfg;
    b.innerHTML=`<div class="pyk"><div class="panel"><h3>Aturan umum</h3>
     <div class="two"><div><label class="fl" for="pyLate">Potongan terlambat (per menit)</label><input class="fi" id="pyLate" type="number" inputmode="decimal" min="0" step="any" value="${+c.lateRate||''}" placeholder="0"></div>
     <div><label class="fl" for="pyWd">Hari kerja per bulan</label><input class="fi" id="pyWd" type="number" inputmode="numeric" min="1" max="31" value="${+c.workDays||26}"></div></div>
     <p class="pfhint">Hari kerja dipakai untuk menghitung potongan tidak hadir pada gaji bulanan (gaji ÷ hari kerja per hari).</p>
     <label class="tgl"><input type="checkbox" id="pyAuto" ${c.autoMail?'checked':''}><span>Kirim slip ke email karyawan otomatis saat ditandai dibayar</span></label>
     ${PY.mail?'':'<p class="pfhint" style="color:var(--bad)">Pengiriman email belum diaktifkan di server (jalankan pos.admin_mail di SQL Editor, lihat README).</p>'}
     <button class="btn sec" type="button" onclick="pyCfgSave()">Simpan Aturan</button></div>
    <div class="panel"><h3>Gaji karyawan</h3><div class="pyg">${PY.users.length?PY.users.map(u=>{const e=PY.d.emp[u.username]||{};
     return`<button type="button" class="pyc" onclick="pyEmp('${esc(u.username)}')"><span class="av">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span><span class="tx"><b>${esc(u.name)}${u.active?'':' (nonaktif)'}</b><small>${e.base?esc(PY_TLBL[e.type||'monthly'])+' · '+money(+e.base)+({monthly:'/bulan',daily:'/hari',hourly:'/jam'})[e.type||'monthly']:'Belum diatur'}${u.email?'':' · tanpa email'}</small></span><span class="rt">${pfi('chev',18)}</span></button>`}).join(''):'<div class="empty">Belum ada karyawan. Tambahkan di menu Pengguna.</div>'}</div></div></div>`;
  }
  async function pyCfgSave(){
    PY.d.cfg.lateRate=Math.max(0,+$('#pyLate').value||0);PY.d.cfg.workDays=Math.max(1,Math.min(31,Math.round(+$('#pyWd').value||26)));PY.d.cfg.autoMail=$('#pyAuto').checked;
    if(await pySave())toast('Aturan payroll disimpan');pyRender(true);
  }
  function pyEmp(un){
    const u=PY.users.find(x=>x.username===un);if(!u)return;const e=PY.d.emp[un]||{type:'monthly'};
    openModal(`<h3>Gaji ${esc(u.name)}</h3>
    <label class="fl" for="peT">Jenis gaji</label><select class="fi" id="peT" onchange="pyEmpHint()">${PY_TYPES.map(([k,l])=>`<option value="${k}" ${(e.type||'monthly')===k?'selected':''}>${l}</option>`).join('')}</select>
    <label class="fl" for="peB" id="peBL">Nominal</label><input class="fi" id="peB" type="number" inputmode="decimal" min="0" step="any" value="${+e.base||''}" placeholder="0">
    <div class="two"><div><label class="fl" for="peM">Uang makan/transport per hari hadir</label><input class="fi" id="peM" type="number" inputmode="decimal" min="0" step="any" value="${+e.meal||''}" placeholder="0"></div>
    <div><label class="fl" for="peA">Tunjangan tetap per bulan</label><input class="fi" id="peA" type="number" inputmode="decimal" min="0" step="any" value="${+e.allow||''}" placeholder="0"></div></div>
    <label class="tgl" id="peCW"><input type="checkbox" id="peC" ${e.cutAbsent?'checked':''}><span>Potong gaji bila tidak hadir (gaji bulanan)</span></label>
    <button class="btn" type="button" onclick="pyEmpSave('${esc(un)}')">Simpan</button><button class="btn sec" type="button" onclick="closeModal()">Batal</button>`);
    pyEmpHint();
  }
  function pyEmpHint(){const t=$('#peT').value,l=$('#peBL');if(l)l.textContent=t==='monthly'?'Gaji pokok per bulan':t==='daily'?'Upah per hari hadir':'Upah per jam kerja';const w=$('#peCW');if(w)w.style.display=t==='monthly'?'':'none'}
  async function pyEmpSave(un){
    PY.d.emp[un]={type:$('#peT').value,base:Math.max(0,+$('#peB').value||0),meal:Math.max(0,+$('#peM').value||0),allow:Math.max(0,+$('#peA').value||0),cutAbsent:$('#peT').value==='monthly'&&$('#peC').checked};
    if(await pySave()){closeModal();toast('Gaji karyawan disimpan')}
    pyRender(true);
  }
  /* ----- tab Rekap Absensi ----- */
  async function pyAbsen(b){
    const t=ATT.today||dkey(new Date());if(!ATT.xf)ATT.xf=t.slice(0,8)+'01';if(!ATT.xt)ATT.xt=t;
    let by={},days=[],msg='';
    if(/^\d{4}-\d{2}-\d{2}$/.test(ATT.xf)&&/^\d{4}-\d{2}-\d{2}$/.test(ATT.xt)&&ATT.xf<=ATT.xt){
      await pyAttLoad(ATT.xf,ATT.xt);days=attPair(PY.rows);by=attSumm(days)}
    else msg='Rentang tanggal tidak valid';
    const ks=Object.keys(by).sort((a,c)=>by[a].name<by[c].name?-1:1);
    b.innerHTML=`<div class="pya"><div class="panel"><h3>Rekap Absensi Karyawan</h3>
     <div class="atx">
     <div class="acll"><div><label for="axF">Dari tanggal</label><input class="fi" type="date" id="axF" value="${esc(ATT.xf)}" onchange="ATT.xf=this.value;ATT.xman=1;pyRender(true)"></div><div><label for="axT">Sampai tanggal</label><input class="fi" type="date" id="axT" value="${esc(ATT.xt)}" onchange="ATT.xt=this.value;ATT.xman=1;pyRender(true)"></div></div>
     <div class="chips"><button type="button" class="chip" onclick="attXr('month');pyRender(true)">Bulan ini</button><button type="button" class="chip" onclick="attXr('last');pyRender(true)">Bulan lalu</button><button type="button" class="chip" onclick="attXr('7');pyRender(true)">7 hari</button></div></div>
     ${msg?`<p class="pfhint" style="color:var(--bad)">${msg}</p>`:''}
     ${ks.length?`<div class="tw opn-tw"><table class="opn-t"><thead><tr><th>Karyawan</th><th class="num">Hadir</th><th class="num">Tepat</th><th class="num">Telat</th><th class="num">Jam kerja</th></tr></thead><tbody>${ks.map(k=>{const e=by[k];return`<tr onclick="pyWho('${esc(k)}')" style="cursor:pointer"><td><b>${esc(e.name)}</b>${e.lm?`<small>telat total ${e.lm} mnt</small>`:''}</td><td class="num">${e.n}</td><td class="num">${e.ot}</td><td class="num">${e.late}</td><td class="num">${esc(attMn(e.work)||'0')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Belum ada data absensi pada rentang ini</div>'}
     ${ks.length?`<button class="btn" type="button" onclick="attXlsx()"><i class="ic" data-ic="download"></i>Unduh Rekap Absensi (Excel)</button>`:''}
    </div>
    ${ks.length?`<div class="panel"><h3>Catatan absensi</h3><select class="fi" onchange="PY.who=this.value;pyRender(true)" aria-label="Filter karyawan"><option value="">Semua karyawan</option>${ks.map(k=>`<option value="${esc(k)}" ${PY.who===k?'selected':''}>${esc(by[k].name)}</option>`).join('')}</select>
     ${(()=>{const rs=PY.rows.filter(r=>!PY.who||r.uname===PY.who).slice().sort((a,c)=>a.t<c.t?1:-1);return rs.slice(0,60).map(attRowHtml).join('')+(rs.length>60?`<p class="pfhint">Menampilkan 60 dari ${rs.length} catatan. Unduh Excel untuk semuanya.</p>`:'')})()}</div>`:''}</div>`;
  }
  function pyWho(k){PY.who=PY.who===k?'':k;pyRender(true)}
  /* ----- ekspor payroll ----- */
  async function pyXlsx(){
    const m=PY.month,[from,to]=pyRange(m);
    try{await pyAttLoad(from,to)}catch(e){toast(e.message);return}
    const days=attPair(PY.rows),by=attSumm(days);
    const head=['Karyawan','Jenis gaji','Hari hadir','Telat (mnt)','Jam kerja','Gaji pokok','Uang makan/transport','Tunjangan','Bonus/lembur','Total pendapatan','Potongan telat','Potongan tidak hadir','Potongan lain','Total potongan','Gaji bersih','Status','Catatan'];
    const rs=PY.users.map(u=>({u,r:pyRowFor(m,u.username)}));
    const rows=[head].concat(rs.map(({u,r})=>[u.name,PY_TLBL[r.type]||'',r.days,r.lateMin,attMn(r.work)||'0 mnt',r.basic,r.meal,r.allow,r.bonus,r.gross,r.late,r.absAmt,r.other,r.ded,r.net,r.paid?'Dibayar':'Belum dibayar',r.note||'']));
    const n=rs.length,C=i=>String.fromCharCode(65+i),sm=i=>({f:`SUM(${C(i)}2:${C(i)}${n+1})`,v:rs.reduce((a,x)=>a+(+[0,0,x.r.days,x.r.lateMin,0,x.r.basic,x.r.meal,x.r.allow,x.r.bonus,x.r.gross,x.r.late,x.r.absAmt,x.r.other,x.r.ded,x.r.net][i]||0),0)});
    if(n)rows.push([{t:'TOTAL',b:1},'',sm(2),sm(3),'',sm(5),sm(6),sm(7),sm(8),sm(9),sm(10),sm(11),sm(12),sm(13),sm(14),'','']);
    rows.push(['']);rows.push([{t:'Periode',b:1},pyMonthLbl(m)]);rows.push([{t:'Toko',b:1},db.set.store||'']);rows.push([{t:'Diekspor',b:1},new Date().toLocaleString('id-ID')]);
    const ks=Object.keys(by).sort((a,c)=>by[a].name<by[c].name?-1:1);
    const ab=[['Karyawan','Hari masuk','Tepat waktu','Terlambat','Total telat (mnt)','Pulang cepat','Tanpa shift','Total jam kerja (mnt)','Total jam kerja']].concat(ks.map(k=>{const e=by[k];return[e.name,e.n,e.ot,e.late,e.lm,e.early,e.ns,e.work,attMn(e.work)]}));
    dlBlob(OrdelaXlsx.build([{name:'Payroll',rows,head:1,w:[24,12,11,11,14,14,16,13,13,16,14,16,13,14,15,15,24]},{name:'Rekap Absensi',rows:ab,head:1,w:[24,12,12,11,16,13,12,20,18]}],dec()),'payroll-'+m+'.xlsx');
    toast('Payroll diunduh');
  }
  
  /* --- rekap absensi ke Excel (owner): rentang tanggal bebas, ringkasan per karyawan + harian + semua catatan --- */
  function attXlsxBox(){
    const t=ATT.today||new Date().toISOString().slice(0,10);
    if(!ATT.xf)ATT.xf=t.slice(0,8)+'01';if(!ATT.xt)ATT.xt=t;
    return `<div class="atx"><b style="font-size:14px">Rekap Excel</b>
    <div class="acll"><div><label for="axF">Dari tanggal</label><input class="fi" type="date" id="axF" value="${esc(ATT.xf)}" onchange="ATT.xf=this.value;ATT.xman=1"></div><div><label for="axT">Sampai tanggal</label><input class="fi" type="date" id="axT" value="${esc(ATT.xt)}" onchange="ATT.xt=this.value;ATT.xman=1"></div></div>
    <div class="chips"><button type="button" class="chip" onclick="attXr('month')">Bulan ini</button><button type="button" class="chip" onclick="attXr('last')">Bulan lalu</button><button type="button" class="chip" onclick="attXr('7')">7 hari</button></div>
    <button class="btn" type="button" id="axBtn" onclick="attXlsx()"><i class="ic" data-ic="download"></i>Unduh Rekap Excel</button>
    </div>`;
  }
  function attXr(k){
    const t=ATT.today||new Date().toISOString().slice(0,10);let f=t,to=t;
    if(k==='month')f=t.slice(0,8)+'01';
    else if(k==='7')f=attAdd(t,-6);
    else if(k==='last'){const d=new Date(t.slice(0,8)+'01T00:00:00Z');d.setUTCDate(0);to=d.toISOString().slice(0,10);f=to.slice(0,8)+'01'}
    ATT.xf=f;ATT.xt=to;ATT.xman=1;const a=$('#axF'),b=$('#axT');if(a)a.value=f;if(b)b.value=to;
  }
  function attXlsxData(rows,from,to){
    const lbl=r=>r.type==='in'?(r.status==='late'?'Terlambat':r.status==='ontime'?'Tepat waktu':'Tanpa shift'):(r.status==='early'?'Pulang cepat':r.status==='ok'?'Sesuai jadwal':'Pulang');
    rows=rows.slice().sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);
    const all=[['Tanggal','Karyawan','Username','Jenis','Jam','Shift','Jadwal','Keterangan','Selisih (mnt)','Jarak dari toko (m)','Latitude','Longitude','Akurasi GPS (m)']];
    rows.forEach(r=>all.push([r.day,r.name,r.uname,r.type==='in'?'Masuk':'Pulang',attT(r.t),r.shift||'',r.shift?r.sstart+'–'+r.send:'',lbl(r),+r.mins||0,r.dist==null?'':+r.dist,r.lat==null?'':+r.lat,r.lng==null?'':+r.lng,r.acc==null?'':+r.acc]));
    const days=attPair(rows);
    const dh=[['Tanggal','Karyawan','Shift','Jadwal','Masuk','Ket. Masuk','Telat (mnt)','Pulang','Ket. Pulang','Pulang cepat (mnt)','Durasi kerja (mnt)','Durasi kerja']];
    days.forEach(d=>{const mn=d.in&&d.out?Math.max(0,Math.round((new Date(d.out.t)-new Date(d.in.t))/60000)):'';
      dh.push([d.day,d.name,d.shift,d.sched,d.in?attT(d.in.t):'',d.in?lbl(d.in):'',d.in&&d.in.status==='late'?+d.in.mins||0:0,d.out?attT(d.out.t):'',d.out?lbl(d.out):'',d.out&&d.out.status==='early'?+d.out.mins||0:0,mn,mn===''?'':attMn(mn)])});
    // ringkasan per karyawan
    const by={};
    days.forEach(d=>{const k=d.uname,e=by[k]=by[k]||{name:d.name,n:0,ot:0,late:0,lm:0,early:0,ns:0,work:0};
      if(d.in){e.n++;if(d.in.status==='late'){e.late++;e.lm+=+d.in.mins||0}else if(d.in.status==='ontime')e.ot++;else e.ns++}
      if(d.out&&d.out.status==='early')e.early++;
      if(d.in&&d.out)e.work+=Math.max(0,Math.round((new Date(d.out.t)-new Date(d.in.t))/60000))});
    const names=Object.keys(by).sort((a,b)=>by[a].name<by[b].name?-1:1),n=names.length;
    const sm=[['Karyawan','Hari masuk','Tepat waktu','Terlambat','Total telat (mnt)','Pulang cepat','Tanpa shift','Total jam kerja (mnt)','Total jam kerja']];
    names.forEach(k=>{const e=by[k];sm.push([e.name,e.n,e.ot,e.late,e.lm,e.early,e.ns,e.work,attMn(e.work)])});
    if(n){const C=i=>String.fromCharCode(65+i),f=i=>({f:`SUM(${C(i)}2:${C(i)}${n+1})`,v:names.reduce((a,k)=>a+[0,by[k].n,by[k].ot,by[k].late,by[k].lm,by[k].early,by[k].ns,by[k].work][i],0)});
      sm.push([{t:'TOTAL',b:1},f(1),f(2),f(3),f(4),f(5),f(6),f(7),''])}
    sm.push(['']);sm.push([{t:'Toko',b:1},db.set.store||'']);sm.push([{t:'Periode',b:1},from+' s/d '+to]);sm.push([{t:'Diekspor',b:1},new Date().toLocaleString('id-ID',{timeZone:attTzv()})]);
    return{n:rows.length,sheets:[{name:'Ringkasan',rows:sm,head:1,w:[24,12,12,11,16,13,12,20,18]},{name:'Harian',rows:dh,head:1,w:[12,20,14,13,9,13,12,9,15,18,17,15]},{name:'Semua Catatan',rows:all,head:1,w:[12,20,14,9,8,14,13,14,13,17,12,12,14]}]};
  }
  async function attXlsx(){
    if(!isOwner())return;
    const from=ATT.xf,to=ATT.xt;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')){toast('Pilih tanggal dulu');return}
    if(from>to){toast('Tanggal awal harus sebelum tanggal akhir');return}
    const b=$('#axBtn');if(b)b.disabled=true;
    try{
      const r=await api('/api/att?from='+from+'&to='+to),j=await r.json();
      if(!r.ok){toast(j.error||'Gagal mengambil data absensi');return}
      if(j.tz)ATT.tz=j.tz;
      let rows=j.rows||[];if(ATT.who)rows=rows.filter(x=>x.uname===ATT.who);
      if(!rows.length){toast('Tidak ada data absensi pada tanggal ini');return}
      const x=attXlsxData(rows,from,to),a=document.createElement('a');
      a.href=URL.createObjectURL(OrdelaXlsx.build(x.sheets,0));a.download='rekap-absensi-'+from+'_sd_'+to+'.xlsx';
      document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},4000);
      toast('Excel diunduh ('+x.n+' catatan)');
    }catch(e){if(e.message!=='auth')toast('Tidak bisa terhubung ke server')}
    finally{const b2=$('#axBtn');if(b2)b2.disabled=false}
  }
  window.PY = PY;
  Object.assign(window, {
    pyMonthNow: pyMonthNow,
    pyRange: pyRange,
    pyMonthLbl: pyMonthLbl,
    pyLoad: pyLoad,
    pySave: pySave,
    pyAttLoad: pyAttLoad,
    attPair: attPair,
    attSumm: attSumm,
    pyCalc: pyCalc,
    pyRun: pyRun,
    pyItem: pyItem,
    pyRowFor: pyRowFor,
    pyRender: pyRender,
    pyGaji: pyGaji,
    pySlip: pySlip,
    pySlipUpd: pySlipUpd,
    pySlipSave: pySlipSave,
    pyPaid: pyPaid,
    pyMail: pyMail,
    pyMailAll: pyMailAll,
    pyKar: pyKar,
    pyCfgSave: pyCfgSave,
    pyEmp: pyEmp,
    pyEmpHint: pyEmpHint,
    pyEmpSave: pyEmpSave,
    pyAbsen: pyAbsen,
    pyWho: pyWho,
    pyXlsx: pyXlsx,
    attXlsxBox: attXlsxBox,
    attXr: attXr,
    attXlsxData: attXlsxData,
    attXlsx: attXlsx
  });
})(window);
