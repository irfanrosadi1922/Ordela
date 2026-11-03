/* Business dashboard analytics, charts, comparisons and transaction summary. */
(function (window) {
  'use strict';
  function salesSeries(list,f,t){
    if(f&&f===t){
      const hs=list.map(x=>new Date(x.t).getHours());
      const lo=Math.min(9,...hs),hi=Math.max(20,...hs),labels=[],vals=[];
      for(let h=lo;h<=hi;h++){labels.push(String(h).padStart(2,'0')+':00');vals.push(0)}
      list.forEach(x=>{vals[new Date(x.t).getHours()-lo]+=+x.total||0});
      return{labels,vals,note:''};
    }
    const now=new Date(),day=k=>new Date(k+'T00:00:00');
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    let end=t?day(t):today;if(end>today)end=today;   // tanggal akhir di masa depan dipotong sampai hari ini
    let start=f?day(f):new Date(end.getFullYear(),end.getMonth(),end.getDate()-29),note=f?'':' (30 hari terakhir)';
    let n=Math.round((end-start)/864e5)+1;
    if(n>62){start=new Date(end.getFullYear(),end.getMonth(),end.getDate()-61);n=62;note=' (62 hari terakhir)'}
    if(n<1)n=1;
    const multi=start.getMonth()!==end.getMonth()||start.getFullYear()!==end.getFullYear(),labels=[],vals=[],idx={};
    for(let i=0;i<n;i++){
      const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      idx[dkey(d)]=i;vals.push(0);
      labels.push(n<=7?d.toLocaleDateString(dloc(),{weekday:'short'}):multi?d.getDate()+'/'+(d.getMonth()+1):String(d.getDate()));
    }
    list.forEach(x=>{const j=idx[dkey(x.t)];if(j!=null)vals[j]+=+x.total||0});
    return{labels,vals,note};
  }
  /* periode sebelumnya dengan panjang yang sama (untuk panah naik/turun); 'Semua' tidak punya pembanding */
  function hrPrev(){
    if(!S.hf||!S.ht)return null;
    const a=new Date(S.hf+'T00:00:00'),b=new Date(S.ht+'T00:00:00'),n=Math.round((b-a)/864e5)+1;
    return[dkey(new Date(a.getFullYear(),a.getMonth(),a.getDate()-n)),dkey(new Date(a.getFullYear(),a.getMonth(),a.getDate()-1))];
  }
  function hrLabel(){
    const m={today:'Hari ini',yest:'Kemarin','7':'7 hari terakhir',month:'Bulan ini',all:'Semua waktu'};
    if(m[S.hr])return m[S.hr];
    const f=d=>d?new Date(d+'T00:00:00').toLocaleDateString(dloc(),{day:'2-digit',month:'short',year:'numeric'}):'…';
    return S.hf===S.ht?f(S.hf):f(S.hf)+' – '+f(S.ht);
  }
  function niceMax(mx){if(!(mx>0))return 4;const e=Math.pow(10,Math.floor(Math.log10(mx))),m=mx/e;return(m<=1?1:m<=2?2:m<=4?4:m<=5?5:10)*e}
  function areaChart(labels,vals){
    const PH=innerWidth<700,W=PH?360:600,H=PH?210:230,L=PH?40:46,R=12,T=30,B=28,n=vals.length;
    if(!n)return'';
    const yM=niceMax(Math.max(...vals,0)),X=i=>L+(n>1?i*(W-L-R)/(n-1):(W-L-R)/2),Y=v=>T+(H-T-B)*(1-v/yM);
    const P=vals.map((v,i)=>[X(i),Y(v)]);
    let d='M'+P[0][0].toFixed(1)+','+P[0][1].toFixed(1);
    for(let i=0;i<n-1;i++){
      const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;
      let c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6,c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
      const lo=Math.min(p1[1],p2[1]),hi=Math.max(p1[1],p2[1]);
      c1y=Math.min(hi,Math.max(lo,c1y));c2y=Math.min(hi,Math.max(lo,c2y));
      d+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
    }
    const base=H-B,area=d+' L'+P[n-1][0].toFixed(1)+','+base+' L'+P[0][0].toFixed(1)+','+base+' Z';
    let g='';
    for(let k=0;k<=4;k++){const v=yM*k/4,y=Y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--ln)" stroke-dasharray="3 4"/><text x="${L-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${cmp(v)}</text>`}
    const st=Math.ceil(n/9);let xl='';
    labels.forEach((t,i)=>{if(i%st===0)xl+=`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle">${esc(t)}</text>`});
    let pk=-1,mv=0;vals.forEach((v,i)=>{if(v>mv){mv=v;pk=i}});
    let tip='';
    if(pk>=0){const x=X(pk),y=Y(mv),w=Math.max(46,cmpM(mv).length*7+16),bx=Math.min(W-R-w,Math.max(L,x-w/2));
      tip=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#fff" stroke="var(--b)" stroke-width="2.5"/><rect x="${bx.toFixed(1)}" y="${(y-30).toFixed(1)}" width="${w}" height="20" rx="10" fill="var(--tx)" opacity=".92"/><text class="tp" x="${(bx+w/2).toFixed(1)}" y="${(y-16).toFixed(1)}" text-anchor="middle" style="fill:var(--card)">${esc(cmpM(mv))}</text>`}
    const hit=P.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="11" fill="transparent"><title>${esc(labels[i])}: ${esc(money(vals[i]))}</title></circle>`).join('');
    return`<div class="chw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik penjualan"><defs><linearGradient id="agr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCB74" stop-opacity=".75"/><stop offset="1" stop-color="#FFCB74" stop-opacity="0"/></linearGradient></defs>${g}${xl}<path d="${area}" fill="url(#agr)"/><path d="${d}" fill="none" stroke="#111111" stroke-width="2.2" stroke-linecap="round"/>${tip}${hit}</svg></div>`;
  }
  function donutSvg(parts,center){
    const r=52,C=2*Math.PI*r,tot=parts.reduce((a,b)=>a+b.v,0);let off=0,seg='';
    if(tot>0)parts.forEach(p=>{const len=p.v/tot*C;if(len>0){seg+=`<circle cx="70" cy="70" r="${r}" fill="none" stroke="${p.c}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${Math.max(0,len-5).toFixed(1)} ${(C-Math.max(0,len-5)).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 70 70)"/>`}off+=len});
    return`<svg viewBox="0 0 140 140" role="img" aria-label="Pendapatan per kategori"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--ln)" stroke-width="13"/>${seg}<text class="dc" x="70" y="76" text-anchor="middle">${esc(center)}</text></svg>`;
  }
  const DNC=['#4cc38a','#ef4444','#f7b538','#9ca3af'];
  const catOf=l=>{const i=find(l.id);return(i&&i.cat)||'Lainnya'};
  const KI=(c,p)=>`<span class="ki" style="background:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>`;
  const HR_PRE=[['today','Hari ini'],['yest','Kemarin'],['7','7 Hari'],['month','Bulan ini'],['all','Semua']];
  function histJump(){const e=$('#histPanel');if(e)e.scrollIntoView({behavior:'smooth',block:'start'})}
  function renderHome(){
    const el=$('#homeBox');if(!el)return;
    const s=db.set,H=can('hist');
    if(!H&&S.hr!=='today'){S.hr='today';S.hn=25}   // tanpa izin Riwayat, Beranda hanya menampilkan hari ini
    hrSync();
    const l=db.orders.filter(x=>inR(x,S.hf,S.ht)),pr=hrPrev(),pl=pr?db.orders.filter(x=>inR(x,pr[0],pr[1])):null;
    const D=(a,b)=>pl?dl(a,b):'';
    const isD=x=>x.type==='Dine In',dn=l.filter(isD).length,tk=l.length-dn,dnP=pl?pl.filter(isD).length:0,tkP=pl?pl.length-dnP:0;
    const ser=salesSeries(l,S.hf,S.ht),per=hrLabel();
    const sm=f=>l.reduce((a,b)=>a+(+f(b)||0),0);
    const rev=sumT(l),gross=sm(o=>o.sub),disc=sm(o=>o.disc),tax=sm(o=>o.tax);
    const cost=l.reduce((a,o)=>a+o.lines.reduce((z,x)=>z+(+x.cost||0)*(+x.qty||0),0),0);
    const qty=l.reduce((a,o)=>a+o.lines.reduce((z,x)=>z+(+x.qty||0),0),0),avg=l.length?rev/l.length:0;
    const pm={};l.forEach(o=>{const k=o.method||'-',z=pm[k]=pm[k]||{n:0,v:0};z.n++;z.v+=+o.total||0});
    const pms=Object.entries(pm).sort((a,b)=>b[1].v-a[1].v);
    const cat={};
    l.forEach(o=>o.lines.forEach(x=>{const c=catOf(x);cat[c]=(cat[c]||0)+(+x.price||0)*(+x.qty||0)}));
    const cs=Object.entries(cat).sort((a,b)=>b[1]-a[1]),top=cs.slice(0,3).map(([n,v],i)=>({n,v,c:DNC[i]})),rest=cs.slice(3).reduce((a,b)=>a+b[1],0);
    if(rest>0)top.push({n:'Lainnya',v:rest,c:DNC[3]});
    const cnt={};
    l.forEach(o=>o.lines.forEach(x=>{const k=x.id||x.name;(cnt[k]=cnt[k]||{id:x.id,name:x.name,q:0}).q+=+x.qty||0}));
    const tr4=Object.values(cnt).sort((a,b)=>b.q-a.q).slice(0,4);
    const lowN=+s.low||5,oos=db.items.filter(i=>(+i.stock||0)<=Math.max(0,+i.min>=0?+i.min:lowN)).sort((a,b)=>(+a.stock||0)-(+b.stock||0)).slice(0,4);
    const th=x=>{const i=x.id&&find(x.id);return i?thumb(i):esc((x.name||'?').charAt(0).toUpperCase())};
    const pTerlaris=`<div class="panel"><div class="ph"><h3>Menu Terlaris</h3><small class="pl">${esc(per)}</small></div>${tr4.length?`<div class="tl">${tr4.map(x=>`<div class="ti"><span class="tt">${th(x)}</span><div><b>${esc(x.name)}</b><small>Terjual: ${x.q}</small></div></div>`).join('')}</div>`:'<div class="mt">Belum ada penjualan pada periode ini.</div>'}</div>`;
    const pStok=`<div class="panel"><div class="ph"><h3>Stok Habis / Menipis</h3><a onclick="go('inv')">Lihat semua ›</a></div>${oos.length?`<div class="tl">${oos.map(i=>`<div class="ti"><span class="tt">${thumb(i)}</span><div><b>${esc(i.name)}</b><small class="o">${(+i.stock||0)<=0?'Habis':'Sisa '+i.stock}</small></div></div>`).join('')}</div>`:'<div class="mt">Semua stok aman.</div>'}</div>`;
    const rr=(a,b,c)=>`<div class="rr${c?' '+c:''}"><span>${a}</span><b>${b}</b></div>`;
    const pRekap=`<div class="panel rk"><div class="ph"><h3>Rekap Penjualan</h3><small class="pl">${esc(per)}</small></div>
      ${rr('Penjualan Kotor',money(gross))}${rr('Diskon','− '+money(disc))}${rr('Penjualan Bersih',money(gross-disc))}${rr('Pajak',money(tax))}${rr('Total Diterima',money(rev),'t')}
      <h4>Ringkasan</h4>
      ${rr('Transaksi',l.length)}${rr('Item terjual',qty)}${rr('Rata-rata / transaksi',money(avg))}${rr('Estimasi laba',money(rev-tax-cost))}
      <h4>Metode Bayar</h4>
      ${pms.length?`<div class="mb">${pms.map(([n,z])=>`<div class="m"><span>${esc(n)} <small>· ${z.n} transaksi</small></span><b>${money(z.v)}</b><div class="bar2"><i style="width:${rev>0?Math.max(3,Math.round(z.v/rev*100)):0}%"></i></div></div>`).join('')}</div>`:'<div class="mt">Belum ada transaksi.</div>'}
    </div>`;
    el.innerHTML=`
    <div class="hm-h"><div><h2>${esc(s.store)}</h2><small>${new Date().toLocaleDateString(dloc(),{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</small></div>
      ${H?`<button class="btn sm" style="width:auto;margin:0" onclick="exportXlsx()" aria-label="Ekspor Excel"><i class="ic" data-ic="download"></i><span class="ex">Ekspor </span>Excel</button>`:''}</div>
    ${H?`<div class="panel hfil"><div class="chips">${HR_PRE.map(([k,t])=>`<button class="chip ${S.hr===k?'on':''}" onclick="setHR('${k}')">${t}</button>`).join('')}</div>
      <div class="hdates"><label><span>Dari</span><input class="fi" type="date" id="hFrom" value="${esc(S.hf)}" onchange="setHD()"></label><label><span>Sampai</span><input class="fi" type="date" id="hTo" value="${esc(S.ht)}" onchange="setHD()"></label></div></div>`:''}
    <div class="kp">
      <div class="kc"><div class="kt"><span>Pendapatan</span>${D(rev,pl?sumT(pl):0)}</div><div class="kv">${KI('#111111','<path d="M7 17L17 7M9 7h8v8"/>')}<span>${money(rev)}</span></div></div>
      <div class="kc"><div class="kt"><span>Pesanan</span>${D(l.length,pl?pl.length:0)}</div><div class="kv">${KI('#34c27a','<circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/><path d="M2 3h3l2.5 12h11l2-8H6"/>')}<span>${l.length}</span></div></div>
      <div class="kc"><div class="kt"><span>Dine In</span>${D(dn,dnP)}</div><div class="kv">${KI('#ef4444','<path d="M6 6l12 12M18 6L6 18"/>')}<span>${dn}</span></div></div>
      <div class="kc"><div class="kt"><span>Take Away</span>${D(tk,tkP)}</div><div class="kv">${KI('#f7b538','<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>')}<span>${tk}</span></div></div>
    </div>
    ${pl?'<div class="kpn">▲▼ dibanding periode sebelumnya yang sama panjang</div>':''}
    <div class="hg">
      <div class="panel"><div class="ph"><h3>Grafik Penjualan</h3><small class="pl">${esc(per)}${esc(ser.note)}</small></div>${areaChart(ser.labels,ser.vals)}</div>
      <div class="panel"><div class="ph"><h3>Pendapatan per Kategori</h3><small class="pl">${esc(per)}</small></div><div class="dnw">${donutSvg(top,cmpM(top.reduce((a,b)=>a+b.v,0)))}<div class="lg">${top.length?top.map(x=>`<span><i style="background:${x.c}"></i>${esc(x.n)}</span>`).join(''):'<span>Belum ada penjualan</span>'}</div></div></div>
    </div>
    ${H?`<div class="hg2">${pRekap}<div class="hcol">${pTerlaris}${pStok}</div></div>
    <div class="panel hp" id="histPanel"><div class="ph"><h3>Riwayat Transaksi</h3><small class="pl">${l.length} transaksi · ${esc(per)}</small></div><div class="lst" id="histBody"></div><button class="btn sec morebtn" id="histMore" hidden onclick="S.hn=(S.hn||25)+25;renderHist()">Tampilkan lebih banyak</button></div>
    <div class="panel" id="voidBox" hidden></div>`:`<div class="hg2">${pTerlaris}${pStok}</div>`}`;
    renderHist();
  }
  /* ---------- Meja ---------- */
  const tkey=t=>String(t==null?'':t).trim().toUpperCase();
  /* meja yang diisi lewat kasir: pesanan ditahan (belum bayar) dan transaksi kasir (sudah bayar) yang belum dikosongkan */
  window.HR_PRE = HR_PRE;
  window.KI = KI;
  Object.assign(window, {
    salesSeries: salesSeries,
    hrPrev: hrPrev,
    hrLabel: hrLabel,
    niceMax: niceMax,
    areaChart: areaChart,
    donutSvg: donutSvg,
    histJump: histJump,
    renderHome: renderHome
  });
})(window);
