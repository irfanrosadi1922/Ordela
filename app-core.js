
const $=s=>document.querySelector(s);
const KEY='sushi_pos_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Hanya izinkan URL gambar yang diperlukan aplikasi; escape atribut untuk mencegah injeksi HTML.
const imgSrc=s=>{const v=String(s??'').trim();return (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(v)||/^https?:\/\//i.test(v))?esc(v):''};
const emo=i=>i.emoji&&i.emoji!=='🍽️'?esc(i.emoji):'<i class="ic solo" data-ic="food"></i>'; // item tanpa gambar: emoji pilihan, atau ikon bawaan
const uid=()=>'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

function seed(){
  const it=(name,cat,price,cost,stock,emoji)=>({id:uid(),name,cat,price,cost,stock,min:5,img:'',emoji});
  return{
    cats:['Appetizer','Salad','Sashimi','Nigiri','Sushi Roll','Minuman'],
    items:[
      it('Edamame','Appetizer',25000,10000,40,'🫛'),
      it('Bang Bang Shrimp','Appetizer',45000,22000,30,'🍤'),
      it('Enoki Tempura','Appetizer',32000,13000,25,'🍄'),
      it('Chicken Karaage','Appetizer',38000,17000,22,'🍗'),
      it('Okonomiyaki','Appetizer',42000,19000,18,'🥞'),
      it('Seaweed Salad','Salad',28000,11000,20,'🥗'),
      it('Salmon Salad','Salad',48000,24000,15,'🥗'),
      it('Salmon Sashimi','Sashimi',65000,38000,12,'🍣'),
      it('Tuna Sashimi','Sashimi',70000,42000,10,'🐟'),
      it('Salmon Nigiri','Nigiri',30000,16000,30,'🍣'),
      it('Ebi Nigiri','Nigiri',28000,14000,3,'🍤'),
      it('Tempura Maki','Sushi Roll',46000,21000,20,'🍱'),
      it('California Roll','Sushi Roll',44000,20000,24,'🍣'),
      it('Ocha Panas','Minuman',12000,3000,60,'🍵'),
      it('Es Teh Lemon','Minuman',15000,4000,0,'🍋'),
    ],
    orders:[],log:[],seq:1,
    set:{store:'Ordela',addr:'Jl. Contoh No. 1, Kota',tax:10,paper:'80',cur:'Rp',foot:'Terima kasih atas kunjungan Anda!',low:5}
  };
}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.items){globalThis.__lsok=true;return d}}catch(e){}globalThis.__lsok=false;return seed()}
const RC_DEF={logo:'',showLogo:true,logoW:160,align:'center',font:'normal',divider:'dashed',itemLayout:'two',showAddr:true,line1:'',showNo:true,showDate:true,showType:true,showCust:true,showCashier:false,cashierAuto:true,cashier:'',showDisc:true,showTax:true,showPay:true,showFooter:true,line2:'',showQr:false,qrText:'Scan untuk memesan',bigTotal:true,showTable:true,tableSize:'xl',feed:3};
const LOG_MAX=1000;
const PRN_DEF={mode:'browser',auto:false,autoNew:true,cut:true,drawer:false,baud:9600,chunk:100,delay:15,uuid:'',autoConn:true};
const DEF_LOGO='icon-192.png';   // file lokal (ikut terbawa di aplikasi iOS/Android, tidak bergantung internet)
const GV_DEF={mode:'grid',colsD:0,colsM:2,stock:true,cats:true,tap:'add'};
function fixDb(d){d.set=d.set||{};if(d.set.fsAuto==null)d.set.fsAuto=true;if(d.set.logoApp==null)d.set.logoApp=true;if(d.set.rc&&d.set.rc.logo&&!d.set.logo){d.set.logo=d.set.rc.logo;d.set.rc.logo=''}d.set.logo=d.set.logo||'';d.set.gv={...GV_DEF,...(d.set.gv||{})};delete d.set.gv.size;d.set.lang=d.set.lang||'id';if(d.set.dec==null)d.set.dec=0;d.set.loc=d.set.loc||'id-ID';d.set.curPos=d.set.curPos||'before';d.set.cur=d.set.cur||'Rp';d.set.curCode=d.set.curCode||(d.set.cur==='Rp'?'IDR':'CUSTOM');d.set.rc={...RC_DEF,...(d.set.rc||{})};d.set.pay={on:false,qris:'',name:'',note:'',...(d.set.pay&&typeof d.set.pay==='object'?d.set.pay:{})};delete d.set.pay.qr;d.set.prn={...PRN_DEF,...(d.set.prn||{})};d.set.att={on:false,tz:'',lat:'',lng:'',radius:100,strict:false,shifts:[],assign:{},...(d.set.att&&typeof d.set.att==='object'?d.set.att:{})};d.set.paper=d.set.paper||'80';for(const k of ['shifts','exps','buys','sups','members','promos','occ','gifts','rsv'])if(!Array.isArray(d[k]))d[k]=[];d.log=d.log||[];d.orders=d.orders||[];d.cats=d.cats||[];
  if(d.set.store==='Sushi POS'||d.set.store==='Octocat')d.set.store='Ordela';
  if(d.set.logo&&((d.set.logo.length===9895&&d.set.logo.slice(0,40)==='data:image/jpeg;base64,/9j/4AAQSkZJRgABA')||(d.set.logo.length===22538&&d.set.logo.slice(-24)==='YWBpBFcIAAAAAElFTkSuQmCC')))d.set.logo=DEF_LOGO; /* ganti logo bawaan lama */
  if(/^https?:\/\/raw\.githubusercontent\.com\/[^?#]*\/(icon|brand)[^?#]*$/i.test(String(d.set.logo||'')))d.set.logo=DEF_LOGO;   // logo bawaan lama di alamat luar -> file lokal
  if(!d.set.logo){d.set.logo=DEF_LOGO;if(!d.set.logoInit)d.set.rc.showLogo=false}
  d.set.logoInit=true;
  delete d.set.map;if(d.set.rc){delete d.set.rc.showMapQr;delete d.set.rc.mapQrText}
  ['holds','members','promos','shifts','exps','sups','buys','kds','occ','gifts','rsv'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});
  if(d.set.ptsPer==null)d.set.ptsPer=10000;if(d.set.ptsVal==null)d.set.ptsVal=100;
  {const cut=Date.now()-3*864e5;d.holds=d.holds.filter(h=>!(h.del&&(h.u||0)<cut))}
  syncBundles(d);
  return d}
let db=fixDb(load());
function save(){syncBundles(db);db._ts=Date.now();LSFAIL=false;try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){LSFAIL=true}schedMirror();if(CL.on){CL.dirty=true;persistMeta();schedSync()}}

const S={cm:{},promoId:null,itab:'sale',view:'pos',cat:'all',q:'',sel:new Set(),cart:{},type:'Takeaway',dType:'%',dVal:0};
const dec=()=>Math.max(0,Math.min(4,+db.set.dec||0));
const rnd=v=>{const f=Math.pow(10,dec());return Math.round((+v+Number.EPSILON)*f)/f};
const fmtNum=n=>Number(n).toLocaleString(db.set.loc||'id-ID',{minimumFractionDigits:dec(),maximumFractionDigits:dec()});
const money=n=>{const s=db.set,v=fmtNum(n);return s.curPos==='after'?v+' '+s.cur:s.cur+' '+v};
const find=id=>db.items.find(i=>i.id===id);
/* ---------- item paket / set: stok paket dihitung otomatis dari stok isinya ---------- */
function isB(i){return !!i&&Array.isArray(i.bundle)&&i.bundle.length>0}
function bdStock(i,by){let m=Infinity;for(const c of i.bundle){const x=by[c.id];if(!x||isB(x)||!(c.q>0))return 0;m=Math.min(m,Math.floor((+x.stock||0)/c.q+1e-9))}return m===Infinity?0:Math.max(0,m)}
function syncBundles(d){if(!d||!Array.isArray(d.items))return;const by={};d.items.forEach(i=>{by[i.id]=i});d.items.forEach(i=>{if(isB(i)){const v=bdStock(i,by);if(i.stock!==v)i.stock=v}})}
const bdLbl=b=>(b||[]).map(c=>{const x=find(c.id);return c.q+'× '+(c.name||(x?x.name:'?'))}).join(' + ');
/* baris keranjang: kunci = id menu, atau id@pilihan bila menu punya varian/tambahan */
const bid=k=>String(k).split('@')[0];
const hasMods=i=>!!i&&Array.isArray(i.mods)&&i.mods.length>0;
function modKey(id,sel){return sel&&sel.length?id+'@'+sel.map(x=>x.g+':'+x.n).join('|'):id}
function linePrice(k){const i=find(bid(k));if(!i)return 0;const m=S.cm[k];return i.price+(m?m.sel.reduce((a,x)=>a+(+x.p||0),0):0)}
function lineSfx(k){const m=S.cm[k];return m&&m.sel.length?m.sel.map(x=>x.n).join(', '):''}
function cartQtyOf(id){let n=0;for(const k in S.cart)if(bid(k)===id)n+=S.cart[k];return n}
function cartUse(skip){const u={};for(const id0 in S.cart){if(id0===skip)continue;const id=bid(id0);const i=find(id);if(!i)continue;const q=S.cart[id0];if(isB(i))i.bundle.forEach(c=>{u[c.id]=(u[c.id]||0)+c.q*q});else u[id]=(u[id]||0)+q}for(const k in u)u[k]=Math.round(u[k]*1000)/1000;return u}
function maxQty(i,sk){const u=cartUse(sk===undefined?i.id:sk);if(isB(i)){let m=Infinity;for(const c of i.bundle){const x=find(c.id);if(!x||isB(x)||!(c.q>0))return 0;m=Math.min(m,Math.floor(((+x.stock||0)-(u[c.id]||0))/c.q+1e-9))}return Math.max(0,m===Infinity?0:m)}return Math.max(0,Math.round((i.stock-(u[i.id]||0))*1000)/1000)}
function bdUsedBy(id,skip){return db.items.find(x=>isB(x)&&!(skip&&skip.has(x.id))&&x.bundle.some(c=>c.id===id))}
const thumb=i=>i.img?`<img src="${imgSrc(i.img)}" alt="">`:emo(i);

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200)}
function applyBrand(){
  const s=db.set,b=$('#brand');if(!b)return;
  b.innerHTML=(s.logo&&s.logoApp!==false&&imgSrc(s.logo)?'<img class="blogo" alt="" src="'+imgSrc(s.logo)+'">':'<i class="ic solo" data-ic="food"></i>')+'<span>'+esc(s.store)+'</span>';
  if(typeof applyLang==='function'&&lang()!=='id'){}
  if(typeof railBrand==='function')railBrand();
}
(function(){
  try{if(sessionStorage.getItem('pos_splash'))return;sessionStorage.setItem('pos_splash','1')}catch(e){}
  setTimeout(()=>{
    const w=$('#splash');if(!w)return;
    const n=String(db.set.store||'Ordela').split(' '),last=n.pop();
    const dark=document.documentElement.getAttribute('data-theme')==='dark';$('#splashLogo').src=dark?'icon-ordela-dark.svg':'icon-ordela-red.svg';$('#splashName').textContent='ORDELA';
    w.hidden=false;setTimeout(()=>w.classList.add('out'),1000);setTimeout(()=>{w.hidden=true},1500);
  },0);
})();
function tick(){const d=new Date();$('#dt').textContent=d.toLocaleDateString(dloc(),{weekday:'short',day:'2-digit',month:'short',year:'numeric'});$('#tm').textContent=d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')}
setInterval(tick,15000);

/* ---------- navigation ---------- */
function toggleDrawer(){$('#drawer').classList.toggle('open');$('#scrim').classList.toggle('on',$('#drawer').classList.contains('open'))}
function closeAll(){$('#drawer').classList.remove('open');$('#scrim').classList.remove('on')}
const ORDELA_NAV_CONFIG=window.ORDELA_NAV_CONFIG;
const P2V=ORDELA_NAV_CONFIG.secondaryViews;
const ACCV=ORDELA_NAV_CONFIG.accountViews;
function go(v){
  if(S.view==='set'&&v!=='set')S.setSub=null;
  if(v==='hist'||v==='rep')v='home';   // Riwayat & Laporan sudah menyatu di Beranda
  if(ACCV.includes(v)&&!(CL.on&&CL.me))v='set';
  if(!canView(v)){if(v!=='pos')toast('Anda tidak punya akses ke halaman itu');v=landing()}
  if(v==='editacc'&&S.view!=='editacc'&&S.view!=='accphoto'){const eb=$('#editAccPage');if(eb)eb.dataset.built=''}
  if(v==='pyr'&&S.view!=='pyr'){PY.built=false;PY.d=null;PY.rowsKey=''}
  if(v==='accdel'&&S.view!=='accdel'){const db_=$('#accDelPage');if(db_)db_.dataset.built='';ACC.delSole=undefined}
  if(v==='accset'&&S.view!=='accset'){const qb=$('#accSetPage');if(qb)qb.dataset.built=''}
  if(v==='pw'&&S.view!=='pw'){const pb=$('#pwPage');if(pb)pb.dataset.built=''}
  S.view=v;closeAll();toggleInv(false);
  ['pos','home','table','alert','inv','rc','prn','set','co','usr','att','pyr'].concat(P2V,ACCV).forEach(x=>$('#v-'+x).hidden=x!==v);
  if(v==='rc'||v==='prn'){const h=$('#'+v+'Head');if(h)h.innerHTML=pfSub(v==='rc'?'Desain Struk':'Printer',"go('set')")}
  const nv=ACCV.includes(v)?'acc':(v==='rc'||v==='prn')?'set':v;   // semua halaman profil menyalakan menu Akun
  document.querySelectorAll('.drawer button,.bnav button,.rail button').forEach(b=>b.classList.toggle('on',b.dataset.v===nv));
  navDot(nv);
  $('#invoice').style.display=v==='pos'?'':'none';
  $('#fab').classList.toggle('hide',v!=='pos');
  $('.search').style.visibility=(v==='pos'||v==='inv')?'visible':'hidden';
  render();
}
let NAV={x:null,raf:0,none:false};
function navDraw(x){
  const n=$('#bnav'),h=$('#bnhole'),r=$('#bnrect'),d=$('#bndot');if(!n||!h||!r||!d)return;
  NAV.x=x;const W=n.clientWidth,H=n.clientHeight;
  r.setAttribute('width',W);r.setAttribute('height',H+40);
  d.style.transform='translateX('+x+'px)';
  if(NAV.none){h.setAttribute('d','');return}
  /* lengkung mulus mengelilingi lingkaran (pusat y=20, jari-jari 29 + celah 8) */
  const R=37,cy=20,t=20*Math.PI/180,ax=R*Math.cos(t),ay=cy+R*Math.sin(t),k=14,tx=Math.sin(t)*k,ty=Math.cos(t)*k;
  const f=n=>n.toFixed(1);
  h.setAttribute('d','M'+f(x-62)+',-40L'+f(x-62)+',0C'+f(x-46)+',0 '+f(x-ax-tx)+','+f(ay-ty)+' '+f(x-ax)+','+f(ay)+'A'+R+','+R+' 0 0 0 '+f(x+ax)+','+f(ay)+'C'+f(x+ax+tx)+','+f(ay-ty)+' '+f(x+46)+',0 '+f(x+62)+',0L'+f(x+62)+',-40Z');
}
function navDot(v,instant){
  const n=$('#bnav');if(!n||!n.querySelectorAll||!n.clientWidth)return;
  const bs=Array.from(n.querySelectorAll('button')),b=bs.find(b=>b.dataset.v===v);
  n.classList.toggle('none',!b);NAV.none=!b;
  if(!b){navDraw(NAV.x==null?n.clientWidth/2:NAV.x);return}
  const to=b.offsetLeft+b.offsetWidth/2,from=NAV.x==null||instant?to:NAV.x;
  cancelAnimationFrame(NAV.raf);
  if(from===to){navDraw(to);return}
  const t0=performance.now(),D=420,c1=1.9;
  const ease=u=>{u-=1;return u*u*((c1+1)*u+c1)+1};  /* easeOutBack */
  (function step(now){const u=Math.min(1,(now-t0)/D);navDraw(from+(to-from)*ease(u));if(u<1)NAV.raf=requestAnimationFrame(step)})(t0);
}
window.addEventListener('resize',()=>{const o=document.querySelector('.bnav button.on');navDot(o?o.dataset.v:null,true)});
function toggleInv(open){$('#invoice').classList.toggle('open',open);$('#fab').classList.toggle('hide',!!open||S.view!=='pos')}

function keepScroll(fn,els){
  const els2=els.map(e=>$(e)).filter(Boolean),pos=els2.map(e=>e.scrollTop);
  fn();
  const back=()=>els2.forEach((e,i)=>{if(pos[i]&&e.scrollTop!==pos[i])e.scrollTop=pos[i]});
  back();if(typeof requestAnimationFrame==="function")requestAnimationFrame(back);setTimeout(back,60);
}

/* Model struk: satu sumber untuk tampilan HTML (preview/print browser) dan ESC/POS (printer thermal) */
/* nama kasir di struk: otomatis nama akun yang melakukan transaksi; teks manual hanya cadangan (atau pengganti bila otomatis dimatikan) */
function rcCashier(o,r){return r.cashierAuto===false?(r.cashier||o.cashier||''):(o.cashier||r.cashier||'')}
function receiptModel(o){
  if(o.ticket)return ticketModel(o);
  const s=db.set,r=s.rc,m=[],n=fmtNum;
  const hr=()=>{if(r.divider!=='none')m.push({t:'hr'})};
  if(r.showLogo&&db.set.logo)m.push({t:'logo'});
  m.push({t:'text',x:s.store,a:r.align,b:true,big:true});
  if(r.showAddr&&s.addr)m.push({t:'text',x:s.addr,a:r.align});
  if(r.line1)m.push({t:'text',x:r.line1,a:r.align});
  hr();
  if(r.showTable!==false&&o.tbl){m.push({t:'text',x:tr('MEJA')+' '+o.tbl,a:'center',b:true,huge:r.tableSize==='l'?2:3});hr()}
  const cash=rcCashier(o,r),hasInfo=r.showNo||r.showDate||r.showType||(r.showCust&&o.cust)||(r.showCashier&&cash);
  if(r.showNo)m.push({t:'row',l:'No',r:o.no});
  if(r.showDate)m.push({t:'row',l:tr('Tanggal'),r:fmtDT(o)});
  if(r.showType)m.push({t:'row',l:tr('Tipe'),r:tr(o.type)});
  if(r.showCust&&o.cust)m.push({t:'row',l:tr('Pelanggan'),r:o.cust});
  if(r.showCashier&&cash)m.push({t:'row',l:tr('Kasir'),r:cash});
  if(hasInfo)hr();
  o.lines.forEach(l=>{
    if(r.itemLayout==='one')m.push({t:'row',l:l.qty+'x '+l.name,r:n(l.qty*l.price)});
    else{m.push({t:'text',x:l.name,a:'left'});m.push({t:'row',l:'  '+l.qty+' x '+n(l.price),r:n(l.qty*l.price)})}
  });
  hr();
  m.push({t:'row',l:tr('Subtotal'),r:money(o.sub)});
  if(r.showDisc&&o.disc)m.push({t:'row',l:tr('Diskon'),r:'-'+money(o.disc)});
  if(r.showTax)m.push({t:'row',l:tr('Pajak ('+o.taxRate+'%)'),r:money(o.tax)});
  m.push({t:'row',l:tr('TOTAL'),r:money(o.total),b:true,big:r.bigTotal});
  if(o.tip)m.push({t:'row',l:'Tip',r:money(o.tip)});
  if(r.showPay){hr();if(Array.isArray(o.pays))o.pays.forEach(p=>m.push({t:'row',l:tr('Bayar ('+p.m+')'),r:money(p.amt)}));else m.push({t:'row',l:tr('Bayar ('+o.method+')'),r:money(o.paid)});m.push({t:'row',l:tr('Kembali'),r:money(o.change)})}
  if(o.mem){hr();m.push({t:'text',x:'Member: '+o.mem.name,a:'center'});m.push({t:'text',x:'Poin +'+(o.mem.earn||0)+(o.mem.used?' / dipakai '+o.mem.used:''),a:'center'})}
  if((r.showFooter&&s.foot)||r.line2||r.showQr){
    hr();
    if(r.showFooter&&s.foot)m.push({t:'text',x:s.foot,a:'center'});
    if(r.line2)m.push({t:'text',x:r.line2,a:'center'});
    if(r.showQr)m.push({t:'qr',x:coUrl(''),cap:r.qrText});
  }
  return m;
}
function receiptHTML(o,prev){
  const s=db.set,r=s.rc,fs={small:11,normal:12,large:14}[r.font]||12;
  const h=receiptModel(o).map(e=>{
    if(e.t==='logo')return`<img src="${imgSrc(db.set.logo)}" alt="" style="width:${r.logoW}px;max-width:90%">`;
    if(e.t==='hr')return`<hr class="${r.divider==='equal'?'equal':''}">`;
    if(e.t==='qr')return`<div class="rq">${e.cap?`<div class="rqc">${esc(e.cap)}</div>`:''}${qrSvg(e.x,150)}</div>`;
    if(e.t==='text'&&e.huge){const em=Math.min(e.huge===3?3.4:2.3,Math.max(1.3,(e.huge===3?26:17)/Math.max(6,String(e.x).length)));return`<div class="rtb" style="font-size:${em.toFixed(2)}em">${esc(e.x)}</div>`}
    if(e.t==='text')return`<div style="text-align:${e.a||'left'};${e.b?'font-weight:700;':''}${e.big?'font-size:1.3em;':''}">${esc(e.x)}</div>`;
    return`<div class="r${e.b?' b':''}${e.big?' big':''}"><span>${esc(e.l)}</span><span>${esc(e.r)}</span></div>`;
  }).join('');
  return`<div ${prev?'':'id="receipt" '}class="rcpt ${s.paper==='58'?'p58':''}" style="font-size:${fs}px">${h}</div>`;
}
function showReceipt(o,fresh){
  S.rcOrder=o;S.rcFresh=!!fresh;setPageSize();
  openModal(`<h3>Struk</h3><div class="rc-wrap">${receiptHTML(o)}</div>
  <button class="btn" onclick="printReceipt(S.rcOrder)"><i class="ic" data-ic="print"></i>Cetak Struk</button>
  <button class="btn sec" onclick="${fresh?'newTx()':'closeModal()'}">${fresh?'Selesai':'Tutup'}</button>`);
  if(fresh&&db.set.prn.auto)setTimeout(()=>printReceipt(o),250);
}
function setPageSize(){$('#pageStyle').textContent=`@media print{@page{size:${db.set.paper}mm auto;margin:0}}`}

/* ---------- ESC/POS builder ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ascii=t=>String(t==null?'':t).replace(/€/g,'EUR').replace(/£/g,'GBP').replace(/¥/g,'JPY').replace(/฿/g,'THB').replace(/[\u00a0\u202f]/g,' ').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7e]/g,'');
function wrapTxt(t,n){
  const out=[];
  String(t).split('\n').forEach(para=>{
    let line='';
    para.split(' ').forEach(w=>{
      if(line&&(line+' '+w).length>n){out.push(line);line=w}
      else line=line?line+' '+w:w;
      while(line.length>n){out.push(line.slice(0,n));line=line.slice(n)}
    });
    out.push(line);
  });
  return out;
}
function rowTxt(l,r,n){
  l=ascii(l);r=ascii(r);
  const max=n-r.length-1;
  if(l.length>max)l=l.slice(0,Math.max(0,max));
  return l+' '.repeat(Math.max(1,n-l.length-r.length))+r;
}
function imgToRaster(src,dots,w){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
      try{
        const h=Math.max(1,Math.round(im.height*w/im.width)),c=document.createElement('canvas');
        c.width=dots;c.height=h;
        const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,dots,h);x.drawImage(im,Math.round((dots-w)/2),0,w,h);
        const d=x.getImageData(0,0,dots,h).data,bpr=dots/8,o=[0x1d,0x76,0x30,0,bpr&255,bpr>>8,h&255,h>>8];
        for(let y=0;y<h;y++)for(let b=0;b<bpr;b++){
          let v=0;
          for(let k=0;k<8;k++){const i=(y*dots+b*8+k)*4;if(d[i]*.3+d[i+1]*.59+d[i+2]*.11<140)v|=0x80>>k}
          o.push(v);
        }
        res(o);
      }catch(e){res([])}
    };
    im.onerror=()=>res([]);
    im.src=src;
  });
}
function qrRaster(text,dots){
  try{
    const M=qrMatrix(text),n=M.length,q=4,sc=Math.max(2,Math.floor(Math.min(dots,264)/(n+2*q))),W=(n+2*q)*sc,c=document.createElement('canvas');
    c.width=W;c.height=W;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,W);x.fillStyle='#000';
    for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(M[r][k])x.fillRect((k+q)*sc,(r+q)*sc,sc,sc);
    return imgToRaster(c.toDataURL('image/png'),dots,W);
  }catch(e){return Promise.resolve([])}
}
async function buildEscPos(o){
  const s=db.set,p=s.prn,r=s.rc,small=r.font==='small',large=r.font==='large';
  const dots=s.paper==='58'?384:576,cols=s.paper==='58'?(small?42:32):(small?64:48);
  const base=(small?1:0)|(large?0x10:0),out=[];
  const add=a=>{for(let i=0;i<a.length;i++)out.push(a[i])};
  const line=t=>{const a=ascii(t);for(let i=0;i<a.length;i++)out.push(a.charCodeAt(i));out.push(0x0a)};
  const mode=x=>add([0x1b,0x21,base|x]);
  const align=a=>add([0x1b,0x61,a==='center'?1:a==='right'?2:0]);
  add([0x1b,0x40,0x1b,0x4d,small?1:0]);
  for(const e of receiptModel(o)){
    if(e.t==='logo'){
      align('center');
      add(await imgToRaster(db.set.logo,dots,Math.min(r.logoW,dots)));
      out.push(0x0a);
    }else if(e.t==='qr'){
      align('center');mode(0);
      if(e.cap)wrapTxt(ascii(e.cap),cols).forEach(line);
      add(await qrRaster(e.x,dots));
      out.push(0x0a);
    }else if(e.t==='hr'){
      align('left');mode(0);line((r.divider==='equal'?'=':'-').repeat(cols));
    }else if(e.t==='text'&&e.huge){
      const t=ascii(e.x);let k=e.huge;while(k>1&&t.length*k>cols)k--;
      align('center');mode(0x08);add([0x1d,0x21,((k-1)<<4)|(k-1)]);
      wrapTxt(t,Math.max(1,Math.floor(cols/k))).forEach(line);
      add([0x1d,0x21,0]);
    }else if(e.t==='text'){
      const n=e.big?Math.floor(cols/2):cols;
      align(e.a);mode((e.b?0x08:0)|(e.big?0x30:0));
      wrapTxt(ascii(e.x),n).forEach(line);
    }else{
      align('left');mode((e.b?0x08:0)|(e.big?0x10:0));
      line(rowTxt(e.l,e.r,cols));
    }
  }
  align('left');mode(0);
  for(let i=0;i<(r.feed||0);i++)out.push(0x0a);
  if(p.drawer)add([0x1b,0x70,0x00,0x19,0xfa]);
  if(p.cut)add([0x1d,0x56,0x42,0x00]);
  return new Uint8Array(out);
}

/* ---------- koneksi printer ---------- */
const PRN={dev:null,ch:null,port:null,writer:null,st:''};
const BLE_UUIDS=['000018f0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000fff0-0000-1000-8000-00805f9b34fb','0000ae30-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455'];

const lsGet=k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}};
const lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}};
const PRN_BOUND=new WeakSet();
function bleBind(dev){
  PRN.dev=dev;PRN.ch=null;
  if(PRN_BOUND.has(dev))return;PRN_BOUND.add(dev);
  dev.addEventListener('gattserverdisconnected',()=>{PRN.ch=null;PRN.st='';updatePrnStatus();bleAutoSoon(1500)});
}
/* buka koneksi GATT + cari karakteristik tulis; ingat printer ini untuk sambung otomatis berikutnya */
async function bleOpen(dev){
  bleBind(dev);PRN.st='connecting';updatePrnStatus();
  try{
    const srv=await dev.gatt.connect(),cands=[];
    for(const sv of await srv.getPrimaryServices()){
      for(const c of await sv.getCharacteristics()){
        if(c.properties.writeWithoutResponse||c.properties.write)cands.push(c);
      }
    }
    const ch=cands.find(c=>c.properties.writeWithoutResponse)||cands[0];
    if(!ch)throw new Error('Karakteristik tulis printer tidak ditemukan. Isi UUID service printer di opsi lanjutan.');
    PRN.ch=ch;lsSet('pos_bleid',dev.id);lsSet('pos_blename',dev.name||'');lsSet('pos_bleoff',null);
  }finally{PRN.st='';updatePrnStatus()}
}
async function bleSaved(){
  const id=lsGet('pos_bleid');if(!id||!navigator.bluetooth||!navigator.bluetooth.getDevices)return null;
  try{return (await navigator.bluetooth.getDevices()).find(d=>d.id===id)||null}catch(e){return null}
}
async function bleConnect(pick){
  if(!navigator.bluetooth)throw new Error('Web Bluetooth tidak didukung di browser ini. Pakai Chrome (Android/Windows/Mac) atau Bluefy (iPhone).');
  for(let n=0;bleBusy&&n<100;n++)await sleep(100);
  if(!pick&&PRN.dev&&PRN.dev.gatt.connected&&PRN.ch)return;
  if(pick&&PRN.dev&&PRN.dev.gatt.connected){lsSet('pos_bleoff','1');PRN.dev.gatt.disconnect()}
  let dev=pick?null:(PRN.dev||await bleSaved());
  if(!dev){
    const opt=BLE_UUIDS.slice(),u=String(db.set.prn.uuid||'').trim().toLowerCase();
    if(u)opt.push(/^[0-9a-f]{4}$/.test(u)?parseInt(u,16):u);
    dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:opt});
  }
  await bleOpen(dev);
}
/* sambung otomatis ke printer sebelumnya (saat aplikasi dibuka, kembali ke aplikasi, atau koneksi putus) */
let bleBusy=false,bleTry=0,bleTm=null;
async function bleAuto(){
  const p=db.set.prn;
  if(p.mode!=='ble'||p.autoConn===false||bleBusy||document.hidden)return;
  if(!navigator.bluetooth||!navigator.bluetooth.getDevices)return;
  if(PRN.dev&&PRN.dev.gatt.connected&&PRN.ch)return;
  if(!lsGet('pos_bleid')||lsGet('pos_bleoff'))return;
  bleBusy=true;
  try{
    const dev=await bleSaved();
    if(!dev)return;                    /* izin tidak tersimpan: perlu Cari & Hubungkan sekali lagi */
    await bleOpen(dev);bleTry=0;
  }catch(e){
    PRN.ch=null;
    if(++bleTry<=3&&!document.hidden){clearTimeout(bleTm);bleTm=setTimeout(bleAuto,[0,3000,8000,20000][bleTry])}
    else bleTry=0;
  }finally{bleBusy=false;updatePrnStatus()}
}
function bleAutoSoon(ms){clearTimeout(bleTm);bleTm=setTimeout(()=>{bleTry=0;bleAuto()},ms||0)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)bleAutoSoon(400)});
async function sendBLE(data){
  await bleConnect(false);
  const p=db.set.prn;let size=Math.max(20,+p.chunk||100);
  for(let i=0;i<data.length;){
    const part=data.slice(i,i+size);
    try{
      if(PRN.ch.properties.writeWithoutResponse)await PRN.ch.writeValueWithoutResponse(part);
      else await PRN.ch.writeValue(part);
      i+=part.length;
    }catch(e){
      if(size>20){size=20;continue}
      throw e;
    }
    await sleep(+p.delay||15);
  }
}
async function serialClose(){
  try{if(PRN.writer)PRN.writer.releaseLock()}catch(e){}
  try{if(PRN.port)await PRN.port.close()}catch(e){}
  PRN.port=null;PRN.writer=null;
}
async function serialConnect(pick){
  if(!navigator.serial)throw new Error('Web Serial tidak didukung. Pakai Chrome/Edge di komputer (Windows/Mac/Linux).');
  if(!pick&&PRN.port&&PRN.writer)return;
  if(PRN.port)await serialClose();
  const port=await navigator.serial.requestPort(pick?{}:{auto:true});
  await port.open({baudRate:+db.set.prn.baud||9600});
  PRN.port=port;PRN.writer=port.writable.getWriter();updatePrnStatus();
}
async function sendSerial(data){
  await serialConnect(false);
  await PRN.writer.write(data);
}
function sendRawBT(data){
  let bin='';
  for(let i=0;i<data.length;i+=8192)bin+=String.fromCharCode.apply(null,data.subarray(i,i+8192));
  location.href='intent:base64,'+btoa(bin)+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
}
async function printReceipt(o){
  const p=db.set.prn;
  if(p.mode==='browser'){const done=()=>{window.removeEventListener('afterprint',done);afterPrint()};window.addEventListener('afterprint',done);setPageSize();window.print();return}
  try{
    const data=await buildEscPos(o);
    if(p.mode==='ble')await sendBLE(data);
    else if(p.mode==='serial')await sendSerial(data);
    else sendRawBT(data);
    toast('Struk dikirim ke printer');
    afterPrint();
  }catch(e){
    console.error(e);
    toast(e&&e.name==='NotFoundError'?'Pemilihan printer dibatalkan':'Gagal cetak: '+((e&&e.message)||e));
  }
  updatePrnStatus();
}
function prnForget(){
  lsSet('pos_bleid',null);lsSet('pos_blename',null);lsSet('pos_bleoff',null);
  try{if(PRN.dev&&PRN.dev.gatt.connected)PRN.dev.gatt.disconnect()}catch(e){}
  PRN.dev=null;PRN.ch=null;updatePrnStatus();toast('Printer yang tersimpan dilupakan');
}
async function prnConnect(){
  const m=db.set.prn.mode;
  try{
    if(m==='ble'){await bleConnect(true);toast('Terhubung ke '+(PRN.dev.name||'printer'))}
    else if(m==='serial'){await serialConnect(true);toast('Port serial terhubung')}
    else toast('Mode ini tidak perlu koneksi manual');
  }catch(e){
    toast(e&&e.name==='NotFoundError'?'Pemilihan printer dibatalkan':'Gagal: '+((e&&e.message)||e));
  }
  updatePrnStatus();
}
async function prnDisconnect(){
  lsSet('pos_bleoff','1');
  try{if(PRN.dev&&PRN.dev.gatt.connected)PRN.dev.gatt.disconnect()}catch(e){}
  PRN.ch=null;
  await serialClose();
  updatePrnStatus();toast('Koneksi printer diputus');
}
function updatePrnStatus(){
  const el=$('#prnStat');if(!el)return;
  const m=db.set.prn.mode;let ok=true,t='';
  if(m==='browser')t='Memakai dialog cetak browser';
  else if(m==='rawbt')t='Dikirim lewat aplikasi RawBT';
  else if(m==='ble'){
    ok=!!(PRN.dev&&PRN.dev.gatt.connected&&PRN.ch);const sv=lsGet('pos_blename');
    t=ok?'Terhubung: '+(PRN.dev.name||'printer BLE'):PRN.st==='connecting'?'Menyambung ke '+(sv||'printer')+'…':'Belum terhubung'+(sv?' (tersimpan: '+sv+')':'');
  }
  else{ok=!!PRN.writer;t=ok?'Terhubung: port serial':'Belum terhubung'}
  el.className='chg'+(ok?'':' neg');
  el.innerHTML='<span>Status</span><span>'+esc(t)+'</span>';
}
function sampleOrder(){
  const k=db.set.cur==='Rp'?10000:(dec()===0?100:1),pr=[2.5*k,4.5*k,3*k];
  const sub=rnd(2*pr[0]+pr[1]+3*pr[2]),disc=rnd(k),base=rnd(sub-disc),tax=rnd(base*db.set.tax/100),total=rnd(base+tax),paid=Math.ceil(total/(5*k))*5*k;
  return{no:'INV-CONTOH-0001',t:new Date().toISOString(),type:'Takeaway',cust:'Budi',tbl:'7',cashier:(CL.on&&CL.me)?CL.me.name:'',
    lines:[{name:'Edamame',price:pr[0],qty:2},{name:'Bang Bang Shrimp',price:pr[1],qty:1},{name:'Salmon Nigiri',price:pr[2],qty:3}],
    sub,disc,tax,taxRate:db.set.tax,total,method:'Tunai',paid,change:rnd(paid-total)};
}
function testPrint(){
  const o=sampleOrder();
  if(db.set.prn.mode==='browser')showReceipt(o);else printReceipt(o);
}

/* ---------- inventory ---------- */
function status(i){return i.stock<=0?['out','Habis']:i.stock<=i.min?['low','Menipis']:['ok','Aman']}
const isStaffMode=()=>CL.on&&!isOwner();
function renderInv(){
  const it=db.items,emp=isStaffMode(),val=it.reduce((a,i)=>a+(isB(i)?0:i.stock*(i.cost||0)),0);
  document.querySelectorAll('#v-inv .own-only').forEach(b=>b.hidden=emp);
  $('#invStats').innerHTML=[['Total Item',it.length],...(emp?[]:[['Nilai Stok (modal)',money(val)]]),['Stok Menipis',it.filter(i=>i.stock>0&&i.stock<=i.min).length],['Habis',it.filter(i=>i.stock<=0).length]].map(([a,b])=>`<div class="st"><small>${a}</small><b>${b}</b></div>`).join('');
  renderInvTable();
  renderLog();
}
/* riwayat perubahan stok: tabel berkolom; karyawan hanya melihat catatannya sendiri, owner melihat semua dan bisa memfilter pengguna */
const LOG_COLS=[['t','Waktu'],['name','Menu'],['d','Perubahan'],['s','Stok akhir'],['u','Pengguna'],['note','Keterangan']];
const LOG_ROWS=[10,15,25,50,100];
function logRowsN(){let n=15;try{n=+localStorage.getItem('pos_logrows')||15}catch(e){}return LOG_ROWS.includes(n)?n:15}
function setLogRows(v){try{localStorage.setItem('pos_logrows',String(+v))}catch(e){}S.ln=0;renderLog()}
function logUsers(){const m=new Map();let anon=false;db.log.forEach(l=>{if(l.u)m.set(l.u,l.by||l.u);else anon=true});return{list:[...m.entries()].sort((a,b)=>a[1].localeCompare(b[1])),anon}}
function logRows(){
  let rows=db.log.map((l,i)=>({l,i}));
  if(isStaffMode()){const me=CL.me&&CL.me.username;return rows.filter(r=>r.l.u===me)}
  if(CL.on&&S.logU&&S.logU!=='all')rows=rows.filter(r=>S.logU==='-'?!r.l.u:r.l.u===S.logU);
  return rows;
}
function renderLog(){
  if(!$('#logBody'))return;
  const emp=isStaffMode(),showU=CL.on&&!emp,n=S.ln||logRowsN(),tm=t=>new Date(t).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const sel=$('#logUser');
  if(sel){sel.hidden=!showU;if(showU){const u=logUsers();sel.innerHTML='<option value="all">Semua pengguna</option>'+u.list.map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('')+(u.anon?'<option value="-">Tidak tercatat</option>':'');sel.value=[...sel.options].some(o=>o.value===(S.logU||'all'))?(S.logU||'all'):'all'}}
  const hint=$('#logHint');if(hint){hint.hidden=!emp;hint.textContent=emp?'Hanya perubahan stok yang Anda lakukan sendiri yang ditampilkan.':''}
  const vis=LOG_COLS.filter(([k])=>k!=='u'||showU);
  const rs=$('#logRows');if(rs)rs.innerHTML=LOG_ROWS.map(x=>`<option value="${x}" ${x===logRowsN()?'selected':''}>${x}</option>`).join('');
  $('#logHead').innerHTML='<tr>'+vis.map(([k,l])=>`<th${k==='d'||k==='s'?' class="num"':''}>${l}</th>`).join('')+'</tr>';
  const rows=logRows(),cell={
    t:l=>tm(l.t),name:l=>`<b>${esc(l.name)}</b>`,
    d:l=>`<span class="chgp ${l.d<0?'gd':'gu'}">${l.d>0?'+':''}${l.d}</span>`,
    s:l=>l.s!=null?l.s:'-',u:l=>l.by||l.u?esc(l.by||l.u):'<span class="nu">Tidak tercatat</span>',note:l=>esc(l.note||'')};
  $('#logBody').innerHTML=rows.slice(0,n).map(r=>`<tr onclick="logOpen(${r.i})">`+vis.map(([k])=>`<td class="c-${k==='name'?'name':k}${k==='d'||k==='s'?' num':''}">${cell[k](r.l)}</td>`).join('')+'</tr>').join('')||`<tr><td colspan="${Math.max(1,vis.length)}" style="color:var(--mu)">Belum ada perubahan.</td></tr>`;
  $('#logMore').hidden=rows.length<=n;
  const cn=$('#logCnt');if(cn)cn.textContent=rows.length?`Menampilkan ${Math.min(n,rows.length)} dari ${rows.length} catatan`:'';
}
function logOpen(i){
  const l=db.log[i];if(!l)return;
  const m=/^(?:Penjualan|Hapus transaksi) (\S+)/.exec(l.note||''),o=m&&db.orders.find(x=>x.no===m[1]);
  openModal(`<h3>Perubahan Stok</h3><table class="dl">
  <tr><td>Item</td><td>${esc(l.name)}</td></tr>
  <tr><td>Perubahan</td><td style="color:${l.d<0?'var(--bad)':'var(--ok)'}">${l.d>0?'+':''}${l.d}</td></tr>
  ${l.s!=null?`<tr><td>Stok akhir</td><td>${l.s}</td></tr>`:''}${CL.on?`<tr><td>Pengguna</td><td>${esc(l.by||l.u||'Tidak tercatat')}</td></tr>`:''}
  <tr><td>Keterangan</td><td style="white-space:normal">${esc(l.note)}</td></tr>
  <tr><td>Waktu</td><td style="white-space:normal">${new Date(l.t).toLocaleString(dloc(),{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td></tr></table>
  ${o?`<button class="btn" onclick="histOpen('${esc(o.no)}')">Lihat transaksi ${esc(o.no)}</button>`:''}
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
/* catatan riwayat stok: siapa, kapan, berapa, stok akhir */
function logAdd(name,d,note,stock,t){
  const e={t:t||new Date().toISOString(),name,d,note};
  if(stock!=null)e.s=stock;
  if(CL.on&&CL.me){e.u=CL.me.username;e.by=CL.me.name}
  db.log.unshift(e);
}
function setStock(id,v){
  const i=find(id);if(!i||isB(i))return;v=Math.max(0,Math.floor(+v||0));
  if(v!==i.stock){const d=v-i.stock;i.stock=v;logAdd(i.name,d,'Penyesuaian manual',v);db.log=db.log.slice(0,LOG_MAX);save()}
  renderInv();
}

/* ---------- add / edit item ---------- */
/* karyawan: hanya boleh menambah stok (tidak bisa kurangi/hapus/ubah item) */
function stockForm(id){
  const i=find(id);if(!i||isB(i))return;
  openModal(`<h3>${esc(i.name)}</h3>
  <div class="stkadd"><span>Stok sekarang</span><b>${i.stock}</b></div>
  <label class="fl" for="sAdd">Tambah stok</label><input class="fi" id="sAdd" type="number" inputmode="numeric" min="1" step="1" placeholder="0" autofocus>
  <p class="hint" id="sAddE" style="color:var(--bad);min-height:16px;margin:4px 0"></p>
  <button class="btn" onclick="stockAdd('${id}')">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  setTimeout(()=>{const e=$('#sAdd');if(e)e.focus()},60);
}
function stockAdd(id){
  const i=find(id);if(!i||isB(i))return;const n=Math.floor(+$('#sAdd').value||0);
  if(n<1){$('#sAddE').textContent='Isi jumlah stok yang ditambah';return}
  const v=i.stock+n;i.stock=v;logAdd(i.name,n,'Tambah stok',v);db.log=db.log.slice(0,LOG_MAX);save();closeModal();renderInv();toast('Stok +'+n);
}
function itemForm(id,ns){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const i=id?find(id):{name:'',cat:db.cats[0]||'',price:'',cost:'',stock:0,min:db.set.low,img:'',emoji:'🍽️',ns:ns?1:0};
  S.edit={id:id||null,img:i.img,rc:!!i.rc,bd:isB(i)?i.bundle.map(c=>({id:c.id,q:c.q})):[]};
  openModal(`<h3>${id?'Edit':'Tambah'} Item</h3>
  <div class="up"><div class="pv" id="pv">${i.img?`<img src="${imgSrc(i.img)}" alt="">`:emo(i)}</div>
  <div><button class="btn sm sec" onclick="$('#imgF').click()"><i class="ic" data-ic="camera"></i>Upload Gambar</button>
  <button class="mini" onclick="S.edit.img='';$('#pv').innerHTML=emo({})">Hapus</button>
  <input type="file" id="imgF" accept="image/*" hidden onchange="pickImg(this)"></div></div>
  <label class="fl">Nama item *</label><input class="fi" id="fN" value="${esc(i.name)}">
  <div class="two"><div><label class="fl">Kategori</label><select class="fi" id="fC">${db.cats.map(c=>`<option ${c===i.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
  <div><label class="fl">atau kategori baru</label><input class="fi" id="fC2" placeholder="Opsional"></div></div>
  <div class="two"><div><label class="fl">Harga jual *</label><input class="fi" id="fP" type="number" step="any" min="0" value="${i.price}"></div>
  <div><label class="fl">Harga modal</label><input class="fi" id="fK" type="number" step="any" min="0" value="${i.cost||''}"></div></div>
  <div class="two"><div><label class="fl">Barcode (opsional)</label><input class="fi" id="fBC" value="${esc(i.bc||'')}" inputmode="text" autocomplete="off" placeholder="Scan / ketik"></div><div style="display:flex;align-items:flex-end"><button type="button" class="btn sec" style="margin:0;width:100%" onclick="P2.scan(c=>{$('#fBC').value=c;return true},{once:true,keep:true})"><i class="ic" data-ic="camera"></i>Scan kamera</button></div></div>
  <div class="two"><div><label class="fl">Stasiun (opsional)</label><input class="fi" id="fSt" list="stL" maxlength="20" placeholder="Dapur / Bar" value="${esc(i.stn||'')}"><datalist id="stL"><option>Dapur</option><option>Bar</option><option>Dessert</option></datalist></div>
  <div><label class="fl">Satuan beli (opsional)</label><div style="display:flex;gap:6px"><input class="fi" id="fPuN" maxlength="12" placeholder="karung" value="${esc((i.pu||{}).n||'')}" style="flex:1;min-width:0"><input class="fi" id="fPuF" type="number" min="0" step="any" inputmode="decimal" placeholder="isi" value="${(i.pu||{}).f||''}" style="width:72px"></div></div></div>
  <small class="hint" style="display:block;margin:-2px 0 6px">Satuan beli: mis. 1 karung = 25000 (gram). Dipakai di Pembelian agar stok bertambah otomatis.</small>
  <label class="fl">Varian &amp; tambahan (opsional)</label><textarea class="fi" id="fMods" rows="3" placeholder="Level pedas (wajib): Sedang, Pedas, Extra pedas +2000&#10;Topping (banyak): Keju +5000, Telur +4000" style="min-height:70px">${esc(modsText(i.mods))}</textarea>
  <small class="hint">Satu baris satu grup. Tulis (wajib) bila harus dipilih, (banyak) bila boleh pilih lebih dari satu, dan +harga untuk tambahan biaya.</small>
  <label class="tgl"><input type="checkbox" id="fNS" ${i.ns?'checked':''} onchange="nsToggle()"><span>Bahan / tidak dijual (hanya untuk stok &amp; opname, tidak muncul di Kasir)</span></label>
  <label class="tgl" id="fBL" ${i.ns?'hidden':''}><input type="checkbox" id="fB" ${isB(i)?'checked':''} onchange="bdToggle()"><span>Item paket / resep (berisi beberapa item)</span></label>
  <div id="bdTypeW" ${isB(i)?'':'hidden'}><label class="fl">Jenis isi</label><select class="fi" id="fBT" onchange="S.edit.rc=this.value==='rc';bdRender()"><option value="pk" ${i.rc?'':'selected'}>Paket: beberapa menu dijual jadi satu</option><option value="rc" ${i.rc?'selected':''}>Resep: kurangi bahan otomatis saat terjual</option></select></div>
  <div id="bdBox" ${isB(i)?'':'hidden'}>  <div id="bdRows"></div><button class="btn sm sec" type="button" onclick="bdAdd()">+ Tambah isi</button></div>
  <div id="stkRow" style="${isB(i)?'display:none':''}"><div class="two"><div><label class="fl">Stok</label><input class="fi" id="fS" type="number" min="0" step="any" value="${isB(i)?0:i.stock}"></div>
  <div><label class="fl">Batas stok menipis</label><input class="fi" id="fM" type="number" min="0" value="${i.min}"></div></div></div>
  <button class="btn" onclick="saveItem()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>${id?`<button class="btn red" onclick="delItem('${id}')">Hapus Item</button>`:''}`);
  bdRender();
}
function bdOpts(sel){const me=S.edit.id;return '<option value="">Pilih item…</option>'+db.items.filter(x=>!isB(x)&&(S.edit.rc||!x.ns)&&x.id!==me).map(x=>`<option value="${esc(x.id)}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('')}
function bdRender(){const e=$('#bdRows');if(!e)return;e.innerHTML=S.edit.bd.map((c,k)=>`<div class="bdr"><input class="fi" type="number" min="0.001" step="any" inputmode="decimal" value="${c.q}" aria-label="Jumlah isi" onchange="bdSet(${k},'q',this.value)"><span>×</span><select class="fi" aria-label="Item isi" onchange="bdSet(${k},'id',this.value)">${bdOpts(c.id)}</select><button class="mini" type="button" onclick="bdDel(${k})">Hapus</button></div>`).join('')}
function bdSet(k,f,v){const c=S.edit.bd[k];if(!c)return;if(f==='q')c.q=Math.max(.001,Math.round((+v||1)*1000)/1000);else c.id=v}
function bdAdd(){S.edit.bd.push({id:'',q:1});bdRender()}
function bdDel(k){S.edit.bd.splice(k,1);bdRender()}
function nsToggle(){const on=$('#fNS').checked;if(on){if(S.edit.id&&bdUsedBy(S.edit.id)){$('#fNS').checked=false;toast('Item ini jadi isi paket, tidak bisa dijadikan bahan');return}$('#fB').checked=false;bdToggle()}$('#fBL').hidden=on}
function bdToggle(){const on=$('#fB').checked;if(on&&bdUsedBy(S.edit.id)){$('#fB').checked=false;toast('Item ini sudah jadi isi paket lain, tidak bisa dijadikan paket');return}$('#bdBox').hidden=!on;{const w=$('#bdTypeW');if(w)w.hidden=!on}$('#stkRow').style.display=on?'none':'';if(on&&!S.edit.bd.length)S.edit.bd.push({id:'',q:1});bdRender()}
/* ---------- pangkas (crop) gambar: dipakai untuk logo dan gambar menu ---------- */
function cropImg(file,o){
  const rd=new FileReader();
  rd.onload=e=>{const im=new Image();im.onload=()=>cropUi(im,o);im.onerror=()=>toast('Gambar tidak valid');im.src=e.target.result};
  rd.onerror=()=>toast('Gambar tidak bisa dibaca');rd.readAsDataURL(file);
}
function cropUi(im,o){
  const old=document.getElementById('cropOv');if(old)old.remove();
  const asp=(o.aspects||[['1:1',1]]).map(a=>a[1]==='img'?[a[0],im.width/im.height]:a);
  const ov=document.createElement('div');ov.id='cropOv';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:#111;display:flex;flex-direction:column;color:#fff;font-family:system-ui,sans-serif;touch-action:none';
  ov.innerHTML=`<div style="padding:14px 16px;font-weight:700;font-size:17px">${esc(o.title||'Pangkas gambar')}</div>
  <div id="crStage" style="flex:1;position:relative;overflow:hidden;touch-action:none"><canvas id="crC" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
  <div style="padding:10px 16px 6px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center" id="crAsp"></div>
  <div style="padding:4px 20px;display:flex;align-items:center;gap:10px"><span style="font-size:13px;opacity:.7">Zoom</span><input id="crZ" type="range" min="1" max="4" step="0.01" value="1" style="flex:1"></div>
  <div style="padding:10px 16px calc(14px + env(safe-area-inset-bottom));display:flex;gap:10px"><button id="crNo" type="button" style="flex:1;padding:14px;border:0;border-radius:14px;background:#333;color:#fff;font-size:16px">Batal</button><button id="crOk" type="button" style="flex:2;padding:14px;border:0;border-radius:14px;background:#111;color:#fff;font-weight:700;font-size:16px">Pakai gambar</button></div>`;
  document.body.appendChild(ov);
  const cv=ov.querySelector('#crC'),st=ov.querySelector('#crStage'),zr=ov.querySelector('#crZ'),ab=ov.querySelector('#crAsp');
  let ai=0,W=0,H=0,fx=0,fy=0,fw=0,fh=0,base=1,z=1,ox=0,oy=0;
  const clamp=()=>{const s=base*z,iw=im.width*s,ih=im.height*s;ox=Math.min(fx,Math.max(fx+fw-iw,ox));oy=Math.min(fy,Math.max(fy+fh-ih,oy))};
  const frame=()=>{
    const r=st.getBoundingClientRect();W=Math.max(50,r.width);H=Math.max(50,r.height);
    const dpr=window.devicePixelRatio||1;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    const a=asp[ai][1],pad=20;let w=W-pad*2,h=w/a;if(h>H-pad*2){h=H-pad*2;w=h*a}
    fw=w;fh=h;fx=(W-w)/2;fy=(H-h)/2;base=Math.max(fw/im.width,fh/im.height);
  };
  const draw=()=>{
    clamp();const x=cv.getContext('2d'),dpr=cv.width/W,s=base*z;
    x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle='#111';x.fillRect(0,0,W,H);
    x.drawImage(im,ox,oy,im.width*s,im.height*s);
    x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,W,fy);x.fillRect(0,fy+fh,W,H-fy-fh);x.fillRect(0,fy,fx,fh);x.fillRect(fx+fw,fy,W-fx-fw,fh);
    x.strokeStyle='#fff';x.lineWidth=2;x.strokeRect(fx,fy,fw,fh);
    x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1;x.beginPath();
    for(let i=1;i<3;i++){x.moveTo(fx+fw*i/3,fy);x.lineTo(fx+fw*i/3,fy+fh);x.moveTo(fx,fy+fh*i/3);x.lineTo(fx+fw,fy+fh*i/3)}x.stroke();
  };
  const center=()=>{z=1;zr.value=1;const s=base;ox=fx+(fw-im.width*s)/2;oy=fy+(fh-im.height*s)/2};
  const setZ=(nz,cx,cy)=>{
    nz=Math.min(4,Math.max(1,nz));const s0=base*z,s1=base*nz;
    if(cx==null){cx=fx+fw/2;cy=fy+fh/2}
    ox=cx-(cx-ox)*s1/s0;oy=cy-(cy-oy)*s1/s0;z=nz;zr.value=z;draw();
  };
  const chips=()=>{ab.innerHTML=asp.map((a,i)=>`<button type="button" data-i="${i}" style="padding:8px 14px;border:0;border-radius:999px;font-size:14px;background:${i===ai?'#111':'#555'};color:#fff">${esc(a[0])}</button>`).join('')};
  ab.onclick=e=>{const b=e.target.closest('button');if(!b)return;ai=+b.dataset.i;frame();center();chips();draw()};
  if(asp.length<2)ab.style.display='none';
  zr.oninput=()=>setZ(+zr.value);
  const P=new Map();let pd=0;
  const pos=e=>{const r=st.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  st.onpointerdown=e=>{try{st.setPointerCapture(e.pointerId)}catch(x){}P.set(e.pointerId,pos(e));pd=0};
  st.onpointermove=e=>{
    if(!P.has(e.pointerId))return;const [nx,ny]=pos(e),[px,py]=P.get(e.pointerId);
    if(P.size===1){ox+=nx-px;oy+=ny-py;P.set(e.pointerId,[nx,ny]);draw()}
    else{
      const o2=[...P.entries()].find(([k])=>k!==e.pointerId)[1],d0=Math.hypot(px-o2[0],py-o2[1]),d1=Math.hypot(nx-o2[0],ny-o2[1]);
      P.set(e.pointerId,[nx,ny]);if(d0>0)setZ(z*d1/d0,(nx+o2[0])/2,(ny+o2[1])/2);
    }
  };
  st.onpointerup=st.onpointercancel=e=>{P.delete(e.pointerId)};
  st.onwheel=e=>{e.preventDefault();const [x,y]=pos(e);setZ(z*(e.deltaY<0?1.1:1/1.1),x,y)};
  const close=()=>{window.removeEventListener('resize',rs);ov.remove()};
  const rs=()=>{frame();center();draw()};window.addEventListener('resize',rs);
  ov.querySelector('#crNo').onclick=close;
  ov.querySelector('#crOk').onclick=()=>{
    clamp();const s=base*z,sx=(fx-ox)/s,sy=(fy-oy)/s,sw=fw/s,sh=fh/s;
    const k=Math.min(1,(o.max||480)/Math.max(sw,sh)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(sw*k));c.height=Math.max(1,Math.round(sh*k));
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);
    const d=c.toDataURL('image/jpeg',o.q||.85);close();o.cb(d);
  };
  chips();frame();center();draw();
}
function pickImg(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  cropImg(f,{title:'Pangkas gambar menu',aspects:[['1:1',1],['4:3',4/3],['3:4',3/4]],max:480,q:.8,cb:d=>{S.edit.img=d;const pv=$('#pv');if(pv)pv.innerHTML=`<img src="${d}">`}});
}
function modsParse(t){return String(t||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const ix=l.indexOf(':');if(ix<1)return null;let n=l.slice(0,ix).trim(),req=0,multi=0;const fl=/\(([^)]*)\)\s*$/.exec(n);if(fl){const f=fl[1].toLowerCase();req=/wajib/.test(f)?1:0;multi=/banyak/.test(f)?1:0;n=n.slice(0,fl.index).trim()}const o=l.slice(ix+1).split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const m=/^(.*?)(?:\s*\+\s*([\d.]+))?$/.exec(x);return{n:m[1].trim(),p:+m[2]||0}}).filter(x=>x.n);return n&&o.length?{n,req,multi,o}:null}).filter(Boolean).slice(0,8)}
function modsText(m){return (m||[]).map(g=>g.n+(g.req||g.multi?' ('+[g.req?'wajib':'',g.multi?'banyak':''].filter(Boolean).join(', ')+')':'')+': '+g.o.map(o=>o.n+(o.p?' +'+o.p:'')).join(', ')).join('\n')}
function saveItem(){
  const ns=$('#fNS').checked,name=$('#fN').value.trim(),price=rnd(+$('#fP').value);
  if(!name){toast('Nama wajib diisi');return}
  if(!(price>=0)||($('#fP').value===''&&!ns)){toast('Harga wajib diisi');return}
  let cat=$('#fC2').value.trim()||$('#fC').value;
  if(!cat){toast('Pilih / isi kategori');return}
  if(!db.cats.includes(cat))db.cats.push(cat);
  let bundle=null;
  if(!ns&&$('#fB').checked){
    const m=new Map();(S.edit.bd||[]).forEach(c=>{if(c.id&&find(c.id)&&c.id!==S.edit.id)m.set(c.id,Math.round(((m.get(c.id)||0)+Math.max(.001,+c.q||1))*1000)/1000)});
    bundle=[...m].map(([id,q])=>({id,q}));
    if(!bundle.length){toast('Pilih minimal 1 isi paket');return}
    if(bundle.some(c=>isB(find(c.id)))){toast('Isi paket tidak boleh berupa paket lain');return}
  }
  const stock=bundle?0:Math.round(Math.max(0,+$('#fS').value||0)*1000)/1000;
  let cost=rnd(+$('#fK').value||0);
  if(bundle&&!cost)cost=rnd(bundle.reduce((a,c)=>a+c.q*((find(c.id)||{}).cost||0),0));
  const d={name,cat,price,cost,stock,min:Math.max(0,Math.floor(+($('#fM')||{}).value||0)),img:S.edit.img||''};
  {const bc=($('#fBC').value||'').trim();if(bc){if(db.items.some(x=>x.bc===bc&&x.id!==S.edit.id)){toast('Barcode sudah dipakai menu lain');return}d.bc=bc}const mods=modsParse($('#fMods').value);if(mods.length)d.mods=mods;if(bundle&&S.edit.rc)d.rc=1}
  {const st=($('#fSt').value||'').trim().slice(0,20);if(st)d.stn=st;const pn=($('#fPuN').value||'').trim().slice(0,12),pf=+$('#fPuF').value;if(pn&&pf>0&&!bundle)d.pu={n:pn,f:pf}}
  if(ns)d.ns=1;
  if(S.edit.id){const i=find(S.edit.id);if(!isB(i)&&!bundle&&stock!==i.stock)logAdd(name,stock-i.stock,'Edit item',stock);if(bundle&&!isB(i)&&i.stock)logAdd(name,-i.stock,'Dijadikan item paket',0);Object.assign(i,d);if(!ns)delete i.ns;if(!d.mods)delete i.mods;if(!d.bc)delete i.bc;if(!d.rc)delete i.rc;if(!d.stn)delete i.stn;if(!d.pu)delete i.pu;if(bundle)i.bundle=bundle;else delete i.bundle}
  else{const ni={id:uid(),emoji:'🍽️',...d};if(bundle)ni.bundle=bundle;db.items.push(ni);if(!bundle&&stock)logAdd(name,stock,'Stok awal',stock)}
  save();closeModal();render();toast('Item disimpan');
}

/* ---------- history ---------- */
const dkey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
S.hr='today';S.hf='';S.ht='';
/* periode Beranda: preset dihitung ulang tiap render (supaya "Hari ini" ikut berganti saat lewat tengah malam); 'custom' memakai tanggal yang dipilih */
function hrSync(){
  const k=S.hr;if(k==='custom')return;
  const now=new Date(),off=n=>{const d=new Date(now);d.setDate(d.getDate()-n);return dkey(d)};
  if(k==='today')S.hf=S.ht=off(0);
  else if(k==='yest')S.hf=S.ht=off(1);
  else if(k==='7'){S.hf=off(6);S.ht=off(0)}
  else if(k==='month'){S.hf=dkey(new Date(now.getFullYear(),now.getMonth(),1));S.ht=off(0)}
  else{S.hf=S.ht=''}
}
hrSync();
function setHR(k){S.hr=k;S.hn=25;hrSync();renderHome()}
function histOpen(no){
  const x=db.orders.find(o=>o.no===no);if(!x)return;
  const cost=x.lines.reduce((a,l)=>a+(l.cost||0)*l.qty,0);
  openModal(`<h3>${esc(x.no)}</h3>
  <div class="hint" style="margin:-6px 0 6px">${new Date(x.t).toLocaleString(dloc(),{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
  <table class="dl">
  <tr><td>Tipe</td><td>${esc(x.type)}</td></tr>
  <tr><td>Metode bayar</td><td>${esc(x.method)}</td></tr>
  ${x.cashier?`<tr><td>Kasir</td><td>${esc(x.cashier)}</td></tr>`:''}${x.cust?`<tr><td>Pelanggan</td><td style="white-space:normal">${esc(x.cust)}</td></tr>`:''}</table>
  <table class="dl">${x.lines.map(l=>`<tr><td>${l.qty}× ${esc(l.name)}<br><small>${money(l.price)}</small>${Array.isArray(l.bd)&&l.bd.length?`<br><small>Isi: ${esc(bdLbl(l.bd))}</small>`:''}</td><td>${money(l.price*l.qty)}</td></tr>`).join('')}</table>
  <table class="dl">
  <tr><td>Subtotal</td><td>${money(x.sub)}</td></tr>
  ${x.disc?`<tr><td>Diskon</td><td>−${money(x.disc)}</td></tr>`:''}${x.tax?`<tr><td>Pajak</td><td>${money(x.tax)}</td></tr>`:''}
  <tr class="tt"><td>Total</td><td>${money(x.total)}</td></tr>
  ${x.method==='Tunai'?`<tr><td>Diterima</td><td>${money(x.paid)}</td></tr><tr><td>Kembalian</td><td>${money(x.change||0)}</td></tr>`:''}
  ${isOwner()?`<tr><td>Estimasi laba</td><td>${money(x.total-x.tax-cost)}</td></tr>`:''}</table>
  <button class="btn" onclick="showReceipt(db.orders.find(o=>o.no==='${esc(x.no)}'))"><i class="ic" data-ic="print"></i>Lihat / Cetak Struk</button>
  ${isOwner()?`<button class="btn sec" style="color:var(--bad)" onclick="histDel('${esc(x.no)}')"><i class="ic" data-ic="trash"></i>Hapus transaksi</button>`:''}
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function histDel(no){
  const x=db.orders.find(o=>o.no===no);if(!x||!isOwner())return;
  openModal(`<h3>Hapus transaksi?</h3>
  <label class="tgl"><input type="checkbox" id="hdBack" checked><span>Kembalikan stok item ke inventori</span></label>
  <button class="btn" style="background:var(--bad)" onclick="histDelDo('${esc(x.no)}')">Ya, hapus</button>
  <button class="btn sec" onclick="histOpen('${esc(x.no)}')">Batal</button>`);
}
function histDelDo(no){
  if(!isOwner())return;
  const i=db.orders.findIndex(o=>o.no===no);if(i<0){closeModal();return}
  const o=db.orders[i],back=!!($('#hdBack')||{}).checked,now=new Date().toISOString();
  if(back)o.lines.forEach(l=>{if(Array.isArray(l.bd)&&l.bd.length){l.bd.forEach(c=>{const x=find(c.id);if(x&&!isB(x)){const d=c.q*l.qty;x.stock+=d;logAdd(x.name,d,'Hapus transaksi '+no,x.stock,now)}});return}const it=l.id&&find(l.id);if(it&&!isB(it)){it.stock+=l.qty;logAdd(it.name,l.qty,'Hapus transaksi '+no,it.stock,now)}});
  db.log=db.log.slice(0,LOG_MAX);
  db.voided=[{no,t:o.t,total:o.total,method:o.method,by:(CL.me&&CL.me.name)||'Owner',at:now,back},...(db.voided||[])].slice(0,200);
  if(o.mem){const mm=(db.members||[]).find(x=>x.id===o.mem.id);if(mm){mm.pts=Math.max(0,(+mm.pts||0)-(o.mem.earn||0)+(o.mem.used||0));mm.visits=Math.max(0,(+mm.visits||1)-1);mm.spent=Math.max(0,rnd((+mm.spent||0)-o.total));mm.u=Date.now()}}
  db.orders.splice(i,1);save();closeModal();toast('Transaksi dihapus');render();
}
function setHD(){
  let f=$('#hFrom').value,t=$('#hTo').value;
  if(f&&t&&f>t){const x=f;f=t;t=x}
  S.hn=25;S.hf=f;S.ht=t;S.hr=(f||t)?'custom':'all';renderHome();
}
/* daftar transaksi pada periode terpilih (bagian bawah Beranda) */
function renderHist(){
  const hb=$('#histBody');if(!hb)return;
  const o=db.orders,rows=[];
  o.forEach((x,i)=>{const k=dkey(x.t);if((!S.hf||k>=S.hf)&&(!S.ht||k<=S.ht))rows.push({x,i,k})});
  const sum=l=>l.reduce((a,b)=>a+b.total,0);
  const n=S.hn||25,tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  let h='',cur='';
  for(const r of rows.slice(0,n)){
    if(r.k!==cur){
      cur=r.k;const g=rows.filter(z=>z.k===cur).map(z=>z.x);
      h+=`<div class="dhd"><b>${new Date(r.x.t).toLocaleDateString(dloc(),{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</b> · ${g.length} Transaksi · <b>${money(sum(g))}</b></div>`;
    }
    const x=r.x;
    h+=`<button class="li" data-no="${esc(x.no)}" onclick="histOpen(this.dataset.no)"><span class="l"><b>${esc(x.no)}</b><small>${tm(x.t)} · ${esc(x.type)}${x.tbl?' · Meja '+esc(x.tbl):''}${x.cashier?' · '+esc(x.cashier):''}</small></span><span class="pm ${/tunai|cash/i.test(x.method)?'c':/debit|kartu|card/i.test(x.method)?'d':'w'}">${esc(x.method)}</span><span class="r"><b>${money(x.total)}</b>${x.cust?`<small>${esc(x.cust)}</small>`:''}</span><span class="ch">›</span></button>`;
  }
  $('#histBody').innerHTML=h||'<div style="color:var(--mu);padding:6px 4px">'+(o.length?'Tidak ada transaksi pada periode ini.':'Belum ada transaksi.')+'</div>';
  $('#histMore').hidden=rows.length<=n;
  const vb=$('#voidBox'),vd=db.voided||[];
  if(vb){const was=!!(vb.querySelector('details')||{}).open;vb.hidden=!(isOwner()&&vd.length);if(!vb.hidden)vb.innerHTML=`<details${was?' open':''}><summary style="font-weight:700;cursor:pointer">Transaksi yang dihapus (${vd.length})</summary><div class="vdl" style="margin-top:8px">${vd.slice(0,50).map(v=>`<div><b>${esc(v.no)}</b> · ${money(v.total)} · ${esc(v.method||'')}<br>Dihapus ${new Date(v.at).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} oleh ${esc(v.by||'')}${v.back?' · stok dikembalikan':''}</div>`).join('')}</div></details>`}
}


/* ---------- settings ---------- */
const SETP=[
 ['setForm','Toko','store','Informasi Toko','Nama toko, alamat di struk, pajak, dan batas stok menipis.','nama alamat pajak stok struk gps telepon'],
 ['logoForm','Toko','camera','Logo Perusahaan','Logo yang tampil di aplikasi dan struk.','logo gambar brand'],
 ['curForm','Toko','coin','Mata Uang & Harga','Simbol mata uang dan jumlah desimal harga.','rupiah ringgit harga desimal currency'],
 ['catForm','Toko','tag','Kategori','Kelola kategori menu atau produk.','kategori menu produk'],
 ['coForm','Pesanan & Pembayaran','cart','Pesanan Online','Buka/tutup pemesanan lewat QR dan atur notifikasi pesanan.','qr pesan online tautan buka tutup'],
 ['payForm','Pesanan & Pembayaran','shield','Pembayaran Online','QRIS dinamis dan DuitNow untuk pelanggan.','qris duitnow bayar payment'],
 ['rc','Struk & Printer','receipt','Desain Struk','Tata letak, teks, logo, dan ukuran kertas struk.','struk nota receipt kertas logo footer header','set'],
 ['prn','Struk & Printer','print','Printer','Sambungkan printer Bluetooth/USB dan atur cara cetak.','printer bluetooth usb cetak thermal ble','prn'],
 ['themeForm','Tampilan','sun','Tema','Pilih tampilan terang, gelap, atau otomatis.','gelap terang dark light warna'],
 ['langForm','Tampilan','globe','Bahasa','Bahasa tampilan aplikasi.','language indonesia english'],
 ['attForm','Tim & Absensi','clock','Absensi & Shift','Aktifkan absensi, jam shift, lokasi toko, dan jadwal karyawan.','absen shift jadwal gps lokasi radius selfie telat','#owner'],
 ['secForm','Data & Keamanan','lock','Keamanan Sesi','Keluar otomatis saat tidak dipakai.','sesi timeout idle logout'],
 ['dbForm','Data & Keamanan','cloud','Sinkron & Cadangan','Status sinkron online, ekspor, dan cadangan data.','data backup cadangan sinkron ekspor impor excel']
];
function setTab(k){S.setSub=({toko:'setForm',co:'coForm',tampil:'themeForm',data:'dbForm'})[k]||null;applySetTab()}
function setOpen(id){S.setSub=id;applySetTab();const m=$('main');if(m&&m.scrollTo)m.scrollTo(0,0);window.scrollTo(0,0)}
function setHubList(){
  const box=$('#setHubList');if(!box)return;
  const q=(($('#setQ')||{}).value||'').trim().toLowerCase();
  const its=SETP.filter(p=>p[6]==='#owner'?isOwner():can(p[6]||'set')).filter(p=>{if(p[0]==='rc'||p[0]==='prn')return true;const e=$('#'+p[0]);return e&&!e.hidden}).filter(p=>!q||(p[3]+' '+p[4]+' '+p[5]+' '+p[1]).toLowerCase().includes(q));
  if(!its.length){box.innerHTML=`<p class="pfhint" style="text-align:center;padding:28px 0">Tidak ada pengaturan yang cocok dengan “${esc(q)}”.</p>`;return}
  let h='',g='';
  its.forEach(p=>{
    if(p[1]!==g){if(g)h+='</div>';g=p[1];h+=`<div class="pfgl">${esc(g)}</div><div class="pfgrp">`}
    h+=`<button type="button" onclick="${p[0]==='rc'||p[0]==='prn'?`go('${p[0]}')`:`setOpen('${p[0]}')`}"><span class="ib2">${pfi(p[2],20)}</span><span class="tx"><b>${esc(p[3])}</b><small>${esc(p[4])}</small></span><span class="chev">${pfi('chev',18)}</span></button>`;
  });
  box.innerHTML=h+'</div>';
}
function applySetTab(){
  const sec=$('#v-set');if(!sec||!sec.querySelectorAll)return;
  const hub=$('#setHub'),sb=$('#setSubBar');if(!hub||!sb)return;
  let sub=S.setSub;const sp=SETP.find(p=>p[0]===sub),pe=sp&&$('#'+sub);
  if(!pe||pe.hidden){sub=S.setSub=null}
  if(!hub.dataset.built){hub.dataset.built='1';hub.innerHTML=`<div class="pfin pfsrch" style="margin:0 0 4px">${pfi('search',18)}<input class="fi" id="setQ" type="search" placeholder="Cari pengaturan" autocomplete="off" oninput="setHubList()" aria-label="Cari pengaturan"></div><div id="setHubList"></div>`}
  if(sub==='attForm'){if(!pe.dataset.built){pe.dataset.built='1';attCfgDraw()}}else{const af=$('#attForm');if(af)af.dataset.built=''}
  hub.hidden=!!sub;sb.hidden=!sub;
  sec.querySelectorAll('.panel[data-g]').forEach(p=>p.classList.toggle('gh',p.id!==sub));
  if(sub)sb.innerHTML=pfSub(esc(sp[3]),"setOpen(null)");
  if(!sub)setHubList();
}
function renderSet(){
  const s=db.set;
  $('#setForm').innerHTML=`<h3>Toko</h3>
  <label class="fl">Nama toko</label><input class="fi" id="sN" value="${esc(s.store)}">
  <label class="fl">Alamat / telepon (tampil di struk)</label><input class="fi" id="sA" value="${esc(s.addr)}">
  <div class="chips" style="margin:6px 0 2px"><button class="chip" type="button" onclick="addrGps()">📍 Isi alamat dari GPS</button></div>
  <div class="two"><div><label class="fl">Pajak (%)</label><input class="fi" id="sT" type="number" min="0" step="0.1" value="${s.tax}"></div>
  <div></div></div>
  <div class="two"><div><label class="fl">Batas stok menipis (default)</label><input class="fi" id="sL" type="number" min="0" value="${s.low}"></div><div></div></div>
  <button class="btn" onclick="saveSet()">Simpan Pengaturan</button>`;
  renderTheme();
  renderLogo();
  renderDb();
  renderLang();
  renderCur();
  renderSec();
  renderCoSet();renderPay();applySetTab();
  $('#catMgr').innerHTML=db.cats.map(c=>`<span class="chip" style="display:inline-flex;gap:8px;margin:0 6px 6px 0">${esc(c)} <button style="color:var(--bad)" onclick="delCat('${esc(c).replace(/'/g,"\\'")}')"><i class="ic solo" data-ic="x"></i></button></span>`).join('')||'<span style="color:var(--mu)">Belum ada kategori</span>';
}
/* ---------- alamat toko dari GPS: layanan gratis OpenStreetMap Nominatim (tanpa kunci API) ---------- */
function addrFrom(j){
  const a=(j&&j.address)||{},road=[a.road||a.pedestrian||a.footway,a.house_number].filter(Boolean).join(' No. ');
  const parts=[road,a.neighbourhood||a.quarter,a.suburb||a.village||a.city_district,a.city||a.town||a.municipality||a.county,a.state,a.postcode].filter(Boolean);
  const out=parts.length>=2?parts.join(', '):String((j&&j.display_name)||'');
  return out.slice(0,160);
}
async function addrFetch(la,lo){
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),9000);
  try{
    const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=id&lat='+la+'&lon='+lo,{signal:ac.signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw 0;const t=addrFrom(await r.json());if(!t)throw 0;return t;
  }catch(e){return ''}finally{clearTimeout(tm)}
}
function addrGps(){
  if(!navigator.geolocation){toast('Perangkat ini tidak mendukung lokasi');return}
  toast('Mencari lokasi…');
  navigator.geolocation.getCurrentPosition(async p=>{
    const t=await addrFetch(p.coords.latitude.toFixed(6),p.coords.longitude.toFixed(6)),a=$('#sA');
    if(t&&a){a.value=t;toast('Alamat terisi. Periksa lalu tekan Simpan Pengaturan.')}
    else toast('Alamat tidak bisa diambil (butuh internet).');
  },er=>toast(er&&er.code===1?'Izin lokasi ditolak. Aktifkan di pengaturan browser.':'Lokasi tidak ditemukan'),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}
function saveSet(){
  Object.assign(db.set,{store:$('#sN').value.trim()||'Toko',addr:$('#sA').value,tax:Math.max(0,+$('#sT').value||0),low:Math.max(0,+$('#sL').value||0)});
  save();applyBrand();toast('Pengaturan disimpan');render();
}
function addCat(){const v=$('#newCat').value.trim();if(!v)return;if(!db.cats.includes(v))db.cats.push(v);$('#newCat').value='';save();renderSet()}
function delCat(c){
  const n=db.items.filter(i=>i.cat===c).length;
  if(n){toast(`Masih ada ${n} item di kategori ini`);return}
  db.cats=db.cats.filter(x=>x!==c);if(S.cat===c)S.cat='all';save();renderSet()
}
/* ---------- ekspor Excel (.xlsx dibuat langsung di perangkat) ---------- */
function histExportData(){
  const pad=n=>String(n).padStart(2,'0'),rows=db.orders.filter(x=>{const k=dkey(x.t);return(!S.hf||k>=S.hf)&&(!S.ht||k<=S.ht)}).slice().sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);
  const d=t=>{const x=new Date(t);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())},h=t=>{const x=new Date(t);return pad(x.getHours())+':'+pad(x.getMinutes())};
  const cost=x=>x.lines.reduce((a,l)=>a+(l.cost||0)*l.qty,0),n=rows.length;
  const tx=[['No Invoice','Tanggal','Jam','Tipe','Kasir','Pelanggan','Metode','Subtotal','Diskon','Pajak','Total','Diterima','Kembalian','Modal (HPP)','Estimasi Laba']];
  rows.forEach(x=>tx.push([x.no,d(x.t),h(x.t),x.type||'',x.cashier||'',x.cust||'',x.method||'',+x.sub||0,+x.disc||0,+x.tax||0,+x.total||0,+x.paid||0,+x.change||0,cost(x),(+x.total||0)-(+x.tax||0)-cost(x)]));
  const sum=k=>rows.reduce((a,x)=>a+(+k(x)||0),0),C=i=>String.fromCharCode(65+i);
  if(n){const r=['TOTAL','','','','','','',...[7,8,9,10].map(i=>({f:`SUM(${C(i)}2:${C(i)}${n+1})`,v:sum(x=>[x.sub,x.disc,x.tax,x.total][i-7])})),'','',{f:`SUM(N2:N${n+1})`,v:sum(cost)},{f:`SUM(O2:O${n+1})`,v:sum(x=>x.total-x.tax-cost(x))}];r[0]={t:'TOTAL',b:1};tx.push(r)}
  const it=[['No Invoice','Tanggal','Item','Qty','Harga','Subtotal','Modal / unit','Total Modal']];
  rows.forEach(x=>x.lines.forEach(l=>it.push([x.no,d(x.t),l.name,+l.qty||0,+l.price||0,(+l.price||0)*(+l.qty||0),+l.cost||0,(+l.cost||0)*(+l.qty||0)])));
  const by={},pr={};
  rows.forEach(x=>{const m=x.method||'-';(by[m]=by[m]||[0,0])[0]++;by[m][1]+=+x.total||0;x.lines.forEach(l=>{const p=pr[l.bn||l.name]=pr[l.bn||l.name]||[0,0];p[0]+=+l.qty||0;p[1]+=(+l.price||0)*(+l.qty||0)})});
  const per=(S.hf||S.ht)?(S.hf||'…')+' s/d '+(S.ht||'…'):'Semua tanggal';
  const sm=[[{t:'Ringkasan Penjualan',b:1},''],['Toko',db.set.store||''],['Periode',per],['Diekspor',d(new Date())+' '+h(new Date())],['Jumlah transaksi',n],['Penjualan (total)',sum(x=>x.total)],['Pajak',sum(x=>x.tax)],['Diskon',sum(x=>x.disc)],['Estimasi laba',sum(x=>x.total-x.tax-cost(x))],[''],
    [{t:'Per metode bayar',b:1},{t:'Jumlah',b:1},{t:'Total',b:1}],...Object.entries(by).map(([m,v])=>[m,v[0],v[1]]),[''],
    [{t:'Item terlaris',b:1},{t:'Qty',b:1},{t:'Omzet',b:1}],...Object.entries(pr).sort((a,b)=>b[1][0]-a[1][0]).slice(0,30).map(([m,v])=>[m,v[0],v[1]])];
  return{n,sheets:[{name:'Ringkasan',rows:sm,w:[26,20,18]},{name:'Transaksi',rows:tx,head:1,w:[26,12,8,10,14,18,12,13,11,11,13,13,12,13,14]},{name:'Detail Item',rows:it,head:1,w:[26,12,28,7,12,13,13,13]}]};
}
function exportXlsx(){
  if(!db.orders.length){toast('Belum ada transaksi');return}
  const x=histExportData();if(!x.n){toast('Tidak ada transaksi pada tanggal ini');return}
  const a=document.createElement('a'),dd=dkey(new Date());
  a.href=URL.createObjectURL(OrdelaXlsx.build(x.sheets,dec()));
  a.download='riwayat-penjualan-'+(S.hf||S.ht?(S.hf||'awal')+'_sd_'+(S.ht||dd):dd)+'.xlsx';
  document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},4000);
  toast('Excel diunduh ('+x.n+' transaksi)');
}
function backup(){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db)],{type:'application/json'}));
  a.download='sushi-pos-database-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  db.set.lastBackup=Date.now();save();if(S.view==='set')renderDb();
}
function exportCSV(){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const rows=[['Nama','Kategori','Harga','Modal','Stok']].concat(db.items.map(i=>[i.name,i.cat,i.price,i.cost||0,i.stock]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='inventori.csv';a.click();
}

/* ---------- konfirmasi kustom (confirm() bawaan diblokir di banyak sandbox/webview) ---------- */
function ask(title,msg,yes,fn){
  S.askFn=fn;
  openModal(`<h3>${esc(title)}</h3><p style="margin:0 0 6px;color:var(--mu);line-height:1.5">${esc(msg)}</p>
  <button class="btn del" onclick="askYes()">${esc(yes||'Ya')}</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
}
function askYes(){const f=S.askFn;S.askFn=null;closeModal();if(f)f()}

/* ---------- hapus item (tunggal & massal) ---------- */
function delItem(id){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const i=find(id);if(!i)return;
  {const u=bdUsedBy(id);if(u){toast('Tidak bisa dihapus: dipakai di paket "'+u.name+'". Ubah paketnya dulu.');return}}
  ask('Hapus item?',`"${i.name}" akan dihapus dari menu dan inventori. Riwayat penjualan tidak terpengaruh.`,'Hapus',()=>{
    db.items=db.items.filter(x=>x.id!==id);delete S.cart[id];S.sel.delete(id);
    if(i.stock&&!isB(i))logAdd(i.name,-i.stock,'Item dihapus',0);
    save();render();toast('Item dihapus');
  });
}
function invList(){
  const q=S.q.trim().toLowerCase();
  return db.items.filter(i=>(S.itab==='all'||(S.itab==='ns')===!!i.ns)&&(!q||i.name.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)));
}
function invTabs(){
  const n=db.items.filter(i=>i.ns).length,t=[['sale','Menu Dijual',db.items.length-n],['ns','Bahan / Tidak Dijual',n],['all','Semua',db.items.length]];
  $('#invTabs').innerHTML=t.map(x=>`<button class="${S.itab===x[0]?'on':''}" onclick="S.itab='${x[0]}';S.sel.clear();renderInvTable()">${x[1]} <b>${x[2]}</b></button>`).join('');
}
function renderInvTable(){
  if(S.view!=='inv')return;
  invTabs();
  const emp=isStaffMode(),ids=new Set(db.items.map(i=>i.id));
  [...S.sel].forEach(id=>{if(!ids.has(id))S.sel.delete(id)});
  $('#invHead').innerHTML=emp?'<th></th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th></th>':'<th><input type="checkbox" id="selAllCk" onchange="selAll(this.checked)"></th><th></th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Modal</th><th>Stok</th><th>Status</th><th></th>';
  $('#invBody').innerHTML=invList().map(i=>{const[s,t]=status(i);
    const stk=isB(i)?`<td class="i-s"><span class="stkc"><b>${i.stock}</b></span></td>`:`<td class="i-s"><span class="stkc"><b>${i.stock}</b></span></td>`;
    return emp?`<tr><td class="i-th"><div class="th">${thumb(i)}</div></td><td class="i-n"><b>${esc(i.name)}</b>${i.ns?' <span class="tag bhn">Bahan</span>':''}${isB(i)?`<br><small class="bdl">${i.rc?'Resep':'Isi'}: ${esc(bdLbl(i.bundle))}</small>`:''}</td><td class="i-c">${esc(i.cat)}</td><td class="i-p">${money(i.price)}</td>${stk}<td class="i-st"><span class="tag ${s}">${t}</span></td><td class="i-a">${isB(i)?'':`<button class="ib" onclick="stockForm('${i.id}')">Edit</button>`}</td></tr>`
    :`<tr><td class="i-ck"><input type="checkbox" ${S.sel.has(i.id)?'checked':''} onchange="selOne('${i.id}',this.checked)"></td><td class="i-th"><div class="th">${thumb(i)}</div></td><td class="i-n"><b>${esc(i.name)}</b>${i.ns?' <span class="tag bhn">Bahan</span>':''}${isB(i)?`<br><small class="bdl">${i.rc?'Resep':'Isi'}: ${esc(bdLbl(i.bundle))}</small>`:''}</td><td class="i-c">${esc(i.cat)}</td><td class="i-p">${money(i.price)}</td><td class="i-m">${money(i.cost||0)}</td>
    ${stk}
    <td class="i-st"><span class="tag ${s}">${t}</span></td>
    <td class="i-a" style="white-space:nowrap"><button class="ib" onclick="itemForm('${i.id}')">Edit</button><button class="ib d" onclick="delItem('${i.id}')">Hapus</button></td></tr>`}).join('')||`<tr><td colspan="${emp?7:9}" style="color:var(--mu)">Tidak ada item.</td></tr>`;
  updateBulk();
}
function selOne(id,on){if(on)S.sel.add(id);else S.sel.delete(id);updateBulk()}
function selAll(on){invList().forEach(i=>{if(on)S.sel.add(i.id);else S.sel.delete(i.id)});renderInvTable()}
function updateBulk(){
  const b=$('#bulkDel');if(!b)return;
  const n=S.sel.size;b.hidden=!n;b.innerHTML='<i class="ic" data-ic="trash"></i>Hapus terpilih ('+n+')';
  const a=$('#selAllCk');if(a){const l=invList();a.checked=l.length>0&&l.every(i=>S.sel.has(i.id))}
}
function bulkDel(){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const n=S.sel.size;if(!n)return;
  {for(const id of S.sel){const u=bdUsedBy(id,S.sel);if(u){const x=find(id);toast('Tidak bisa dihapus: '+(x?x.name:'item')+' dipakai di paket "'+u.name+'"');return}}}
  ask('Hapus item terpilih?',`${n} item akan dihapus dari menu dan inventori.`,'Hapus',()=>{
    db.items=db.items.filter(i=>!S.sel.has(i.id));
    S.sel.forEach(id=>delete S.cart[id]);S.sel.clear();
    save();render();toast(n+' item dihapus');
  });
}

/* ---------- backup / reset (tanpa confirm()) ---------- */
function restore(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    let d;
    try{d=JSON.parse(e.target.result);if(!d.items||!d.set)throw 0}catch(x){toast('File backup tidak valid');return}
    ask('Pulihkan backup?','Semua data saat ini akan ditimpa dengan isi file backup.','Pulihkan',()=>{
      snapNow('snap-prerestore').catch(()=>{});applyDb(d);
    });
  };
  r.readAsText(f);inp.value='';
}
function resetAll(){
  ask('Reset semua data?','Semua item, riwayat, dan pengaturan dihapus lalu kembali ke data contoh.','Reset',()=>{
    db=fixDb(seed());S.cart={};S.sel.clear();S.cat='all';save();
    applyBrand();go('pos');toast('Data direset');
  });
}

/* ---------- opsi (struk & printer) ---------- */
function setFoot(v){db.set.foot=v;save();renderRcPrev()}
function setOpt(obj,key,val){
  if(['logoW','feed','baud','chunk','delay'].includes(key))val=+val;
  db.set[obj][key]=val;save();
  if(obj==='rc')renderRcPrev();
  if(obj==='prn'&&(key==='mode'||key==='autoConn')){if(key==='mode')renderPrn();bleAutoSoon(200)}
}
function setPaper(v){db.set.paper=v;save();setPageSize();if(S.view==='rc')renderRcPrev()}

/* ---------- editor tampilan struk ---------- */
function renderRcPrev(){const el=$('#rcPrev');if(el)el.innerHTML=receiptHTML(sampleOrder(),true)}
function renderRc(){
  const r=db.set.rc;
  const ck=(k,l)=>`<label class="tgl"><input type="checkbox" ${r[k]?'checked':''} onchange="setOpt('rc','${k}',this.checked)"><span>${l}</span></label>`;
  const sel=(k,l,o)=>`<label class="fl">${l}</label><select class="fi" onchange="setOpt('rc','${k}',this.value)">${o.map(([v,t])=>`<option value="${v}" ${String(r[k])===v?'selected':''}>${t}</option>`).join('')}</select>`;
  const tx=(k,l,ph)=>`<label class="fl">${l}</label><input class="fi" value="${esc(r[k])}" placeholder="${esc(ph||'')}" oninput="setOpt('rc','${k}',this.value)">`;
  $('#rcForm').innerHTML=`
  <div class="panel"><h3>Logo</h3>
    <div class="up"><div class="pv logo">${db.set.logo?`<img src="${imgSrc(db.set.logo)}" alt="">`:'<i class="ic solo" data-ic="image"></i>'}</div>
    <div><button class="btn sm sec" onclick="go('set')">Ubah logo di Pengaturan</button></div></div>
    <div class="tgls" style="margin-top:8px">${ck('showLogo','Tampilkan logo di struk')}</div>
    ${sel('logoW','Ukuran logo',[['100','Kecil'],['160','Sedang'],['240','Besar'],['320','Sangat besar']])}
</div>
  <div class="panel"><h3>Header</h3>
    <div class="tgls">${ck('showAddr','Alamat toko')}</div>
    ${tx('line1','Baris tambahan di header','mis. Telp 0812-xxxx / @instagram')}
</div>
  <div class="panel"><h3>Info Transaksi</h3>
    <div class="tgls">${ck('showNo','No. invoice')}${ck('showDate','Tanggal &amp; jam')}${ck('showType','Tipe order')}${ck('showCust','Nama pelanggan')}${ck('showCashier','Nama kasir')}</div>
    <div class="tgls">${ck('showTable','No. meja (besar)')}</div>
    ${sel('tableSize','Ukuran nomor meja',[['xl','Sangat besar'],['l','Besar']])}
    <label class="tgl"><input type="checkbox" ${r.cashierAuto!==false?'checked':''} onchange="setOpt('rc','cashierAuto',this.checked)"><span>Nama kasir otomatis dari akun yang login</span></label>
    ${tx('cashier','Nama kasir manual (cadangan bila tidak login, atau dipakai bila otomatis dimatikan)','mis. Rina')}</div>
  <div class="panel"><h3>Rincian &amp; Pembayaran</h3>
    <div class="tgls">${ck('showDisc','Baris diskon')}${ck('showTax','Baris pajak')}${ck('showPay','Bayar &amp; kembalian')}${ck('bigTotal','Total dengan huruf besar')}</div></div>
  <div class="panel"><h3>Footer &amp; Baris Tambahan</h3>
    <div class="tgls">${ck('showFooter','Tampilkan pesan di bawah struk')}${ck('showQr','QR untuk pesan online')}</div>
    <label class="fl">Pesan di bawah struk</label><input class="fi" value="${esc(db.set.foot)}" oninput="setFoot(this.value)">
    ${tx('line2','Baris tambahan di footer','mis. WiFi: tokoku123')}
    ${tx('qrText','Tulisan di atas QR','mis. Scan untuk memesan')}
</div>
  <div class="panel"><h3>Tampilan</h3>
    ${sel('align','Perataan header',[['left','Kiri'],['center','Tengah'],['right','Kanan']])}
    ${sel('font','Ukuran huruf',[['small','Kecil'],['normal','Normal'],['large','Besar']])}
    ${sel('itemLayout','Format daftar item',[['two','2 baris (nama, lalu qty x harga)'],['one','1 baris (qty nama ... total)']])}
    ${sel('divider','Garis pemisah',[['dashed','Putus-putus (- - -)'],['equal','Sama dengan (=====)'],['none','Tanpa garis']])}
    ${sel('feed','Spasi kosong di akhir struk',[['0','0 baris'],['2','2 baris'],['3','3 baris'],['5','5 baris'],['8','8 baris']])}
  </div>
  <button class="btn sec" onclick="resetRc()">Kembalikan desain default</button>`;
  renderRcPrev();
}
function pickLogo(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  cropImg(f,{title:'Pangkas logo',aspects:[['Bebas',"img"],['1:1',1],['2:1',2],['3:1',3]],max:360,q:.85,cb:d=>setLogo(d)});
}
function setLogo(d){db.set.logo=d;if(d)db.set.rc.showLogo=true;save();applyBrand();renderLogo();renderRc()}
function setLogoApp(v){db.set.logoApp=v;save();applyBrand()}
function renderLogo(){
  const el=$('#logoForm');if(!el)return;const s=db.set;
  el.innerHTML=`<h3>Logo Perusahaan</h3>
  <div class="up"><div class="pv logo">${s.logo?`<img src="${imgSrc(s.logo)}" alt="">`:'<i class="ic solo" data-ic="image"></i>'}</div>
  <div><button class="btn sm sec" onclick="$('#lgF').click()">Upload Logo</button> <button class="mini" style="color:var(--bt)" onclick="setLogo(DEF_LOGO)">Kembali ke Default</button>
  <input type="file" id="lgF" accept="image/*" hidden onchange="pickLogo(this)"></div></div>
  <div class="tgls" style="margin-top:8px">
  <label class="tgl"><input type="checkbox" ${s.logoApp!==false?'checked':''} onchange="setLogoApp(this.checked)"><span>Tampilkan logo di aplikasi</span></label>
  <label class="tgl"><input type="checkbox" ${s.rc.showLogo?'checked':''} onchange="setOpt('rc','showLogo',this.checked)"><span>Tampilkan logo di struk</span></label></div>
`;
}
function resetRc(){
  ask('Reset desain struk?','Semua pengaturan tampilan struk kembali ke default.','Reset',()=>{db.set.rc={...RC_DEF};save();renderRc();renderLogo()});
}

/* ---------- halaman printer ---------- */
const IOSN=()=>!!(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==='ios');
function renderPrn(){
  const p=db.set.prn;
  if(IOSN()&&(p.mode==='serial'||p.mode==='rawbt')){p.mode='ble';save()}   // iPhone tidak mendukung Bluetooth klasik/RawBT
  const ck=(k,l)=>`<label class="tgl"><input type="checkbox" ${p[k]?'checked':''} onchange="setOpt('prn','${k}',this.checked)"><span>${l}</span></label>`;
  const help={
    browser:'Memakai dialog cetak bawaan browser. Cocok untuk printer USB / Wi-Fi / yang sudah terpasang di komputer atau HP. Pilih ukuran kertas yang sama dengan printer.',
    ble:IOSN()?'Untuk printer thermal Bluetooth BLE (Bluetooth 4.0+). Nyalakan printer, tekan Cari & Hubungkan, lalu pilih printer. iPhone tidak bisa memakai printer Bluetooth klasik (SPP); pakai printer yang mendukung BLE.':'Untuk printer thermal Bluetooth BLE (Bluetooth 4.0+). Klik Cari &amp; Hubungkan lalu pilih printer. Perlu Chrome (Android/Windows/Mac) atau Bluefy di iPhone; Safari tidak mendukung. Buka halaman ini sebagai file atau lewat https.',
    serial:'Untuk printer Bluetooth klasik (SPP) yang sudah di-pair di komputer (muncul sebagai port COM) atau printer USB. Hanya Chrome/Edge desktop. Atur baud rate sesuai printer (umumnya 9600 atau 115200).',
    rawbt:'Untuk HP Android dengan printer Bluetooth klasik: pasang aplikasi gratis RawBT dari Play Store, pair printer di RawBT, lalu cetak dari sini. Struk dikirim ke RawBT.'
  }[p.mode];
  const o=(v,t)=>`<option value="${v}" ${p.mode===v?'selected':''}>${t}</option>`;
  $('#prnForm').innerHTML=`
  <div class="panel"><h3>Koneksi</h3>
    <label class="fl">Mode cetak</label>
    <select class="fi" onchange="setOpt('prn','mode',this.value)">
      ${o('browser',IOSN()?'AirPrint / dialog cetak iPhone':'Dialog browser (USB / Wi-Fi / driver)')}${o('ble',IOSN()?'Bluetooth BLE':'Bluetooth BLE (Web Bluetooth)')}${IOSN()?'':o('serial','Bluetooth klasik / USB (Web Serial, desktop)')+o('rawbt','Android: aplikasi RawBT')}
    </select>
    <div class="tgls" style="margin-top:8px">${ck('autoConn','Sambung otomatis ke printer sebelumnya')}</div>
    <div class="chg" id="prnStat"></div>
    <div class="acts" style="margin-top:10px;flex-wrap:wrap">
      <button class="btn sm" onclick="prnConnect()"><i class="ic" data-ic="search"></i>Cari &amp; Hubungkan</button>
      <button class="btn sm sec" onclick="prnDisconnect()">Putuskan</button>
      <button class="btn sm sec" onclick="prnForget()">Lupakan printer</button>
      <button class="btn sm sec" onclick="testPrint()"><i class="ic" data-ic="print"></i>Tes Cetak</button>
    </div></div>
  <div class="panel"><h3>Opsi Cetak</h3>
    <label class="fl">Ukuran kertas</label>
    <select class="fi" onchange="setPaper(this.value)"><option value="80" ${db.set.paper==='80'?'selected':''}>Thermal 80 mm (48 karakter)</option><option value="58" ${db.set.paper==='58'?'selected':''}>Thermal 58 mm (32 karakter)</option></select>
    <div class="tgls" style="margin-top:8px">${ck('auto','Cetak otomatis setelah pembayaran')}${ck('autoNew','Kembali ke kasir otomatis setelah struk tercetak')}${ck('cut','Potong kertas otomatis')}${ck('drawer','Buka laci kasir (port RJ11)')}</div></div>
  <div class="panel"><h3>Lanjutan</h3>
    <div class="two"><div><label class="fl">Baud rate (serial)</label><input class="fi" type="number" value="${p.baud}" onchange="setOpt('prn','baud',this.value)"></div>
    <div><label class="fl">Ukuran paket BLE (byte)</label><input class="fi" type="number" min="20" max="512" value="${p.chunk}" onchange="setOpt('prn','chunk',this.value)"></div></div>
    <div class="two"><div><label class="fl">Jeda antar paket (ms)</label><input class="fi" type="number" min="0" value="${p.delay}" onchange="setOpt('prn','delay',this.value)"></div>
    <div><label class="fl">UUID service printer (opsional)</label><input class="fi" value="${esc(p.uuid)}" placeholder="mis. ffe0" onchange="setOpt('prn','uuid',this.value)"></div></div>
</div>`;
  updatePrnStatus();
}

/* ---------- kunci zoom ---------- */
document.addEventListener('contextmenu',e=>{if(!/^(INPUT|TEXTAREA)$/.test(e.target.tagName))e.preventDefault()});
document.addEventListener('selectstart',e=>{if(!/^(INPUT|TEXTAREA)$/.test(e.target.tagName||(e.target.parentNode||{}).tagName||''))e.preventDefault()});
document.addEventListener('dragstart',e=>e.preventDefault());
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','=','-','_','0'].includes(e.key))e.preventDefault()});

/* ---------- mata uang & desimal ---------- */
const CURS={IDR:['Rp',0,'id-ID','before'],MYR:['RM',2,'en-US','before'],USD:['$',2,'en-US','before'],SGD:['S$',2,'en-US','before'],EUR:['€',2,'id-ID','before'],GBP:['£',2,'en-US','before'],AUD:['A$',2,'en-US','before'],JPY:['¥',0,'en-US','before'],THB:['฿',2,'en-US','before'],SAR:['SAR',2,'en-US','before'],AED:['AED',2,'en-US','before']};
function quickAmts(){
  const code=Object.keys(CURS).find(k=>CURS[k][0]===db.set.cur&&CURS[k][1]===dec())||db.set.curCode||'CUSTOM';
  const presets={
    IDR:[20000,50000,100000,200000,500000],
    MYR:[1,5,10,20,50,100],
    USD:[1,5,10,20,50,100],
    SGD:[2,5,10,50,100],
    EUR:[5,10,20,50,100,200],
    GBP:[5,10,20,50],
    AUD:[5,10,20,50,100],
    JPY:[1000,5000,10000],
    THB:[20,50,100,500,1000],
    SAR:[5,10,50,100,500],
    AED:[5,10,50,100,500]
  };
  if(presets[code])return presets[code];
  return dec()?[5,10,20,50,100,200]:[1000,5000,10000,50000];
}
function amtLbl(v){return (db.set.curCode==='IDR'||(db.set.cur==='Rp'&&dec()===0))?(v>=1000?(v/1000)+'rb':fmtNum(v)):fmtNum(v)}
function matchCur(){
  const s=db.set;
  const k=Object.keys(CURS).find(c=>{const[a,b,l,p]=CURS[c];return a===s.cur&&b===+s.dec&&l===s.loc&&p===s.curPos});
  s.curCode=k||'CUSTOM';
}
function curEx(){const e=$('#curEx');if(e)e.textContent=money(1234.56)+'  ·  '+money(0.5)}
function pickCur(c){
  const s=db.set;
  if(CURS[c]){const[sym,dc,loc,pos]=CURS[c];Object.assign(s,{cur:sym,dec:dc,loc,curPos:pos,curCode:c})}
  else s.curCode='CUSTOM';
  save();renderCur();
}
function setCur(k,v,re){db.set[k]=v;matchCur();save();if(re)renderCur();else curEx()}
function renderCur(){
  const s=db.set,el=$('#curForm');if(!el)return;
  const op=(v,t,cur)=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${t}</option>`;
  el.innerHTML=`<h3>Mata Uang &amp; Harga</h3>
  <label class="fl">Mata uang</label>
  <select class="fi" onchange="pickCur(this.value)">${Object.keys(CURS).map(c=>op(c,c+' ('+CURS[c][0]+')',s.curCode)).join('')}${op('CUSTOM','Lainnya (atur manual)',s.curCode)}</select>
  <div class="two"><div><label class="fl">Simbol</label><input class="fi" value="${esc(s.cur)}" oninput="setCur('cur',this.value)"></div>
  <div><label class="fl">Posisi simbol</label><select class="fi" onchange="setCur('curPos',this.value,1)">${op('before','Di depan (Rp 1.000)',s.curPos)}${op('after','Di belakang (1.000 Rp)',s.curPos)}</select></div></div>
  <div class="two"><div><label class="fl">Angka desimal</label><select class="fi" onchange="setCur('dec',+this.value,1)">${[0,1,2,3,4].map(n=>op(n,n+(n?' desimal':' (bulat)'),s.dec)).join('')}</select></div>
  <div><label class="fl">Format angka</label><select class="fi" onchange="setCur('loc',this.value,1)">${op('id-ID','1.234,56 (titik ribuan)',s.loc)}${op('en-US','1,234.56 (koma ribuan)',s.loc)}</select></div></div>
  <div class="chg" style="background:var(--chip);color:var(--tx)"><span>Contoh</span><span id="curEx"></span></div>
`;
  curEx();
}

/* ---------- tampilan grid menu ---------- */
function applyGridView(){
  const g=db.set.gv,el=$('#grid'),cd=g.colsD,cm=g.colsM;
  el.className='grid'+(g.mode==='list'?' list':'')+(cd>0?' fd':'')+' fm'+(g.stock?'':' nostock');
  /* jarak, padding, dan lengkung sudut kartu mengecil saat kolom bertambah */
  const pick=(n,t)=>{for(const [min,v] of t)if(n>=min)return v;return t[t.length-1][1]};
  const GAP=[[8,6],[6,8],[4,10],[0,14]],PAD=[[8,4],[6,5],[4,6],[0,8]],RAD=[[8,12],[6,16],[4,20],[0,28]];
  const MGAP=[[4,5],[3,7],[0,10]],MPAD=[[4,4],[3,5],[0,8]],MRAD=[[4,14],[3,18],[0,26]];
  el.style.cssText='--cd:'+cd+';--cm:'+cm+';--gd:'+pick(cd,GAP)+'px;--pdd:'+pick(cd,PAD)+'px;--radd:'+pick(cd,RAD)+'px;--gm:'+pick(cm,MGAP)+'px;--pdm:'+pick(cm,MPAD)+'px;--radm:'+pick(cm,MRAD)+'px';
  $('#cats').style.display=g.cats?'':'none';
  const b=(on,t,fn)=>`<button class="chip ${on?'on':''}" onclick="${fn}">${t}</button>`;
  $('#gtool').innerHTML='<span class="lb">Tampilan</span>'
    +b(g.mode==='grid','<i class="ic" data-ic="grid"></i>Grid',"setGV('mode','grid')")+b(g.mode==='list','<i class="ic" data-ic="list"></i>Daftar',"setGV('mode','list')")
    +'<button class="chip" onclick="gridForm()"><i class="ic" data-ic="sliders"></i>Atur</button>'+('BarcodeDetector' in window?'<button class="chip" onclick="scanCam()">Scan</button>':'');
}
function setGV(k,v,re){db.set.gv[k]=v;save();applyGridView();if(k==='tap'&&ORDELA_APP_MODE==='pos')renderGrid();if(re)gridForm()}
function gridForm(){
  const g=db.set.gv;
  const row=(k,opts)=>`<div class="chips">${opts.map(([v,t])=>`<button class="chip ${g[k]===v?'on':''}" onclick="setGV('${k}',${typeof v==='number'?v:`'${v}'`},1)">${t}</button>`).join('')}</div>`;
  const ck=(k,l)=>`<label class="tgl"><input type="checkbox" ${g[k]?'checked':''} onchange="setGV('${k}',this.checked)"><span>${l}</span></label>`;
  openModal(`<h3>Atur Tampilan Menu</h3>
  <label class="fl">Mode</label>${row('mode',[['grid','<i class="ic" data-ic="grid"></i>Grid'],['list','<i class="ic" data-ic="list"></i>Daftar']])}
  <label class="fl">Saat gambar menu diketuk</label>${row('tap',[['add','<i class="ic" data-ic="bolt"></i>Tambah 1 langsung'],['qty','<i class="ic" data-ic="hash"></i>Pilih jumlah'],['detail','<i class="ic" data-ic="search"></i>Lihat detail'],['none','<i class="ic" data-ic="ban"></i>Tanpa aksi']])}
  <label class="fl">Jumlah kolom: layar besar (PC / tablet)</label>${row('colsD',[[0,'Auto'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[8,'8']])}
  <label class="fl">Jumlah kolom: HP</label>${row('colsM',[[1,'1'],[2,'2'],[3,'3'],[4,'4']])}
  <div class="tgls" style="margin-top:6px">${ck('stock','Tampilkan stok')}${ck('cats','Tampilkan bar kategori')}</div>
  <button class="btn" onclick="closeModal()">Selesai</button>`);
}

/* ---------- alur transaksi baru ---------- */
function backToPos(){S.q='';const q=$('#q');if(q)q.value='';closeModal();go('pos')}
function afterPrint(){
  if(S.rcFresh&&db.set.prn.autoNew){S.rcFresh=false;backToPos();toast('Transaksi selesai. Siap untuk transaksi baru.')}
}
function newTx(){S.rcFresh=false;backToPos()}

/* ---------- bahasa aplikasi (i18n) ----------
   Sumber teks = bahasa Indonesia. Bahasa lain diterjemahkan lewat kamus + aturan pola.
   Teks yang tidak ada di kamus tetap tampil dalam bahasa Indonesia. */
const LANGS={id:'Bahasa Indonesia',en:'English',ms:'Bahasa Melayu'};
const DATE_LOC={id:'id-ID',en:'en-GB',ms:'ms-MY'};
const lang=()=>db.set.lang||'id';
const dloc=()=>DATE_LOC[lang()]||'id-ID';
const TR_ROWS=[
["Operasional","Operations","Operasi"],["Toko","Store","Kedai"],["Pesanan & Bayar","Orders & Payment","Pesanan & Bayaran"],["Tampilan","Display","Paparan"],["Data & Cadangan","Data & Backup","Data & Sandaran"],
["Pesanan Online","Online Orders","Pesanan Dalam Talian"],["Pesan lewat QR","Order via QR","Pesan melalui QR"],["Perangkat ini","This device","Peranti ini"],["Aktif","Active","Aktif"],
["Rekap Penjualan","Sales Recap","Rekap Jualan"],["Riwayat Transaksi","Transaction History","Sejarah Transaksi"],["Grafik Penjualan","Sales Chart","Graf Jualan"],["Pendapatan per Kategori","Revenue by Category","Pendapatan mengikut Kategori"],["Penjualan Kotor","Gross Sales","Jualan Kasar"],["Penjualan Bersih","Net Sales","Jualan Bersih"],["Total Diterima","Total Received","Jumlah Diterima"],["Ringkasan","Summary","Ringkasan"],["Item terjual","Items sold","Item terjual"],["Rata-rata / transaksi","Average / transaction","Purata / transaksi"],["Estimasi laba","Estimated profit","Anggaran untung"],["Metode Bayar","Payment Methods","Kaedah Bayaran"],["Ekspor Excel","Export Excel","Eksport Excel"],["Belum ada penjualan pada periode ini.","No sales in this period.","Tiada jualan dalam tempoh ini."],["Tidak ada transaksi pada periode ini.","No transactions in this period.","Tiada transaksi dalam tempoh ini."],["Tampilkan lebih banyak","Show more","Tunjuk lagi"],["Akun","Account","Akaun"],["Kasir","Cashier","Juruwang"],["Inventori","Inventory"],["Riwayat Penjualan","Sales History","Sejarah Jualan"],["Dashboard","Dashboard","Papan Pemuka"],["Grafik","Chart","Graf"],["Angka","Numbers","Angka"],["Barang Masuk/Keluar","Stock In/Out","Stok Masuk/Keluar"],["Desain Struk","Receipt Design","Reka Bentuk Resit"],["Printer","Printer","Pencetak"],["Pengaturan","Settings","Tetapan"],
["Cari menu","Search menu"],["Invoice","Invoice","Invois"],["Takeaway","Takeaway","Bawa Pulang"],["Dine In","Dine In","Makan Sini"],["Delivery","Delivery","Penghantaran"],
["Ringkasan Harga","Price Summary"],["Subtotal","Subtotal","Subjumlah"],["Diskon","Discount","Diskaun"],["Potongan","Deduction"],["Total","Total","Jumlah"],["Place Order","Place Order","Buat Pesanan"],
["Kosongkan keranjang","Clear cart","Kosongkan troli"],["Keranjang kosong.","Cart is empty.","Troli kosong."],["Pilih menu untuk memulai.","Pick items to start.","Pilih menu untuk bermula."],
["Tampilan","Display","Paparan"],["Kecil","Small"],["Sedang","Medium","Sederhana"],["Besar","Large"],["Daftar","List","Senarai"],["Atur","Customize","Tetapkan"],["Semua Menu","All Menu"],["HABIS","SOLD OUT"],
["Tambah Item","Add Item"],["Edit Item","Edit Item","Sunting Item"],["Edit","Edit","Sunting"],["Hapus","Delete","Padam"],["Ekspor CSV","Export CSV","Eksport CSV"],
["Total Item","Total Items","Jumlah Item"],["Nilai Stok (modal)","Stock Value (cost)"],["Stok Menipis","Low Stock","Stok Rendah"],["Habis","Sold out"],
["Kategori","Category"],["Harga","Price"],["Modal","Cost"],["Stok","Stock"],["Aman","OK","Selamat"],["Menipis","Low","Rendah"],["Tidak ada item.","No items.","Tiada item."],
["Riwayat Perubahan Stok","Stock Change History","Sejarah Perubahan Stok"],["Waktu","Time","Masa"],["Perubahan","Change"],["Keterangan","Notes"],["Belum ada perubahan.","No changes yet."],
["Penyesuaian manual","Manual adjustment","Pelarasan manual"],["Item dihapus","Item deleted","Item dipadam"],["Edit item","Item edited","Item disunting"],["Stok awal","Initial stock"],
["Penjualan Hari Ini","Today's Sales","Jualan Hari Ini"],["Transaksi Hari Ini","Today's Transactions"],["Estimasi Laba Hari Ini","Estimated Profit Today","Anggaran Untung Hari Ini"],["Total Semua","Grand Total","Jumlah Keseluruhan"],
["Tipe","Type","Jenis"],["Bayar","Payment","Bayaran"],["Struk","Receipt","Resit"],["Belum ada transaksi.","No transactions yet."],
["Pengguna","User","Pengguna"],["Stok akhir","Stock after","Stok akhir"],["Semua pengguna","All users","Semua pengguna"],["Tidak tercatat","Not recorded","Tidak direkodkan"],["Baris","Rows","Baris"],["Waktu","Time","Masa"],["Perubahan","Change","Perubahan"],["Keterangan","Notes","Keterangan"],["Hanya perubahan stok yang Anda lakukan sendiri yang ditampilkan.","Only stock changes you made yourself are shown.","Hanya perubahan stok yang anda lakukan sendiri dipaparkan."],["Hanya owner yang boleh mengubah data menu","Only the owner can change menu data","Hanya pemilik boleh mengubah data menu"],["Header","Header","Pengepala"],["Info Transaksi","Transaction Info","Maklumat Transaksi"],["Rincian & Pembayaran","Details & Payment","Butiran & Pembayaran"],["Footer & Baris Tambahan","Footer & Extra Lines","Pengaki & Baris Tambahan"],["Tampilkan pesan di bawah struk","Show message below the receipt","Papar mesej di bawah resit"],["QR untuk pesan online","QR for online ordering","QR untuk pesanan dalam talian"],["Tulisan di atas QR","Text above the QR","Teks di atas QR"],["Scan untuk memesan","Scan to order","Imbas untuk memesan"],["mis. Scan untuk memesan","e.g. Scan to order","cth. Imbas untuk memesan"],["QR mengarah ke halaman pesan pelanggan (tanpa nomor meja). Kartu QR per meja ada di Pesanan Online.","The QR opens the customer order page (without a table number). Per-table QR cards are in Online Orders.","QR menuju halaman pesanan pelanggan (tanpa nombor meja). Kad QR setiap meja ada di Pesanan Dalam Talian."],["Nama toko dan alamat diatur di Pengaturan > Toko.","Store name and address are set in Settings > Store.","Nama kedai dan alamat ditetapkan dalam Tetapan > Kedai."],["Pratinjau","Preview","Pratonton"],["Upload Logo","Upload Logo","Muat Naik Logo"],["Tampilkan logo di struk","Show logo on receipt","Papar logo pada resit"],["Ukuran logo","Logo size","Saiz logo"],["Menu Populer","Popular Items","Menu Popular"],["Kata sandi","Password","Kata laluan"],["Masuk","Sign in","Log masuk"],["Kata sandi salah","Wrong password","Kata laluan salah"],["Terlalu banyak percobaan. Coba lagi beberapa menit lagi.","Too many attempts. Try again in a few minutes.","Terlalu banyak percubaan. Cuba lagi dalam beberapa minit."],["Tidak bisa terhubung ke server","Cannot connect to the server","Tidak dapat menyambung ke pelayan"],["Tersinkron","Synced","Disegerakkan"],["Menyinkronkan…","Syncing…","Menyegerakkan…"],["Offline, data tersimpan di perangkat","Offline, data is saved on this device","Luar talian, data disimpan pada peranti"],["Offline","Offline","Luar talian"],["Perlu login","Login required","Perlu log masuk"],["Gagal sinkron","Sync failed","Gagal segerak"],["Sinkron online","Online sync","Segerak dalam talian"],["Server","Server","Pelayan"],["Database SQLite di server","SQLite database on the server","Pangkalan data SQLite di pelayan"],["Sinkron Sekarang","Sync Now","Segerak Sekarang"],["Unduh dari Server","Download from Server","Muat Turun dari Pelayan"],["Keluar","Sign out","Log keluar"],["Snapshot Server","Server Snapshots","Syot Kilat Pelayan"],["Snapshot server dibuat sekali sehari (30 hari terakhir), berisi kondisi sebelum perubahan pertama hari itu.","A server snapshot is made once a day (last 30 days) and holds the state before the first change of that day.","Syot kilat pelayan dibuat sekali sehari (30 hari terakhir) dan mengandungi keadaan sebelum perubahan pertama hari itu."],["Pulihkan snapshot server?","Restore server snapshot?","Pulihkan syot kilat pelayan?"],["Data saat ini akan diganti dengan snapshot ini, lalu disinkronkan ke semua perangkat.","Current data will be replaced with this snapshot and then synced to all devices.","Data semasa akan diganti dengan syot kilat ini, kemudian disegerakkan ke semua peranti."],["Data dari perangkat lain digabung","Data from another device was merged","Data daripada peranti lain telah digabungkan"],["Gagal mengambil snapshot","Failed to fetch the snapshot","Gagal mengambil syot kilat"],["Gagal mengunduh","Download failed","Gagal memuat turun"],["Atur Urutan Menu","Arrange Menu Order","Susun Urutan Menu"],["Atur Urutan Menu","Arrange Menu Order","Susun Urutan Menu"],["Seret ⠿ untuk memindahkan posisi, atau pakai tombol ▲ ▼. Urutan ini sama dengan susunan menu di Kasir (kiri ke kanan, atas ke bawah).","Drag ⠿ to move an item, or use the ▲ ▼ buttons. This order is the same as the menu layout in Cashier (left to right, top to bottom).","Seret ⠿ untuk mengalihkan kedudukan, atau guna butang ▲ ▼. Susunan ini sama dengan susunan menu di Juruwang (kiri ke kanan, atas ke bawah)."],["A–Z","A–Z","A–Z"],["Harga ↑","Price ↑","Harga ↑"],["Stok ↓","Stock ↓","Stok ↓"],["Belum ada item.","No items yet.","Belum ada item."],["Kembali ke Default","Back to Default","Kembali ke Lalai"],["Selesai","Done","Selesai"],["Layar penuh","Fullscreen","Skrin penuh"],["Keluar layar penuh","Exit fullscreen","Keluar skrin penuh"],["Layar","Screen","Skrin"],["Layar Penuh","Fullscreen","Skrin Penuh"],["Layar penuh otomatis saat layar pertama disentuh","Automatic fullscreen on the first touch","Skrin penuh automatik pada sentuhan pertama"],["Gunakan tombol Layar Penuh di bar atas, atau tekan F11 di komputer. Browser mewajibkan layar penuh dimulai dari sentuhan atau klik, jadi tidak bisa aktif sendiri tanpa interaksi.","Use the Fullscreen button in the top bar, or press F11 on a computer. Browsers require fullscreen to start from a tap or click, so it cannot turn on by itself without interaction.","Gunakan butang Skrin Penuh pada bar atas, atau tekan F11 pada komputer. Pelayar mewajibkan skrin penuh bermula daripada ketikan atau klik, jadi ia tidak boleh aktif sendiri tanpa interaksi."],["iPhone/iPad (Safari) tidak mendukung layar penuh untuk web: pilih Bagikan > Tambahkan ke Layar Utama. Di Android: Chrome > menu ⋮ > Tambahkan ke layar utama, lalu buka dari ikonnya agar tanpa bilah browser.","iPhone/iPad (Safari) does not support fullscreen for the web: choose Share > Add to Home Screen. On Android: Chrome > ⋮ menu > Add to Home screen, then open it from its icon to hide the browser bar.","iPhone/iPad (Safari) tidak menyokong skrin penuh untuk web: pilih Kongsi > Tambah ke Skrin Utama. Pada Android: Chrome > menu ⋮ > Tambah ke skrin utama, kemudian buka daripada ikonnya untuk menyembunyikan bar pelayar."],["Layar penuh tidak didukung di browser ini. Di iPhone: Bagikan > Tambahkan ke Layar Utama.","Fullscreen is not supported in this browser. On iPhone: Share > Add to Home Screen.","Skrin penuh tidak disokong dalam pelayar ini. Pada iPhone: Kongsi > Tambah ke Skrin Utama."],["Database & Penyimpanan","Database & Storage","Pangkalan Data & Storan"],["Penyimpanan utama (browser)","Main storage (browser)","Storan utama (pelayar)"],["Cadangan database (IndexedDB)","Database backup (IndexedDB)","Sandaran pangkalan data (IndexedDB)"],["Penyimpanan permanen","Persistent storage","Storan kekal"],["Ruang terpakai","Space used","Ruang digunakan"],["File database tertaut","Linked database file","Fail pangkalan data dipautkan"],["Backup terakhir","Last backup","Sandaran terakhir"],["Aktif","Active","Aktif"],["Menunggu data pertama","Waiting for first data","Menunggu data pertama"],["Tidak tersedia","Unavailable","Tidak tersedia"],["Ya","Yes","Ya"],["Belum","Not yet","Belum"],["Minta","Request","Minta"],["Izinkan","Allow","Benarkan"],["Perlu izin","Permission needed","Perlu kebenaran"],["Tertulis otomatis","Written automatically","Ditulis secara automatik"],["Gagal","Failed","Gagal"],["Belum ditautkan","Not linked","Belum dipautkan"],["Belum pernah","Never","Belum pernah"],["Tidak didukung di perangkat ini","Not supported on this device","Tidak disokong pada peranti ini"],["Unduh File Database","Download Database File","Muat Turun Fail Pangkalan Data"],["Pulihkan dari File","Restore from File","Pulihkan daripada Fail"],["Tautkan File Database","Link Database File","Pautkan Fail Pangkalan Data"],["Putuskan File","Unlink File","Putuskan Fail"],["Data disimpan di dua tempat: penyimpanan browser dan database IndexedDB. Jika salah satunya terhapus, data dipulihkan otomatis dari yang lain.","Data is stored in two places: browser storage and an IndexedDB database. If one is erased, data is restored automatically from the other.","Data disimpan di dua tempat: storan pelayar dan pangkalan data IndexedDB. Jika salah satu dipadam, data dipulihkan secara automatik daripada yang lain."],["Tautkan file database agar setiap perubahan otomatis ditulis ke file .json di perangkat ini (Chrome atau Edge di komputer).","Link a database file so every change is written automatically to a .json file on this device (Chrome or Edge on a computer).","Pautkan fail pangkalan data supaya setiap perubahan ditulis secara automatik ke fail .json pada peranti ini (Chrome atau Edge pada komputer)."],["Perangkat ini tidak mendukung penulisan file otomatis. Unduh file database secara berkala dan simpan di Google Drive atau flash disk.","This device does not support automatic file writing. Download the database file regularly and keep it on Google Drive or a flash drive.","Peranti ini tidak menyokong penulisan fail automatik. Muat turun fail pangkalan data secara berkala dan simpan di Google Drive atau pemacu kilat."],["Menghapus data situs atau cache browser, atau meng-uninstall aplikasi, dapat menghapus kedua penyimpanan. File database yang diunduh tetap aman.","Clearing site data or browser cache, or uninstalling the app, can erase both storages. A downloaded database file stays safe.","Memadam data tapak atau cache pelayar, atau menyahpasang aplikasi, boleh memadam kedua-dua storan. Fail pangkalan data yang dimuat turun kekal selamat."],["Snapshot Otomatis","Automatic Snapshots","Syot Kilat Automatik"],["Belum ada snapshot.","No snapshots yet.","Belum ada syot kilat."],["Sebelum pemulihan","Before restore","Sebelum pemulihan"],["Item","Items","Item"],["Pulihkan","Restore","Pulihkan"],["Snapshot dibuat otomatis setiap hari saat aplikasi pertama dibuka (14 hari terakhir).","A snapshot is created automatically each day when the app is first opened (last 14 days).","Syot kilat dibuat secara automatik setiap hari apabila aplikasi dibuka pertama kali (14 hari terakhir)."],["Pulihkan snapshot?","Restore snapshot?","Pulihkan syot kilat?"],["Data saat ini akan ditimpa. Kondisi saat ini disimpan dulu sebagai snapshot \"Sebelum pemulihan\".","Current data will be overwritten. The current state is saved first as a \"Before restore\" snapshot.","Data semasa akan ditimpa. Keadaan semasa disimpan dahulu sebagai syot kilat \"Sebelum pemulihan\"."],["Snapshot tidak ditemukan","Snapshot not found","Syot kilat tidak dijumpai"],["Gagal menautkan file","Failed to link file","Gagal memautkan fail"],["Data dipulihkan dari cadangan database","Data restored from the database backup","Data dipulihkan daripada sandaran pangkalan data"],["Data diperbarui dari cadangan database","Data updated from the database backup","Data dikemas kini daripada sandaran pangkalan data"],["Penyimpanan browser penuh, data tetap aman di cadangan database","Browser storage is full; data is still safe in the database backup","Storan pelayar penuh; data kekal selamat dalam sandaran pangkalan data"],["Sudah lebih dari 7 hari belum unduh file database (Pengaturan)","It has been over 7 days since the last database download (Settings)","Sudah lebih 7 hari sejak muat turun fail pangkalan data (Tetapan)"],["Saat gambar menu diketuk","When a menu image is tapped","Apabila imej menu diketik"],["Tambah 1 langsung","Add 1 instantly","Tambah 1 terus"],["Pilih jumlah","Choose quantity","Pilih kuantiti"],["Lihat detail","View details","Lihat butiran"],["Tanpa aksi","No action","Tiada tindakan"],["Jumlah","Quantity","Kuantiti"],["Tambah ke Pesanan","Add to Order","Tambah ke Pesanan"],["Stok habis","Out of stock","Stok habis"],["Tambah 1 langsung: sekali ketuk gambar, item masuk ke pesanan. Pilih jumlah: muncul kotak untuk mengatur jumlah. Lihat detail: tampil gambar besar dan info dulu. Tombol + dan − di kartu tetap bisa dipakai di semua mode.","Add 1 instantly: one tap on the image adds the item to the order. Choose quantity: a box appears to set the amount. View details: shows a large image and info first. The + and − buttons on the card work in every mode.","Tambah 1 terus: satu ketikan pada imej menambah item ke pesanan. Pilih kuantiti: kotak muncul untuk menetapkan jumlah. Lihat butiran: papar imej besar dan maklumat dahulu. Butang + dan − pada kad sentiasa boleh digunakan."],["Logo Perusahaan","Company Logo","Logo Syarikat"],["Tampilkan logo di aplikasi","Show logo in the app","Papar logo dalam aplikasi"],["Logo dipakai di menu aplikasi dan struk. Ukuran logo di struk diatur di Desain Struk.","The logo is used in the app menu and on receipts. Receipt logo size is set in Receipt Design.","Logo digunakan dalam menu aplikasi dan resit. Saiz logo pada resit ditetapkan dalam Reka Bentuk Resit."],["Ubah logo di Pengaturan","Change logo in Settings","Tukar logo dalam Tetapan"],["Logo perusahaan diatur di Pengaturan > Logo Perusahaan. Logo hitam-putih paling bagus untuk printer thermal.","Set the company logo in Settings > Company Logo. Black-and-white logos work best on thermal printers.","Tetapkan logo syarikat dalam Tetapan > Logo Syarikat. Logo hitam putih paling sesuai untuk pencetak terma."],["Semua pengaturan tampilan struk kembali ke default.","All receipt display settings return to default.","Semua tetapan paparan resit kembali kepada asal."],
["Dari","From","Dari"],["Sampai","To","Hingga"],["Hari ini","Today","Hari ini"],["Kemarin","Yesterday","Semalam"],["7 Hari","7 Days","7 Hari"],["Bulan ini","This month","Bulan ini"],["Semua","All","Semua"],["Penjualan","Sales","Jualan"],["Transaksi","Transactions","Transaksi"],["Estimasi Laba","Estimated Profit","Anggaran Untung"],["Tidak ada transaksi pada tanggal ini.","No transactions on these dates.","Tiada transaksi pada tarikh ini."],["Sangat besar","Extra large"],
["Logo hitam-putih paling bagus untuk printer thermal.","Black-and-white logos work best on thermal printers.","Logo hitam putih paling sesuai untuk pencetak terma."],
["Alamat toko","Store address","Alamat kedai"],["No. invoice","Invoice no.","No. invois"],["Tanggal & jam","Date & time","Tarikh & masa"],["Tipe order","Order type","Jenis pesanan"],["Nama pelanggan","Customer name"],["Nama kasir","Cashier name","Nama juruwang"],
["Baris diskon","Discount line","Baris diskaun"],["Baris pajak","Tax line","Baris cukai"],["Bayar & kembalian","Payment & change","Bayaran & baki"],["Pesan footer","Footer message","Mesej kaki"],
["Baris tambahan di header","Extra header line","Baris tambahan pada pengepala"],["Baris tambahan di footer","Extra footer line","Baris tambahan pada pengaki"],
["mis. Telp 0812-xxxx / @instagram","e.g. Phone 0812-xxxx / @instagram","cth. Tel 012-xxxx / @instagram"],["mis. Rina","e.g. Rina","cth. Rina"],["mis. WiFi: tokoku123","e.g. WiFi: mystore123","cth. WiFi: kedai123"],

["Perataan header","Header alignment","Penjajaran pengepala"],["Kiri","Left"],["Kanan","Right"],["Ukuran huruf","Font size","Saiz huruf"],
["Format daftar item","Item list format","Format senarai item"],["2 baris (nama, lalu qty x harga)","2 lines (name, then qty x price)","2 baris (nama, kemudian kuantiti x harga)"],["1 baris (qty nama ... total)","1 line (qty name ... total)","1 baris (kuantiti nama ... jumlah)"],
["Garis pemisah","Divider line"],["Putus-putus (- - -)","Dashed (- - -)"],["Sama dengan (=====)","Equals (=====)"],["Tanpa garis","No line"],
["Spasi kosong di akhir struk","Blank space at end of receipt","Ruang kosong di hujung resit"],["Total dengan huruf besar","Large total text","Jumlah dengan huruf besar"],
["Kembalikan desain default","Restore default design","Pulihkan reka bentuk asal"],["Cetak Contoh","Print Sample"],
["Koneksi","Connection","Sambungan"],["Mode cetak","Print mode","Mod cetak"],["Dialog browser (USB / Wi-Fi / driver)","Browser dialog (USB / Wi-Fi / driver)","Dialog pelayar (USB / Wi-Fi / pemacu)"],
["Bluetooth klasik / USB (Web Serial, desktop)","Classic Bluetooth / USB (Web Serial, desktop)"],["Android: aplikasi RawBT","Android: RawBT app"],
["Memakai dialog cetak bawaan browser. Cocok untuk printer USB / Wi-Fi / yang sudah terpasang di komputer atau HP. Pilih ukuran kertas yang sama dengan printer.","Uses the browser's built-in print dialog. Good for USB / Wi-Fi printers or printers already installed on your computer or phone. Pick the same paper size as the printer.","Menggunakan dialog cetak terbina dalam pelayar. Sesuai untuk pencetak USB / Wi-Fi atau yang telah dipasang pada komputer atau telefon. Pilih saiz kertas yang sama dengan pencetak."],
["Untuk printer thermal Bluetooth BLE (Bluetooth 4.0+). Klik Cari & Hubungkan lalu pilih printer. Perlu Chrome (Android/Windows/Mac) atau Bluefy di iPhone; Safari tidak mendukung. Buka halaman ini sebagai file atau lewat https.","For Bluetooth BLE thermal printers (Bluetooth 4.0+). Click Find & Connect, then pick the printer. Needs Chrome (Android/Windows/Mac) or Bluefy on iPhone; Safari is not supported. Open this page as a file or over https.","Untuk pencetak terma Bluetooth BLE (Bluetooth 4.0+). Klik Cari & Sambung, kemudian pilih pencetak. Memerlukan Chrome (Android/Windows/Mac) atau Bluefy pada iPhone; Safari tidak disokong. Buka halaman ini sebagai fail atau melalui https."],
["Untuk printer Bluetooth klasik (SPP) yang sudah di-pair di komputer (muncul sebagai port COM) atau printer USB. Hanya Chrome/Edge desktop. Atur baud rate sesuai printer (umumnya 9600 atau 115200).","For classic Bluetooth (SPP) printers already paired with your computer (shown as a COM port) or USB printers. Desktop Chrome/Edge only. Set the baud rate to match the printer (usually 9600 or 115200).","Untuk pencetak Bluetooth klasik (SPP) yang telah dipasangkan dengan komputer (muncul sebagai port COM) atau pencetak USB. Hanya Chrome/Edge desktop. Tetapkan baud rate mengikut pencetak (biasanya 9600 atau 115200)."],
["Untuk HP Android dengan printer Bluetooth klasik: pasang aplikasi gratis RawBT dari Play Store, pair printer di RawBT, lalu cetak dari sini. Struk dikirim ke RawBT.","For Android phones with a classic Bluetooth printer: install the free RawBT app from the Play Store, pair the printer in RawBT, then print from here. The receipt is sent to RawBT.","Untuk telefon Android dengan pencetak Bluetooth klasik: pasang aplikasi percuma RawBT dari Play Store, pasangkan pencetak dalam RawBT, kemudian cetak dari sini. Resit dihantar ke RawBT."],
["Cari & Hubungkan","Find & Connect","Cari & Sambung"],["Putuskan","Disconnect","Putuskan sambungan"],["Tes Cetak","Test Print","Ujian Cetak"],
["Memakai dialog cetak browser","Using the browser print dialog","Menggunakan dialog cetak pelayar"],["Dikirim lewat aplikasi RawBT","Sent via the RawBT app","Dihantar melalui aplikasi RawBT"],["Belum terhubung","Not connected","Belum bersambung"],["Terhubung: port serial","Connected: serial port","Bersambung: port bersiri"],
["Opsi Cetak","Print Options","Pilihan Cetak"],["Ukuran kertas","Paper size","Saiz kertas"],["Thermal 80 mm (48 karakter)","Thermal 80 mm (48 characters)","Terma 80 mm (48 aksara)"],["Thermal 58 mm (32 karakter)","Thermal 58 mm (32 characters)","Terma 58 mm (32 aksara)"],
["Cetak otomatis setelah pembayaran","Auto-print after payment","Cetak automatik selepas bayaran"],["Kembali ke kasir otomatis setelah struk tercetak","Return to cashier automatically after the receipt prints","Kembali ke juruwang secara automatik selepas resit dicetak"],
["Potong kertas otomatis","Auto-cut paper","Potong kertas automatik"],["Buka laci kasir (port RJ11)","Open cash drawer (RJ11 port)","Buka laci wang (port RJ11)"],
["Ukuran paket BLE (byte)","BLE packet size (bytes)","Saiz paket BLE (bait)"],["Jeda antar paket (ms)","Delay between packets (ms)","Jeda antara paket (ms)"],["UUID service printer (opsional)","Printer service UUID (optional)","UUID perkhidmatan pencetak (pilihan)"],
["Jika struk terpotong atau berantakan lewat BLE, turunkan ukuran paket ke 20 dan naikkan jeda ke 30. Setelah halaman dimuat ulang, sambungkan printer lagi (aturan keamanan browser).","If the receipt is cut off or garbled over BLE, lower the packet size to 20 and raise the delay to 30. After the page reloads, reconnect the printer (browser security rule).","Jika resit terpotong atau bercelaru melalui BLE, turunkan saiz paket kepada 20 dan naikkan jeda kepada 30. Selepas halaman dimuat semula, sambung semula pencetak (peraturan keselamatan pelayar)."],
["Nama toko","Store name","Nama kedai"],["Alamat / telepon (tampil di struk)","Address / phone (shown on receipt)","Alamat / telefon (dipaparkan pada resit)"],["Pajak (%)","Tax (%)","Cukai (%)"],
["Batas stok menipis (default)","Low-stock threshold (default)","Had stok rendah (lalai)"],["Pesan di bawah struk","Receipt footer message","Mesej di bawah resit"],["Simpan Pengaturan","Save Settings","Simpan Tetapan"],
["Bahasa","Language"],["Bahasa aplikasi","App language"],["Mengubah bahasa menu, tombol, dan struk. Nama item, kategori, dan nama toko tidak diterjemahkan.","Changes the language of menus, buttons and receipts. Item names, categories and the store name are not translated.","Menukar bahasa menu, butang dan resit. Nama item, kategori dan nama kedai tidak diterjemahkan."],
["Mata Uang & Harga","Currency & Prices","Mata Wang & Harga"],["Mata uang","Currency","Mata wang"],["Lainnya (atur manual)","Other (manual)","Lain-lain (manual)"],["Posisi simbol","Symbol position","Kedudukan simbol"],
["Di depan (Rp 1.000)","Before amount (Rp 1.000)","Sebelum jumlah (Rp 1.000)"],["Di belakang (1.000 Rp)","After amount (1.000 Rp)","Selepas jumlah (1.000 Rp)"],["Angka desimal","Decimal places","Tempat perpuluhan"],["0 (bulat)","0 (whole)"],
["Format angka","Number format","Format nombor"],["1.234,56 (titik ribuan)","1.234,56 (dot for thousands)"],["1,234.56 (koma ribuan)","1,234.56 (comma for thousands)"],["Contoh","Example"],
["Dengan desimal, harga jual, diskon, pajak, dan total tidak dibulatkan ke bilangan bulat. Harga yang sudah tersimpan tidak dikonversi otomatis saat mata uang diganti; edit harga item jika perlu.","With decimals, selling prices, discounts, tax and totals are not rounded to whole numbers. Saved prices are not converted automatically when you change currency; edit item prices if needed.","Dengan perpuluhan, harga jualan, diskaun, cukai dan jumlah tidak dibundarkan kepada nombor bulat. Harga yang telah disimpan tidak ditukar secara automatik apabila mata wang diubah; sunting harga item jika perlu."],
["Nama kategori baru","New category name"],["Backup (JSON)","Backup (JSON)","Sandaran (JSON)"],["Restore","Restore","Pulihkan"],["Reset Semua","Reset All","Set Semula Semua"],
["Data tersimpan di browser perangkat ini. Lakukan backup secara berkala.","Data is stored in this device's browser. Back up regularly.","Data disimpan dalam pelayar peranti ini. Buat sandaran secara berkala."],
["Atur Tampilan Menu","Customize Menu Display","Tetapkan Paparan Menu"],["Jumlah kolom: layar besar (PC / tablet)","Columns: large screen (PC / tablet)","Bilangan lajur: skrin besar (PC / tablet)"],
["Jumlah kolom: HP","Columns: phone","Bilangan lajur: telefon"],["Tampilkan stok","Show stock","Papar stok"],["Tampilkan bar kategori","Show category bar","Papar bar kategori"],
["Kolom tidak berlaku di mode Daftar. Menu yang lebih banyak dari kolom akan bisa di-scroll ke bawah.","Columns do not apply in List mode. Extra menu items can be scrolled down.","Lajur tidak terpakai dalam mod Senarai. Menu yang lebih banyak boleh digulung ke bawah."],
["Pembayaran","Payment"],["Nama pelanggan / meja (opsional)","Customer / table name (optional)","Nama pelanggan / meja (pilihan)"],["Metode","Method","Kaedah"],["Tunai","Cash"],["Kartu","Card","Kad"],
["Uang diterima","Amount received","Wang diterima"],["Uang Pas","Exact Amount","Wang Pas"],["Kembalian","Change","Baki"],["Kurang","Short"],["Bayar & Cetak Struk","Pay & Print Receipt","Bayar & Cetak Resit"],
["Cetak Struk","Print Receipt","Cetak Resit"],["Transaksi Baru","New Transaction","Transaksi Baharu"],["Tutup","Close"],["Batal","Cancel"],["Selesai","Done"],["Simpan","Save"],["Tambah","Add"],
["Tanggal","Date","Tarikh"],["Pelanggan","Customer"],["Kembali","Change","Baki"],["TOTAL","TOTAL","JUMLAH"],
["atau kategori baru","or new category","atau kategori baharu"],["Opsional","Optional","Pilihan"],["Batas stok menipis","Low-stock threshold","Had stok rendah"],["Hapus Item","Delete Item","Padam Item"],["Upload Gambar","Upload Image","Muat Naik Gambar"],
["Hapus item?","Delete item?","Padam item?"],["Hapus item terpilih?","Delete selected items?","Padam item dipilih?"],["Pulihkan backup?","Restore backup?","Pulihkan sandaran?"],
["Semua data saat ini akan ditimpa dengan isi file backup.","All current data will be overwritten with the backup file.","Semua data semasa akan ditimpa dengan fail sandaran."],["Pulihkan","Restore"],
["Reset semua data?","Reset all data?","Set semula semua data?"],["Semua item, riwayat, dan pengaturan dihapus lalu kembali ke data contoh.","All items, history and settings will be erased and reset to sample data.","Semua item, sejarah dan tetapan akan dipadam dan dikembalikan kepada data contoh."],
["Reset","Reset","Set Semula"],["Reset desain struk?","Reset receipt design?","Set semula reka bentuk resit?"],["Semua pengaturan tampilan struk kembali ke default (logo ikut dihapus).","All receipt display settings return to default (the logo is removed too).","Semua tetapan paparan resit kembali kepada asal (logo turut dipadam)."],["Ya","Yes"],
["Penyimpanan penuh — kurangi gambar atau hapus data lama","Storage full — reduce images or delete old data","Storan penuh — kurangkan imej atau padam data lama"],["Stok tidak mencukupi","Not enough stock"],["MEJA","TABLE","MEJA"],["Tema","Theme","Tema"],["Terang","Light","Cerah"],["Gelap","Dark","Gelap"],["Otomatis","Automatic","Automatik"],["Gelap nyaman dipakai malam hari. Otomatis mengikuti pengaturan tampilan HP atau komputer. Pilihan ini hanya berlaku di perangkat ini; struk yang dicetak tetap putih.","Dark is comfortable at night. Automatic follows the display setting of your phone or computer. This choice applies to this device only; printed receipts stay white.","Gelap selesa digunakan pada waktu malam. Automatik mengikut tetapan paparan telefon atau komputer. Pilihan ini hanya untuk peranti ini; resit yang dicetak kekal putih."],["📍 Isi alamat dari GPS","📍 Fill address from GPS","📍 Isi alamat daripada GPS"],["Alamat terisi. Periksa lalu tekan Simpan Pengaturan.","Address filled. Check, then tap Save Settings.","Alamat diisi. Semak kemudian tekan Simpan Tetapan."],["Alamat tidak bisa diambil (butuh internet).","Could not fetch the address (needs internet).","Alamat tidak dapat diambil (perlu internet)."],["Mencari lokasi…","Finding location…","Mencari lokasi…"],["Sambung otomatis ke printer sebelumnya","Reconnect automatically to the previous printer","Sambung semula secara automatik ke pencetak sebelumnya"],["Lupakan printer","Forget printer","Lupakan pencetak"],["Printer yang tersimpan dilupakan","The saved printer was forgotten","Pencetak yang disimpan telah dilupakan"],["Nama kasir otomatis dari akun yang login","Cashier name automatically from the signed-in account","Nama juruwang automatik daripada akaun yang log masuk"],["Item paket / set (berisi beberapa item)","Bundle / set item (contains several items)","Item paket / set (mengandungi beberapa item)"],["+ Tambah isi","+ Add content","+ Tambah kandungan"],["Pilih minimal 1 isi paket","Choose at least 1 bundle content","Pilih sekurang-kurangnya 1 kandungan paket"],["Isi paket tidak boleh berupa paket lain","A bundle cannot contain another bundle","Kandungan paket tidak boleh paket lain"],["Pilih item…","Choose item…","Pilih item…"],["Item ini sudah jadi isi paket lain, tidak bisa dijadikan paket","This item is already part of another bundle, so it cannot become a bundle","Item ini sudah menjadi kandungan paket lain, tidak boleh dijadikan paket"],
["Uang diterima kurang","Amount received is not enough","Wang diterima tidak mencukupi"],["Gambar tidak valid","Invalid image","Imej tidak sah"],["Nama wajib diisi","Name is required"],["Harga wajib diisi","Price is required"],
["Pilih / isi kategori","Choose / enter a category"],["Item disimpan","Item saved"],["Pengaturan disimpan","Settings saved","Tetapan disimpan"],["Data dipulihkan","Data restored"],["File backup tidak valid","Invalid backup file","Fail sandaran tidak sah"],
["Data direset","Data reset","Data disetel semula"],["Struk dikirim ke printer","Receipt sent to printer","Resit dihantar ke pencetak"],["Pemilihan printer dibatalkan","Printer selection cancelled","Pemilihan pencetak dibatalkan"],
["Port serial terhubung","Serial port connected","Port bersiri bersambung"],["Mode ini tidak perlu koneksi manual","This mode needs no manual connection","Mod ini tidak memerlukan sambungan manual"],["Koneksi printer diputus","Printer disconnected","Sambungan pencetak diputuskan"],
["Transaksi selesai. Siap untuk transaksi baru.","Transaction complete. Ready for a new one.","Transaksi selesai. Sedia untuk transaksi baharu."],
["Web Bluetooth tidak didukung di browser ini. Pakai Chrome (Android/Windows/Mac) atau Bluefy (iPhone).","Web Bluetooth is not supported in this browser. Use Chrome (Android/Windows/Mac) or Bluefy (iPhone).","Web Bluetooth tidak disokong dalam pelayar ini. Guna Chrome (Android/Windows/Mac) atau Bluefy (iPhone)."],
["Karakteristik tulis printer tidak ditemukan. Isi UUID service printer di opsi lanjutan.","Printer write characteristic not found. Enter the printer service UUID under Advanced.","Ciri tulis pencetak tidak dijumpai. Isi UUID perkhidmatan pencetak di bahagian Lanjutan."],
["Web Serial tidak didukung. Pakai Chrome/Edge di komputer (Windows/Mac/Linux).","Web Serial is not supported. Use Chrome/Edge on a computer (Windows/Mac/Linux).","Web Serial tidak disokong. Guna Chrome/Edge pada komputer (Windows/Mac/Linux)."]
];
const TRD={en:{},ms:{}};
TR_ROWS.forEach(r=>{TRD.en[r[0]]=r[1];if(r[2])TRD.ms[r[0]]=r[2]});
const TR_RULES=[
 [/^Stok: (\d+)$/,{en:'Stock: $1'}],
 [/^Aktif · (\d+) KB$/,{en:'Active · $1 KB',ms:'Aktif · $1 KB'}],
 [/^(\d+) Items$/,{ms:'$1 Item'}],
 [/^(\d+) item$/,{en:'$1 items'}],
 [/^Pajak \((.+)\)$/,{en:'Tax ($1)',ms:'Cukai ($1)'}],
 [/^Bayar \((.+)\)$/,{en:(m,a)=>'Paid ('+tr(a)+')',ms:(m,a)=>'Dibayar ('+tr(a)+')'}],
 [/^Hapus terpilih \((\d+)\)$/,{en:'Delete selected ($1)',ms:'Padam dipilih ($1)'}],
 [/^(\d+) item dihapus$/,{en:'$1 items deleted',ms:'$1 item dipadam'}],
 [/^(\d+) item akan dihapus dari menu dan inventori\.$/,{en:'$1 items will be removed from the menu and inventory.',ms:'$1 item akan dipadam dari menu dan inventori.'}],
 [/^"(.+)" akan dihapus dari menu dan inventori\. Riwayat penjualan tidak terpengaruh\.$/,{en:'"$1" will be removed from the menu and inventory. Sales history is not affected.',ms:'"$1" akan dipadam dari menu dan inventori. Sejarah jualan tidak terjejas.'}],
 [/^Masih ada (\d+) item di kategori ini$/,{en:'There are still $1 items in this category',ms:'Masih ada $1 item dalam kategori ini'}],
 [/^Terhubung: (.+)$/,{en:'Connected: $1',ms:'Bersambung: $1'}],
 [/^Terhubung ke (.+)$/,{en:'Connected to $1',ms:'Bersambung ke $1'}],
 [/^Gagal cetak: (.+)$/,{en:(m,a)=>'Print failed: '+tr(a),ms:(m,a)=>'Cetak gagal: '+tr(a)}],
 [/^Gagal: (.+)$/,{en:(m,a)=>'Failed: '+tr(a)}],
 [/^(.+): stok tidak cukup$/,{en:'$1: not enough stock',ms:'$1: stok tidak mencukupi'}],
 [/^Penjualan (INV-.+)$/,{en:'Sale $1',ms:'Jualan $1'}],
 [/^(\d+) baris$/,{en:'$1 lines'}],
 [/^(\d+) desimal$/,{en:'$1 decimals',ms:'$1 perpuluhan'}]
];
function tr(s){
  const L=lang();
  if(L==='id'||!s)return s;
  const D=TRD[L]||{};
  const pre=(s.match(/^[\s\p{S}\p{M}]*/u)||[''])[0],rest=s.slice(pre.length);
  const tail=(rest.match(/\s*$/)||[''])[0],body=rest.slice(0,rest.length-tail.length);
  if(!body)return s;
  if(D[body]!==undefined)return pre+D[body]+tail;
  const post=(body.match(/[\p{P}\p{S}\p{M}]*$/u)||[''])[0],core=body.slice(0,body.length-post.length);
  if(core&&D[core]!==undefined)return pre+D[core]+post+tail;
  for(const [re,o] of TR_RULES){
    const r=o[L];
    if(r!==undefined&&re.test(body))return pre+body.replace(re,r)+tail;
  }
  return s;
}
/* penerjemah DOM: teks & atribut disimpan versi aslinya agar bisa ganti bahasa kapan saja */
const I18N_ORIG=new WeakMap(),I18N_ATTRS=['placeholder','title','aria-label'];
function trText(n){
  const p=n.parentNode;
  if(!p||/^(SCRIPT|STYLE)$/.test(p.nodeName)||!/\S/.test(n.nodeValue))return;
  let o=I18N_ORIG.get(n);
  if(o===undefined||(n.nodeValue!==o&&n.nodeValue!==tr(o)))o=n.nodeValue;
  I18N_ORIG.set(n,o);
  const v=tr(o);
  if(n.nodeValue!==v)n.nodeValue=v;
}
function trEl(e){
  if(!e.getAttribute)return;
  for(const a of I18N_ATTRS){
    const v=e.getAttribute(a);
    if(v==null)continue;
    const k='data-o-'+a;
    let o=e.getAttribute(k);
    if(o===null||(v!==o&&v!==tr(o)))o=v;
    e.setAttribute(k,o);
    const t=tr(o);
    if(t!==v)e.setAttribute(a,t);
  }
}
function walkTr(root){
  if(!root)return;
  if(root.nodeType===3){trText(root);return}
  if(root.nodeType!==1)return;
  trEl(root);
  const w=document.createTreeWalker(root,5);
  let n;
  while((n=w.nextNode())){if(n.nodeType===3)trText(n);else trEl(n)}
}
function applyLang(){document.documentElement.lang=lang();walkTr(document.body)}
const I18N_MO=typeof MutationObserver!=='undefined'?new MutationObserver(ms=>{
  if(lang()==='id')return;
  ms.forEach(m=>{
    if(m.type==='characterData')trText(m.target);
    else m.addedNodes.forEach(walkTr);
  });
}):null;
function initI18n(){
  if(lang()!=='id')applyLang();
  if(I18N_MO)I18N_MO.observe(document.body,{childList:true,subtree:true,characterData:true});
}
function setLang(v){
  db.set.lang=v;save();
  tick();render();applyLang();
}
function renderLang(){
  const el=$('#langForm');if(!el)return;
  el.innerHTML=`<h3>Bahasa / Language</h3><label class="fl">Bahasa aplikasi</label>
  <select class="fi" onchange="setLang(this.value)">${Object.keys(LANGS).map(k=>`<option value="${k}" ${lang()===k?'selected':''}>${LANGS[k]}</option>`).join('')}</select>
`;
}

/* ---------- database: cadangan IndexedDB, snapshot harian, file tertaut ---------- */
var IDBP=null,MIRROR_T=0,MIRROR_ERR=false,LSFAIL=false,WARNED=false,FH=null,FHST='',FILE_T=0,MT=null,FT=null,SNAP_DAY='';
function idbOpen(){
  if(!IDBP)IDBP=new Promise((res,rej)=>{const r=indexedDB.open('sushi_pos_db',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  return IDBP;
}
function idbReq(mode,fn){return idbOpen().then(d=>new Promise((res,rej)=>{const t=d.transaction('kv',mode),q=fn(t.objectStore('kv'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)}))}
function idbGet(k){return idbReq('readonly',s=>s.get(k))}
function idbSet(k,v){return idbReq('readwrite',s=>s.put(v,k))}
function idbDel(k){return idbReq('readwrite',s=>s.delete(k))}
function idbKeys(){return idbReq('readonly',s=>s.getAllKeys())}
function dbJson(){return JSON.stringify(db)}
function schedMirror(){
  clearTimeout(MT);MT=setTimeout(mirror,400);
  if(FH){clearTimeout(FT);FT=setTimeout(writeFile,1500)}
}
async function mirror(){
  try{
    await idbSet('main',dbJson());MIRROR_T=Date.now();MIRROR_ERR=false;
    if(SNAP_DAY!==dkey(Date.now()))await ensureDaily();
    if(LSFAIL&&!WARNED){WARNED=true;toast('Penyimpanan browser penuh, data tetap aman di cadangan database')}
  }catch(e){
    MIRROR_ERR=true;
    if(LSFAIL){toast('Penyimpanan penuh — kurangi gambar atau hapus data lama')}
  }
}
async function snapNow(key,prune){
  await idbSet(key,{t:Date.now(),json:dbJson(),n:db.orders.length,i:db.items.length});
  if(prune){const ks=(await idbKeys()).filter(k=>/^snap-\d{4}/.test(k)).sort();for(const k of ks.slice(0,-14))await idbDel(k)}
}
async function ensureDaily(){
  const k='snap-'+dkey(Date.now());SNAP_DAY=dkey(Date.now());
  if(!(await idbGet(k)))await snapNow(k,true);
}
async function writeFile(){
  if(!FH)return;
  try{
    if((await FH.queryPermission({mode:'readwrite'}))!=='granted'){FHST='perm';return}
    const w=await FH.createWritable();await w.write(dbJson());await w.close();FHST='ok';FILE_T=Date.now();
  }catch(e){FHST='err'}
}
async function linkFile(){
  try{
    const h=await window.showSaveFilePicker({suggestedName:'sushi-pos-database.json',types:[{description:'Database POS',accept:{'application/json':['.json']}}]});
    FH=h;await idbSet('fh',h);await writeFile();toast('File database tertaut');
  }catch(e){if(e&&e.name!=='AbortError')toast('Gagal menautkan file')}
  renderDb();
}
async function allowFile(){try{if(FH&&(await FH.requestPermission({mode:'readwrite'}))==='granted')await writeFile()}catch(e){}renderDb()}
async function unlinkFile(){FH=null;FHST='';try{await idbDel('fh')}catch(e){}renderDb()}
async function askPersist(){try{await navigator.storage.persist()}catch(e){}renderDb()}
function applyDb(d){db=fixDb(d);S.cart={};S.sel.clear();save();applyBrand();go(S.view);toast('Data dipulihkan')}
async function snapRestore(k){
  let sn;try{sn=await idbGet(k)}catch(e){}
  if(!sn){toast('Snapshot tidak ditemukan');return}
  ask('Pulihkan snapshot?','Data saat ini akan ditimpa. Kondisi saat ini disimpan dulu sebagai snapshot "Sebelum pemulihan".','Pulihkan',()=>{
    snapNow('snap-prerestore').catch(()=>{});applyDb(JSON.parse(sn.json));
  });
}
async function dbBoot(){
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
  try{
    const raw=await idbGet('main');
    if(raw){
      const d=JSON.parse(raw);
      if(d&&d.items&&d.set&&(!globalThis.__lsok||(d._ts||0)>(db._ts||0))){
        const had=globalThis.__lsok;
        db=fixDb(d);try{localStorage.setItem(KEY,dbJson())}catch(e){}
        S.cart={};applyBrand();go(S.view);
        toast(had?'Data diperbarui dari cadangan database':'Data dipulihkan dari cadangan database');
      }
    }else if(globalThis.__lsok)await idbSet('main',dbJson());
    await ensureDaily();
    const h=await idbGet('fh');
    if(h){FH=h;try{FHST=(await h.queryPermission({mode:'readwrite'}))==='granted'?'ok':'perm'}catch(e){FHST='err'}}
  }catch(e){MIRROR_ERR=true}
  if(S.view==='set')renderDb();
  if(db.orders.length&&!CL.on&&FHST!=='ok'&&Date.now()-(db.set.lastBackup||0)>7*864e5)setTimeout(()=>toast('Sudah lebih dari 7 hari belum unduh file database (Pengaturan)'),2500);
}
async function renderDb(){
  const el=$('#dbForm');if(!el)return;
  if(CL.on&&!isOwner()){
    el.innerHTML=`<h3>Sinkron Online</h3><div class="dbr"><span>Status</span><b class="${CL.st==='ok'?'ok':'warn'}">${({ok:'Tersinkron',sync:'Menyinkronkan…',offline:'Offline',auth:'Perlu login',err:'Gagal sinkron'})[CL.st]||''}</b></div>
    <div class="acts" style="margin-top:12px"><button class="btn sm" onclick="syncNow()"><i class="ic" data-ic="cloud"></i>Sinkron Sekarang</button></div>
`;
    return;
  }
  let per=null,est=null,snaps=[],idbOk=true,hasMain=false;
  try{if(navigator.storage&&navigator.storage.persisted)per=await navigator.storage.persisted()}catch(e){}
  try{if(navigator.storage&&navigator.storage.estimate)est=await navigator.storage.estimate()}catch(e){}
  try{
    hasMain=!!(await idbGet('main'));
    const ks=(await idbKeys()).filter(k=>/^snap-/.test(k)).sort().reverse();
    for(const k of ks)snaps.push([k,await idbGet(k)]);
  }catch(e){idbOk=false}
  const row=(l,v,c)=>`<div class="dbr"><span>${l}</span><b class="${c||''}">${v}</b></div>`;
  const kb=Math.round(dbJson().length/1024),fs=typeof window!=='undefined'&&typeof window.showSaveFilePicker==='function';
  const lb=db.set.lastBackup,old=!CL.on&&(!lb||Date.now()-lb>7*864e5);
  const mb=n=>(n/1048576).toFixed(n>1e8?0:1)+' MB';
  const fileRow=!fs?row('File database tertaut','Tidak didukung di perangkat ini','warn'):
    FH?row('File database tertaut',FHST==='ok'?'Tertulis otomatis':FHST==='perm'?'Perlu izin <button class="chip" onclick="allowFile()">Izinkan</button>':'Gagal',FHST==='ok'?'ok':'warn')+'':row('File database tertaut','Belum ditautkan','warn');
  let srv=[];
  if(CL.on&&CL.tok){try{srv=(await (await api('/api/snapshots')).json()).snapshots||[]}catch(e){}}
  const cloudRows=CL.on?row('Sinkron online',({ok:'Tersinkron',sync:'Menyinkronkan…',offline:'Offline',auth:'Perlu login',err:'Gagal sinkron'})[CL.st]+(CL.st==='ok'&&CL.last?' · '+new Date(CL.last).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}):''),CL.st==='ok'?'ok':'warn')+row('Server',(globalThis.POS_SB?'Database Supabase':'Database SQLite di server'),'ok'):'';
  const cloudBtns=CL.on?'<button class="btn sm" onclick="syncNow()"><i class="ic" data-ic="cloud"></i>Sinkron Sekarang</button><button class="btn sm sec" onclick="downloadServerExport()"><i class="ic" data-ic="download"></i>Unduh dari Server</button><button class="btn sm sec" onclick="doLogout()">Keluar</button>':'';
  const srvSnaps=CL.on&&srv.length?'<label class="fl" style="margin-top:12px">Snapshot Server</label>'+srv.map(x=>`<div class="dbs"><span>${new Date(x.created_at).toLocaleString(dloc(),{day:'2-digit',month:'short',year:'numeric'})} · ${Math.round(x.size/1024)} KB</span><button class="chip" onclick="srvSnapRestore('${x.day}')">Pulihkan</button></div>`).join('')+'':'';
  el.innerHTML=`<h3>Database & Penyimpanan</h3>
  ${cloudRows}
  ${row('Penyimpanan utama (browser)','Aktif · '+kb+' KB','ok')}
  ${row('Cadangan database (IndexedDB)',!idbOk?'Tidak tersedia':(hasMain||MIRROR_T)?'Aktif':'Menunggu data pertama',idbOk?'ok':'warn')}
  ${row('Penyimpanan permanen',per?'Ya':'Belum'+(per===false?' <button class="chip" onclick="askPersist()">Minta</button>':''),per?'ok':'warn')}
  ${est&&est.quota?row('Ruang terpakai',mb(est.usage||0)+' / '+mb(est.quota)):''}
  ${fileRow}
  ${row('Backup terakhir',lb?new Date(lb).toLocaleString(dloc(),{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Belum pernah',old?'warn':'ok')}
  <div class="acts" style="flex-wrap:wrap;margin-top:12px">
    ${cloudBtns}
    <button class="btn sm" onclick="backup()"><i class="ic" data-ic="download"></i>Unduh File Database</button>
    <button class="btn sm sec" onclick="$('#restoreF').click()"><i class="ic" data-ic="upload"></i>Pulihkan dari File</button>
    ${fs?(FH?'<button class="btn sm sec" onclick="unlinkFile()">Putuskan File</button>':'<button class="btn sm sec" onclick="linkFile()"><i class="ic" data-ic="link"></i>Tautkan File Database</button>'):''}
    <button class="btn sm red" onclick="resetAll()">Reset Semua</button>
    <input type="file" id="restoreF" accept=".json,application/json" hidden onchange="restore(this)">
  </div>
  ${srvSnaps}
  <label class="fl" style="margin-top:12px">Snapshot Otomatis</label>
  ${snaps.length?snaps.map(([k,v])=>v?`<div class="dbs"><span>${k==='snap-prerestore'?'<b>Sebelum pemulihan</b> · ':''}${new Date(v.t).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · <span>${v.i}</span> <span>Item</span> · <span>${v.n}</span> <span>Transaksi</span></span><button class="chip" onclick="snapRestore('${k}')">Pulihkan</button></div>`:'').join(''):''}
`;
}

/* ---------- tema: Terang / Gelap / Otomatis (disimpan per perangkat, dipakai juga oleh dashboard) ---------- */
const themePref=()=>{try{return localStorage.getItem('pos_theme')||'light'}catch(e){return 'light'}};
function applyTheme(){
  const t=themePref(),d=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme',d?'dark':'light');
  const m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',d?'#0E0F12':'#F6F6F6');var c=document.querySelector('meta[name=color-scheme]');if(c)c.setAttribute('content',d?'dark':'only light');
  const ic=d?'icon-ordela-dark.svg':'icon-ordela-red.svg';document.querySelectorAll('link[rel=icon]').forEach(l=>{if(l.getAttribute('href')!==ic)l.setAttribute('href',ic)});const touch=document.querySelector('link[rel=apple-touch-icon]');if(touch){const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=180;c.getContext('2d').drawImage(im,0,0,180,180);touch.href=c.toDataURL('image/png')}catch(e){touch.href=ic}};im.onerror=()=>{touch.href=ic};im.src=ic+'?v=33'}
}
function setTheme(v){try{localStorage.setItem('pos_theme',v)}catch(e){}applyTheme();renderTheme()}
function renderTheme(){
  const el=$('#themeForm');if(!el)return;const t=themePref(),auto=t==='auto';
  const eff=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
  const card=(v,l)=>{const on=!auto&&t===v||auto&&eff===v;
    return `<div class="thc ${v}"><button type="button" class="thp" onclick="setTheme('${v}')" aria-label="Tema ${l}"><span class="tpb"><i></i><i></i><i></i></span><span class="tpc"><b></b><em></em></span><span class="tpc"><b></b><em></em></span><span class="tpg"></span></button>
    <b class="thn">${l}</b><button type="button" class="thk ${on?'on':''}" onclick="setTheme('${v}')" aria-label="Pakai tema ${l}" aria-pressed="${on}">${pfi('tick',18)}</button></div>`};
  el.innerHTML=`<h3>Tema</h3><p class="pfhint" style="margin:0 0 12px">Pilih tampilan yang nyaman untuk mata Anda.</p>
  <div class="thg">${card('light','Terang')}${card('dark','Gelap')}</div>
  <label class="tgl prm" style="margin-top:10px"><input type="checkbox" ${auto?'checked':''} onchange="setTheme(this.checked?'auto':'${eff}')"><span><b>Ikuti pengaturan perangkat</b><small>Otomatis terang atau gelap sesuai perangkat Anda.</small></span></label>`;
}
try{if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(themePref()==='auto')applyTheme()})}catch(e){}
applyTheme();  /* sekali saat awal: menyamakan favicon/apple-touch dengan tema (skrip di <head> berjalan sebelum tag ikon ada) */
function setupPwa(){
  try{
    if(globalThis.POS_CLOUD)return;
    if(!/^https?:/.test(location.protocol)||!document.head)return;
    const im=new Image();
    im.onload=()=>{try{
      const mk=n=>{const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');x.fillStyle='#242426';x.fillRect(0,0,n,n);const k=Math.min(n/im.width,n/im.height),w=im.width*k,h=im.height*k;x.drawImage(im,(n-w)/2,(n-h)/2,w,h);return c.toDataURL('image/png')};
      const i1=mk(192),i2=mk(512),nm=db.set.store||'Ordela';
      const m={name:nm,short_name:nm,start_url:location.href.split('#')[0],display:'fullscreen',display_override:['fullscreen','standalone'],background_color:'#ffffff',theme_color:'#ffffff',icons:[{src:i1,sizes:'192x192',type:'image/png'},{src:i2,sizes:'512x512',type:'image/png',purpose:'any'}]};
      const l=document.createElement('link');l.rel='manifest';l.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));document.head.appendChild(l);
      const a=document.createElement('link');a.rel='apple-touch-icon';a.href=i1;document.head.appendChild(a);
    }catch(e){}};
    im.src=db.set.logo||DEF_LOGO;
  }catch(e){}
}

/* ---------- atur urutan menu (inventori) ---------- */
function roList(){const c=(S.ro&&S.ro.cat)||'all';return db.items.filter(i=>c==='all'||i.cat===c)}
function orderForm(cat){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  S.ro=S.ro||{cat:'all'};if(cat!==undefined)S.ro.cat=cat;
  const c=S.ro.cat,l=roList(),mb=$('#modal'),ml=$('#rlist'),sc=ml?ml.scrollTop:0,ms=mb?mb.scrollTop:0;
  const chip=(k,t)=>`<button class="chip ${c===k?'on':''}" onclick="orderForm('${esc(k).replace(/'/g,"\\'")}')">${esc(t)}</button>`;
  openModal(`<h3>Atur Urutan Menu</h3>
  <div class="chips" style="margin-bottom:8px">${chip('all','Semua')}${db.cats.map(k=>chip(k,k)).join('')}</div>
  <div class="chips" style="margin-bottom:8px"><button class="chip" onclick="orderSort('name')">A–Z</button><button class="chip" onclick="orderSort('price')">Harga ↑</button><button class="chip" onclick="orderSort('stock')">Stok ↓</button></div>
  <div class="rlist" id="rlist">${l.map((i,n)=>`<div class="rrow" data-id="${esc(i.id)}"><span class="rn">${n+1}</span><div class="th">${thumb(i)}</div><div class="rnm"><b>${esc(i.name)}</b><small>${esc(i.cat)}</small></div><button class="rmv" onclick="orderMove('${i.id}',-1)">▲</button><button class="rmv" onclick="orderMove('${i.id}',1)">▼</button><span class="rh" onpointerdown="orderDrag(event)">⠿</span></div>`).join('')||''}</div>
  <button class="btn" onclick="closeModal()">Selesai</button>`);
  const nl=$('#rlist'),nm=$('#modal');if(nl)nl.scrollTop=sc;if(nm)nm.scrollTop=ms;
}
function orderCommit(ids){
  const set=new Set(ids),slots=[];db.items.forEach((it,i)=>{if(set.has(it.id))slots.push(i)});
  const by={};db.items.forEach(i=>by[i.id]=i);
  if(slots.length!==ids.length||ids.some(id=>!by[id]))return;
  slots.forEach((pos,k)=>{db.items[pos]=by[ids[k]]});
  save();if(ORDELA_APP_MODE==='pos')renderGrid();if(S.view==='inv')renderInv();
}
function orderMove(id,d){
  const ids=roList().map(i=>i.id),i=ids.indexOf(id),j=i+d;
  if(i<0||j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];orderCommit(ids);orderForm();
}
function orderSort(k){
  const l=roList().slice();
  if(k==='name')l.sort((a,b)=>a.name.localeCompare(b.name));
  else if(k==='price')l.sort((a,b)=>a.price-b.price);
  else l.sort((a,b)=>b.stock-a.stock);
  orderCommit(l.map(i=>i.id));orderForm();
}
function orderDrag(e){
  e.preventDefault();
  const h=e.currentTarget,row=h.closest('.rrow'),list=row.parentNode;
  row.classList.add('drag');
  let y=e.clientY;
  const tm=setInterval(()=>{const r=list.getBoundingClientRect();if(y<r.top+36)list.scrollTop-=10;else if(y>r.bottom-36)list.scrollTop+=10},16);
  const mv=ev=>{
    y=ev.clientY;
    const t=document.elementFromPoint(ev.clientX,ev.clientY),tr=t&&t.closest&&t.closest('.rrow');
    if(tr&&tr!==row&&tr.parentNode===list){const b=tr.getBoundingClientRect();list.insertBefore(row,ev.clientY<b.top+b.height/2?tr:tr.nextSibling)}
  };
  const up=()=>{
    clearInterval(tm);document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
    row.classList.remove('drag');
    const rows=[...list.querySelectorAll('.rrow')];
    rows.forEach((r,i)=>{const n=r.querySelector('.rn');if(n)n.textContent=i+1});
    orderCommit(rows.map(r=>r.dataset.id));
  };
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
}

/* ---------- online: sinkron otomatis ke server ---------- */
var CL={on:!!globalThis.POS_CLOUD,tok:'',ver:0,dirty:false,st:'off',busy:false,again:false,last:0,t:null,pt:null};
try{CL.tok=window.POS_SSO_API?'sso-cookie':(localStorage.getItem('pos_tok')||'');if(window.POS_SSO_API)localStorage.removeItem('pos_tok');const m=JSON.parse(localStorage.getItem('pos_sync')||'{}');CL.ver=m.ver||0;CL.dirty=!!m.dirty}catch(e){}
function devTag(){let d='';try{d=localStorage.getItem('pos_dev')||''}catch(e){}if(!d){d=Math.random().toString(36).replace(/[^a-z0-9]/g,'').slice(0,3).toUpperCase().padEnd(3,'X');try{localStorage.setItem('pos_dev',d)}catch(e){}}return d}
function persistMeta(){try{localStorage.setItem('pos_sync',JSON.stringify({ver:CL.ver,dirty:CL.dirty}))}catch(e){}}
function schedSync(){clearTimeout(CL.t);CL.t=setTimeout(syncNow,700)}
const CL_TXT={ok:'Tersinkron',sync:'Menyinkronkan…',offline:'Offline, data tersimpan di perangkat',auth:'Perlu login',err:'Gagal sinkron',off:''};
function setSt(s){
  CL.st=s;
  const d=$('#cdot');if(d)d.className='cdot '+(CL.on?s:'off');
  const r=$('#cloudRow'),t=$('#cloudSt'),tm=$('#cloudT');
  if(r)r.hidden=!CL.on;if(t)t.textContent=CL_TXT[s]||'';
  if(tm)tm.textContent=s==='ok'&&CL.last?new Date(CL.last).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}):'';
}
async function api(p,o){
  o=o||{};const h={'Content-Type':'application/json'};if(CL.tok)h.Authorization='Bearer '+CL.tok;
  const r=await fetch(p,{...o,headers:h,cache:'no-store'});
  if(r.status===401){
    let why='';try{why=((await r.clone().json())||{}).error||''}catch(e){}
    CL.tok='';setMe(null);try{localStorage.removeItem('pos_tok')}catch(e){}ssWarnHide();setSt('auth');applyAccess();showLogin(why==='kicked'?'Akun ini baru saja login di perangkat lain, jadi Anda dikeluarkan dari perangkat ini. Masuk lagi bila perlu.':why==='expired'?'Sesi Anda berakhir karena lama tidak dipakai. Masuk lagi untuk melanjutkan.':'');throw new Error('auth')}
  return r;
}
/* ----- penggabungan 3 arah (dasar = salinan terakhir yang tersinkron) ----- */
function sj(v){if(v&&typeof v==='object'){if(Array.isArray(v))return'['+v.map(sj).join(',')+']';return'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+sj(v[k])).join(',')+'}'}return JSON.stringify(v)}
const eqv=(a,b)=>sj(a)===sj(b);
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function m3(b,l,s){
  if(isObj(l)&&isObj(s)){
    const o={},bb=isObj(b)?b:{};
    for(const k of new Set([...Object.keys(l),...Object.keys(s)])){
      if(!(k in l)){o[k]=s[k];continue}
      if(!(k in s)){o[k]=l[k];continue}
      o[k]=m3(bb[k],l[k],s[k]);
    }
    return o;
  }
  return eqv(l,b)?s:l;
}
function merge3(base,L,S){
  const B=base||{items:[],orders:[],cats:[],log:[],set:{}};
  const mapBy=(a,k)=>{const m={};(a||[]).forEach(x=>m[x[k]]=x);return m};
  const bi=mapBy(B.items,'id'),li=mapBy(L.items,'id'),si=mapBy(S.items,'id');
  let items=[];
  S.items.forEach(s=>{
    const b=bi[s.id],l=li[s.id];
    if(!l){if(b&&eqv(s,b))return;items.push(s);return}      // dihapus di sini & server tidak mengubahnya: hapus
    if(!b){items.push(s);return}                              // baru di kedua sisi: server menang
    const m={...s};
    for(const k of new Set([...Object.keys(l),...Object.keys(b)])){
      if(k==='stock')m.stock=Math.max(0,(+s.stock||0)+((+l.stock||0)-(+b.stock||0)));   // stok digabung sebagai selisih
      else if(!eqv(l[k],b[k]))m[k]=l[k];
    }
    items.push(m);
  });
  L.items.forEach(l=>{if(!si[l.id]&&!bi[l.id])items.push(l)});   // item baru dari sini
  if(eqv(S.items.map(x=>x.id),(B.items||[]).map(x=>x.id))){     // urutan menu diubah hanya di sini: pakai urutan lokal
    const pos={};L.items.forEach((x,i)=>pos[x.id]=i);
    items=items.map((x,i)=>[x,i]).sort((a,b)=>((pos[a[0].id]??1e9)-(pos[b[0].id]??1e9))||a[1]-b[1]).map(z=>z[0]);
  }
  const om=new Map(),lo=new Set(L.orders.map(o=>o.no)),bo=new Map((B.orders||[]).map(o=>[o.no,o]));
  S.orders.forEach(o=>{if(!lo.has(o.no)&&bo.has(o.no)&&eqv(o,bo.get(o.no)))return;om.set(o.no,o)});   // dihapus di sini & server tidak mengubahnya: hapus
  L.orders.forEach(o=>{if(!om.has(o.no))om.set(o.no,o)});
  const orders=[...om.values()].sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0);
  const seen=new Set(),log=[...(S.log||[]),...(L.log||[])].filter(x=>{const k=sj(x);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0).slice(0,LOG_MAX);
  const bc=new Set(B.cats||[]),lc=new Set(L.cats||[]),sc=new Set(S.cats||[]);
  const cats=(S.cats||[]).filter(c=>!(bc.has(c)&&!lc.has(c)));(L.cats||[]).forEach(c=>{if(!sc.has(c)&&!bc.has(c))cats.push(c)});
  const vs=new Set(),voided=[...(S.voided||[]),...(L.voided||[])].filter(x=>{const k=sj(x);if(vs.has(k))return false;vs.add(k);return true}).sort((a,b)=>a.at<b.at?1:a.at>b.at?-1:0).slice(0,200);
  const colM=k=>{const m=new Map();(S[k]||[]).forEach(x=>m.set(x.id,x));(L[k]||[]).forEach(x=>{const y=m.get(x.id);if(!y||(+x.u||0)>(+y.u||0))m.set(x.id,x)});return [...m.values()]};
  const cols={};['holds','members','promos','shifts','exps','sups','buys','kds','occ','gifts','rsv'].forEach(k=>{cols[k]=colM(k)});
  return {...S,...cols,items,orders,log,voided,cats,set:m3(B.set,L.set,S.set),seq:Math.max(+L.seq||0,+S.seq||0),_ts:Math.max(+L._ts||0,+S._ts||0)};
}
/* ----- sinkron ----- */
async function getBase(){try{const x=await idbGet('base');return x?JSON.parse(x):null}catch(e){return null}}
function setBase(js){idbSet('base',js).catch(()=>{})}
function adopt(data,version,dirty){
  const raw=JSON.stringify(data);
  db=fixDb(data);db._ts=Date.now();
  try{localStorage.setItem(KEY,dbJson())}catch(e){}
  schedMirror();
  CL.ver=version;CL.dirty=!!dirty;if(!dirty)setBase(raw);persistMeta();
  applyBrand();render();
}
async function push(bv){
  const ts=db._ts,snap=dbJson();
  const r=await api('/api/data',{method:'PUT',body:'{"baseVersion":'+bv+',"data":'+snap+'}'});
  if(r.status===409)return false;
  if(r.status===403){let m='';try{m=(await r.json()).error}catch(e){}CL.deniedMsg=m||'Tidak ada izin';return 'denied'}
  if(!r.ok)throw new Error('http '+r.status);
  const j=await r.json();CL.ver=j.version;setBase(snap);
  if(db._ts===ts)CL.dirty=false;else CL.again=true;
  persistMeta();return true;
}
async function refreshMe(){ // izin/peran bisa diubah owner kapan saja: perbarui menu tanpa menunggu sinkron data
  if(!CL.tok)return;
  try{const m=await (await api('/api/me')).json();if(m&&m.username&&JSON.stringify(m)!==JSON.stringify(CL.me)){setMe(m);applyAccess()}}catch(e){}
}
async function syncNow(){
  if(!CL.on)return;
  if(CL.busy){CL.again=true;return}
  if(!CL.tok){setSt('auth');const lw=$('#login');if(!lw||lw.hidden)showLogin();return}
  CL.busy=true;setSt('sync');let ok=false;
  try{
    try{const m=await (await api('/api/me')).json();if(m&&m.username&&JSON.stringify(m)!==JSON.stringify(CL.me)){setMe(m);applyAccess()}}catch(e){if(e.message==='auth')throw e}
    for(let i=0;i<5&&!ok;i++){
      CL.again=false;
      const j=await (await api('/api/data')).json();
      if(j.data==null){                                              // server masih kosong: owner mengunggah data perangkat ini
        if(!isOwner()){toast('Server belum berisi data. Minta owner login lebih dulu.');break}
        ok=(await push(0))===true;continue}
      if(j.version===CL.ver){
        if(!CL.dirty){ok=true;continue}
        const pr=await push(CL.ver);
        if(pr==='denied'){                                           // server menolak perubahan di luar izin: batalkan bagian itu
          const m2=restrictToServer(merge3(CL.ver>0?await getBase():null,db,j.data),j.data);
          adopt(m2,j.version,true);toast('Perubahan di luar izin Anda dibatalkan: '+(CL.deniedMsg||''));
          ok=(await push(j.version))===true;
        }else ok=pr===true;
        continue}
      const fresh=CL.ver===0&&!CL.dirty&&!db.orders.length;           // perangkat baru tanpa transaksi: pakai data server
      if((!CL.dirty&&CL.ver>0)||fresh){adopt(j.data,j.version,false);ok=true;continue}
      const merged=restrictToServer(merge3(CL.ver>0?await getBase():null,db,j.data),j.data);  // ada perubahan di dua sisi
      adopt(merged,j.version,true);
      ok=(await push(j.version))===true;if(ok)toast('Data dari perangkat lain digabung');
    }
    if(ok){CL.last=Date.now();setSt('ok')}else setSt('err');
  }catch(e){if(e.message!=='auth')setSt(navigator.onLine===false?'offline':'offline')}
  CL.busy=false;
  if(CL.again&&CL.tok&&CL.st!=='auth'){CL.again=false;schedSync()}
  if(S.view==='set')renderDb();
}
async function srvSnapRestore(day){
  ask('Pulihkan snapshot server?','Data saat ini akan diganti dengan snapshot ini, lalu disinkronkan ke semua perangkat.','Pulihkan',async()=>{
    try{const j=await (await api('/api/snapshots/'+day)).json();if(j.data)applyDb(j.data)}catch(e){toast('Gagal mengambil snapshot')}
  });
}
async function downloadServerExport(){
  try{
    const r=await api('/api/export');const b=await r.blob(),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='ordela-server-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  }catch(e){toast('Gagal mengunduh')}
}
function cloudStart(){
  setSt(CL.on?(CL.tok?'sync':'auth'):'off');
  if(!CL.on)return;
  ssStart();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow()});
  window.addEventListener('online',syncNow);window.addEventListener('offline',()=>setSt('offline'));
  CL.pt=setInterval(async()=>{
    if(!CL.tok||CL.busy||document.hidden)return;
    if(CL.dirty){syncNow();return}
    try{const j=await (await api('/api/version')).json();if(j.version!==CL.ver)syncNow()}catch(e){}
    refreshMe();
  },12000);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  syncNow();
}


/* ---------- pesanan online (QR pelanggan) ---------- */
const CO={rev:0,list:[],set:{on:true,msg:''},seen:new Set(),mine:new Set(),run:false,err:false,tries:{},pr:false,ring:0,aud:null,wl:null,pend:[],title:'Ordela',perr:''};
/* cetak otomatis hanya di perangkat berizin Printer (perangkat printer); akun server yang cuma mengambil pesanan tidak ikut mencetak */
function coAuto(){return can('prn')&&coPref('auto',true)}
function coPref(k,d){try{const p=JSON.parse(localStorage.getItem('pos_co')||'{}');return p[k]==null?d:p[k]}catch(e){return d}}
function coSetPref(k,v){let p={};try{p=JSON.parse(localStorage.getItem('pos_co')||'{}')}catch(e){}p[k]=v;try{localStorage.setItem('pos_co',JSON.stringify(p))}catch(e){}}
const coNew=()=>CO.list.filter(o=>o.status==='new');
const isOnl=o=>!!o&&(o.pay==='qris'||o.pay==='duitnow');   /* 'duitnow' = pesanan lama sebelum QRIS */
/* alamat publik untuk QR: pengaturan manual > alamat dari build APK > alamat halaman ini (bukan localhost) */
function pubBase(){
  let b=String(db.set.pubUrl||'').trim()||String(window.POS_PUBLIC_URL||'').trim();
  if(b){
    if(!/^https?:\/\//i.test(b))b='https://'+b;
    b=b.split('#')[0].split('?')[0].replace(/order(\.html)?$/i,'');
    if(!b.endsWith('/'))b+='/';
    try{const u=new URL('order.html',b);if(u.hostname==='ordela.my.id'||u.hostname==='www.ordela.my.id')u.hostname='app.ordela.my.id';return u.href}catch(e){}
  }
  return new URL('order.html',location.href).href.split('#')[0];
}
const urlLocal=()=>{try{return /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(new URL(pubBase()).hostname)||!/^https?:$/.test(new URL(pubBase()).protocol)}catch(e){return true}};
const storeCode=()=>{const s=CL&&CL.me&&CL.me.store;return s&&s.code?s.code:''};
const coUrl=t=>{const q=[];if(storeCode())q.push('s='+encodeURIComponent(storeCode()));if(t)q.push('t='+encodeURIComponent(t));return pubBase()+(q.length?'?'+q.join('&'):'')};
function coSetPub(v){db.set.pubUrl=String(v||'').trim();save();coQrDraw()}
function ago(t){const s=Math.max(0,(Date.now()-new Date(t))/1000|0);if(s<60)return'baru saja';if(s<3600)return Math.floor(s/60)+' mnt lalu';if(s<86400)return Math.floor(s/3600)+' jam lalu';return new Date(t).toLocaleDateString(dloc())}

/* bunyi, notifikasi sistem, layar tetap menyala */
function coAudio(){try{if(!CO.aud){const C=window.AudioContext||window.webkitAudioContext;if(C)CO.aud=new C()}if(CO.aud&&CO.aud.state==='suspended')CO.aud.resume()}catch(e){}return CO.aud}
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(CL.on)coAudio()},{passive:true}));
function coBeep(){
  if(!coPref('sound',true))return;
  const a=coAudio();if(!a||a.state!=='running')return;
  const t=a.currentTime;
  [[880,0],[1175,.18],[880,.45],[1175,.63]].forEach(([f,d])=>{
    const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.4,t+d+.02);g.gain.exponentialRampToValueAtTime(.001,t+d+.17);
    o.connect(g);g.connect(a.destination);o.start(t+d);o.stop(t+d+.2);
  });
}
async function coNotify(title,body,tag){
  if(!coPref('notif',true))return;
  if(window.nativeNotify){try{await nativeNotify.show(title,body)}catch(e){}return}
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
    const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration(),o={body,tag:tag||'co',renotify:true,icon:'icon-ordela-dark.svg',badge:'icon-ordela-dark.svg',vibrate:[200,100,200]};
    if(reg&&reg.showNotification)await reg.showNotification(title,o);else new Notification(title,o);
  }catch(e){}
}
/* teks notifikasi (bisa diubah owner): kode {no} {nama} {meja} {total} {tipe} {item} */
const NT_EV={
  new:{l:'Pesanan baru masuk',t:'Pesanan online {no}',b:'{nama} {meja} · {tipe} · {total}'},
  pay:{l:'Bukti pembayaran masuk',t:'Pembayaran {no}',b:'{nama} mengirim bukti bayar · {total}'},
  cancel:{l:'Pesanan dibatalkan pelanggan',t:'Dibatalkan {no}',b:'{nama} membatalkan pesanan'}
};
function ntCfg(ev){const c=((CO.set&&CO.set.nt)||{})[ev]||{},d=NT_EV[ev];return{on:c.on!==false,t:c.t||d.t,b:c.b||d.b}}
function ntFmt(tpl,o){
  const m={no:o.num,nama:o.name,meja:o.tbl?'Meja '+o.tbl:'',total:money(o.total),tipe:tr(o.type),item:(o.lines||[]).map(l=>l.qty+'x '+l.name).join(', ')};
  return String(tpl).replace(/\{(\w+)\}/g,(x,k)=>m[k]==null?x:m[k]).replace(/\s+/g,' ').replace(/^[\s·]+|[\s·]+$/g,'');
}
function coEvents(evs){
  const act=evs.filter(([ev])=>ntCfg(ev).on);if(!act.length)return;
  act.forEach(([ev,o])=>{
    const c=ntCfg(ev),t=ntFmt(c.t,o),b=ntFmt(c.b,o);
    toast(t+' — '+b);clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('on'),7000);
    if(document.hidden)coNotify(t,b,'co-'+ev+'-'+o.id);
  });
  CO.ring=0;coBeep();
  try{if(coPref('vib',true)&&navigator.vibrate)navigator.vibrate([200,100,200])}catch(e){}
}
async function coSaveNt(){
  const nt={};
  for(const ev of Object.keys(NT_EV)){
    const g=k=>$('#nt_'+ev+'_'+k);if(!g('on'))return;
    nt[ev]={on:g('on').checked,t:g('t').value.trim(),b:g('b').value.trim()};
  }
  try{
    const r=await api('/api/co/settings',{method:'PUT',body:JSON.stringify({on:!!(($('#coOn')||{checked:CO.set.on}).checked),msg:($('#coMsg')||{value:CO.set.msg||''}).value,nt})});
    if(!r.ok)throw 0;CO.set=await r.json();toast('Pengaturan notifikasi disimpan');
  }catch(e){toast('Gagal menyimpan notifikasi')}
}
function ntReset(){for(const ev of Object.keys(NT_EV)){$('#nt_'+ev+'_on').checked=true;$('#nt_'+ev+'_t').value='';$('#nt_'+ev+'_b').value=''}coSaveNt()}
function ntTest(){
  const o={num:'#012',name:'Budi',tbl:'5',type:'Dine In',total:45,lines:[{qty:2,name:'Sate Ayam'},{qty:1,name:'Es Teh'}]};
  Object.keys(NT_EV).forEach((ev,i)=>setTimeout(()=>{const c=ntCfg(ev),t=ntFmt(c.t,o),b=ntFmt(c.b,o);toast(t+' — '+b);coNotify(t,b,'test-'+ev)},i*1500));
  coBeep();
}
function ntForm(){
  const row=ev=>{const d=NT_EV[ev],c=ntCfg(ev),cur=((CO.set&&CO.set.nt)||{})[ev]||{};
    return`<div class="ntr" style="margin:10px 0"><label class="tgl"><input type="checkbox" id="nt_${ev}_on" ${c.on?'checked':''} onchange="coSaveNt()"><span>${d.l}</span></label>
    <input class="fi" id="nt_${ev}_t" value="${esc(cur.t||'')}" placeholder="${esc(d.t)}" maxlength="80" onchange="coSaveNt()" aria-label="Judul">
    <input class="fi" id="nt_${ev}_b" value="${esc(cur.b||'')}" placeholder="${esc(d.b)}" maxlength="160" onchange="coSaveNt()" aria-label="Isi" style="margin-top:6px"></div>`};
  return`<h3 style="margin-top:18px">Notifikasi</h3>${Object.keys(NT_EV).map(row).join('')}
  <p class="hint">Kosongkan kolom untuk memakai teks bawaan. Kode: {no} {nama} {meja} {total} {tipe} {item}</p>
  <div class="cob"><button class="btn sec" onclick="ntTest()"><i class="ic" data-ic="bell"></i>Tes notifikasi</button><button class="btn sec" onclick="ntReset()">Kembalikan bawaan</button></div>`;
}
/* langganan push ke server: pesanan online masuk membangunkan perangkat ini walau aplikasi ditutup */
const b64ToU8=b=>{const p='='.repeat((4-b.length%4)%4),r=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function coPushSync(){
  try{
    if(window.nativePush&&CL.on&&CL.tok&&can('co')){await nativePush.sync(api,coPref('notif',true));return}
    if(!CL.on||!CL.tok||!can('co')||!('PushManager' in window)||!navigator.serviceWorker)return;
    const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;
    const want=coPref('notif',true)&&'Notification' in window&&Notification.permission==='granted';
    let sub=await reg.pushManager.getSubscription();
    if(!want){if(sub){try{await api('/api/push/sub',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})})}catch(e){}try{await sub.unsubscribe()}catch(e){}}return}
    const kr=await api('/api/push/key');if(!kr.ok)return;const k=(await kr.json()).key;if(!k)return;
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(k)});
    const j=sub.toJSON();
    await api('/api/push/sub',{method:'POST',body:JSON.stringify({subscription:{endpoint:j.endpoint,keys:j.keys}})});
  }catch(e){}
}
async function coSetNotif(on){
  if(on){
    if(window.nativeNotify){if(!(await nativeNotify.ask())){toast('Izin notifikasi ditolak. Aktifkan di pengaturan HP.');on=false}}
    else if(!('Notification' in window)){toast('Browser ini tidak mendukung notifikasi sistem');on=false}
    else{const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(p!=='granted'){toast('Izin notifikasi ditolak. Aktifkan di pengaturan browser.');on=false}}
  }
  coSetPref('notif',on);coPushSync();renderCo(true);
}
async function coWake(){
  try{if(!coPref('awake',true)||!CL.on||!CL.tok||!navigator.wakeLock||document.hidden||CO.wl)return;CO.wl=await navigator.wakeLock.request('screen');CO.wl.addEventListener('release',()=>{CO.wl=null})}catch(e){CO.wl=null}
}
function coSetAwake(on){coSetPref('awake',on);if(on)coWake();else if(CO.wl){try{CO.wl.release()}catch(e){}CO.wl=null}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)coWake()});

/* lencana + judul tab */
function coBadge(){
  const n=coNew().length,on=CL.on&&can('co');
  const b=$('#coBell'),nv=$('#coNav');if(b)b.hidden=!on;if(nv)nv.hidden=!on;
  ['coBellN','coNavN'].forEach(id=>{const e=$('#'+id);if(e){e.hidden=!n;e.textContent=n}});
  document.title=(n?'('+n+') ':'')+CO.title;
  navGroups();
}

/* polling panjang: pesanan masuk langsung muncul */
async function coLoop(){
  if(CO.run)return;CO.run=true;
  for(;;){
    if(!CL.on||!CL.tok||!can('co')){await sleep(3000);continue}
    try{
      const r=await api('/api/co?rev='+CO.rev+'&wait=25');
      if(!r.ok)throw new Error('http');
      const j=await r.json();
      if(CO.err){CO.err=false;if(S.view==='co')renderCo(false)}
      CO.rev=j.rev;
      if(!j.unchanged)coApply(j);
      if(globalThis.POS_SB)await sleep(3000); // Supabase: polling biasa (tanpa long-poll)
    }catch(e){
      if(!CO.err){CO.err=true;if(S.view==='co')renderCo(false)}
      await sleep(e&&e.message==='auth'?5000:4000);
    }
  }
}
function coApply(j){
  const prev=new Map(CO.list.map(o=>[o.id,o]));
  CO.list=j.orders||[];CO.set=j.set||CO.set;
  if(S.view==='set'&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#coForm')))renderCoSet();
  const fresh=CO.list.filter(o=>o.status==='new'&&!CO.seen.has(o.id));
  fresh.forEach(o=>CO.seen.add(o.id));
  const evs=fresh.map(o=>['new',o]);
  CO.list.forEach(o=>{const p=prev.get(o.id);if(!p||CO.mine.has(o.id))return;
    if(p.pst!==1&&o.pst===1)evs.push(['pay',o]);
    if(p.status!=='cancelled'&&o.status==='cancelled')evs.push(['cancel',o]);
  });
  coEvents(evs);
  coBadge();
  if(S.view==='co')renderCo(false);
  coAutoPrint();
}

/* tiket pesanan (dapur) */
function ticketModel(o){
  const m=[],hr=()=>m.push({t:'hr'});
  m.push({t:'text',x:o.by?'PESANAN SERVER':'PESANAN ONLINE',a:'center',b:true});
  m.push({t:'text',x:o.num,a:'center',b:true,big:true});
  hr();
  m.push({t:'row',l:'Nama',r:o.name,b:true});
  if(o.tbl)m.push({t:'text',x:'MEJA '+o.tbl,a:'center',b:true,huge:3});
  m.push({t:'row',l:'Tipe',r:tr(o.type)});
  if(o.by)m.push({t:'row',l:'Server',r:o.by});
  m.push({t:'row',l:'Waktu',r:fmtDT(o)});
  hr();
  if(o.stn)m.splice(2,0,{t:'text',x:'== '+o.stn.toUpperCase()+' ==',a:'center',b:true,big:true});
  {const g={};o.lines.forEach(l=>{const k=(find(l.id)||{}).stn||'';(g[k]=g[k]||[]).push(l)});const ks=Object.keys(g);
   ks.forEach(k=>{if(ks.length>1&&!o.stn)m.push({t:'text',x:'['+(k||'Umum')+']',a:'left',b:true});g[k].forEach(l=>m.push({t:'text',x:l.qty+'x '+l.name,a:'left',b:true}))})}
  if(o.note){hr();m.push({t:'text',x:'Catatan: '+o.note,a:'left'})}
  hr();
  m.push({t:'row',l:'TOTAL',r:money(o.total),b:true});
  m.push({t:'text',x:'BELUM DIBAYAR',a:'center',b:true});
  return m;
}
const ticketOf=o=>({...o,ticket:true});
async function printTicket(o){
  if(db.set.stSplit&&!o.stn){const g={};o.lines.forEach(l=>{const k=(find(l.id)||{}).stn||'Umum';(g[k]=g[k]||[]).push(l)});const ks=Object.keys(g);
    if(ks.length>1){let all=true;for(const k of ks){const ok=await printTicket({...o,lines:g[k],stn:k});if(!ok)all=false;await sleep(400)}return all}}
  const p=db.set.prn,t=ticketOf(o);CO.perr='';
  try{
    if(p.mode==='browser'){
      if($('#mw').classList.contains('on')){CO.perr='layar sedang dipakai';return false}
      showReceipt(t,false);await sleep(350);
      await new Promise(res=>{const d=()=>{window.removeEventListener('afterprint',d);res()};window.addEventListener('afterprint',d);window.print();setTimeout(d,90000)});
      closeModal();return true;
    }
    const data=await buildEscPos(t);
    if(p.mode==='ble')await sendBLE(data);else if(p.mode==='serial')await sendSerial(data);else sendRawBT(data);
    return true;
  }catch(e){console.error(e);CO.perr=(e&&e.name==='NotFoundError')?'pemilihan printer dibatalkan':((e&&e.message)||String(e));return false}
}
async function coAutoPrint(){
  if(CO.pr||!CL.on||!CL.tok||!coAuto())return;
  const now=Date.now();
  const todo=CO.list.filter(o=>{
    if(!(o.status==='new'||o.status==='accepted')||o.printed!==0)return false;
    const x=CO.tries[o.id];return !x||now-x.t>=(x.n>=3?120000:15000);
  }).sort((a,b)=>a.id-b.id);
  if(!todo.length)return;
  CO.pr=true;
  try{
    for(const o of todo){
      const x=CO.tries[o.id]||(CO.tries[o.id]={n:0,t:0});
      let c;
      try{c=await (await api('/api/co/'+o.id+'/print',{method:'POST',body:JSON.stringify({action:'claim'})})).json()}catch(e){break}
      if(!c.ok)continue; // perangkat lain yang mencetak
      x.t=Date.now();
      const ok=await printTicket(o);
      x.n=ok?0:x.n+1;
      try{await api('/api/co/'+o.id+'/print',{method:'POST',body:JSON.stringify({action:ok?'done':'release'})})}catch(e){}
      if(ok){o.printed=2;toast('Tiket '+o.num+' tercetak')}
    }
  }finally{CO.pr=false;if(S.view==='co')renderCo(false)}
}

/* ---------- Ambil Pesanan (server/pelayan): pesanan dibuat dari akun masing-masing, masuk ke antrean Pesanan Online yang sama,
   lalu dicetak otomatis oleh perangkat printer (layar Pesanan Online yang terbuka + printer terhubung) ---------- */
const NO={q:{},s:'',busy:false,key:'',v:(()=>{try{return localStorage.getItem('pos_nov')==='grid'?'grid':'list'}catch(e){return'list'}})()};
function noView(v){NO.v=v;try{localStorage.setItem('pos_nov',v)}catch(e){}noList()}
function noOpen(tbl){
  if(!can('co')){toast('Tidak punya izin Pesanan Online');return}
  NO.q={};NO.s='';NO.busy=false;NO.key='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  openModal(`<h3>Ambil Pesanan</h3>
  <div class="two"><div><label class="fl">Nama pelanggan *</label><input class="fi" id="noN" maxlength="40" autocomplete="off"></div>
  <div><label class="fl">Meja</label><input class="fi" id="noT" maxlength="12" autocomplete="off" value="${esc(tbl||'')}"></div></div>
  <div class="two"><div><label class="fl">Tipe</label><select class="fi" id="noTy"><option>Dine In</option><option>Takeaway</option></select></div>
  <div><label class="fl">Cari menu</label><input class="fi" id="noS" placeholder="Cari…" oninput="NO.s=this.value;noList()"></div></div>
  <div class="gtool"><span class="lb">Tampilan</span><button type="button" class="chip" id="noVl" onclick="noView('list')">Daftar</button><button type="button" class="chip" id="noVg" onclick="noView('grid')">Grid</button></div>
  <div id="noL" class="nol grid"></div>
  <label class="fl">Catatan</label><input class="fi" id="noC" maxlength="200" placeholder="Mis. tanpa pedas">
  <div class="nof"><b id="noTot"></b><button class="btn" id="noGo" onclick="noSend()">Kirim ke Printer</button></div>
  <button class="btn sec" onclick="closeModal()">Batal</button>`);
  noList();
}
function noList(){
  const q=NO.s.trim().toLowerCase(),l=$('#noL');if(!l)return;
  l.className='nol grid '+(NO.v==='list'?'list':'fd');{const a=$('#noVl'),b=$('#noVg');if(a)a.classList.toggle('on',NO.v==='list');if(b)b.classList.toggle('on',NO.v!=='list')}
  const its=db.items.filter(i=>!i.ns&&(!q||i.name.toLowerCase().includes(q)||(i.cat||'').toLowerCase().includes(q)));
  l.innerHTML=its.map(i=>{const n=NO.q[i.id]||0,out=i.stock<=0;
    return`<div class="p ${out?'out':''}"><div class="im tap${n?' has':''}" onclick="noQ('${i.id}',1)">${thumb(i)}${out?'<div class="sold">HABIS</div>':''}${n?`<div class="qov">${n}</div>`:''}</div>
    <div class="nm">${esc(i.name)}</div>${NO.v==='list'?`<div class="sub">${esc(i.cat)}</div><div class="stk ${i.stock<=i.min?'low':''}">Stok: ${i.stock}</div>`:''}
    <div class="row"><span class="pr">${money(i.price)}</span><span class="qty"><button type="button" onclick="noQ('${i.id}',-1)" ${n?'':'disabled'}>−</button><span>${n}</span><button type="button" onclick="noQ('${i.id}',1)" ${out||n>=(+i.stock||0)?'disabled':''}>+</button></span></div></div>`}).join('')||'<div class="empty">Menu tidak ditemukan.</div>';
  noTot();
}
function noQ(id,d){const i=find(id);if(!i)return;if(d>0&&i.stock<=0){toast('Stok habis');return}const n=Math.max(0,Math.min(99,(NO.q[id]||0)+d));if(n>(+i.stock||0)&&d>0){toast('Stok '+i.name+' tinggal '+i.stock);return}if(n)NO.q[id]=n;else delete NO.q[id];noList()}
function noTot(){const t=Object.keys(NO.q).reduce((a,id)=>{const i=find(id);return a+(i?i.price*NO.q[id]:0)},0),n=Object.values(NO.q).reduce((a,b)=>a+b,0),e=$('#noTot');if(e)e.textContent=n+' item · '+money(t)}
async function noSend(){
  if(NO.busy)return;
  const name=$('#noN').value.trim(),items=Object.keys(NO.q).map(id=>({id,qty:NO.q[id]}));
  if(!name){toast('Nama pelanggan wajib diisi');return}
  if(!items.length){toast('Pilih minimal 1 menu');return}
  NO.busy=true;$('#noGo').disabled=true;
  try{
    const r=await api('/api/co/new',{method:'POST',body:JSON.stringify({name,table:$('#noT').value.trim(),type:$('#noTy').value,note:$('#noC').value.trim(),items,key:NO.key})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){toast(j.error||'Gagal mengirim pesanan');NO.busy=false;$('#noGo').disabled=false;return}
    closeModal();toast('Pesanan terkirim ke printer');
    CO.rev=0;try{const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}}catch(e){}
  }catch(e){toast('Tidak bisa terhubung');NO.busy=false;const g=$('#noGo');if(g)g.disabled=false}
}
async function coPrint(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(db.set.prn.mode==='browser')showReceipt(ticketOf(o),false);
  else{const ok=await printTicket(o);toast(ok?'Tiket dikirim ke printer':'Gagal cetak: '+(CO.perr||'printer belum terhubung'))}
  api('/api/co/'+id+'/print',{method:'POST',body:JSON.stringify({action:'done'})}).catch(()=>{});
}
function coTestPrint(){
  const o={id:0,num:'#000',name:'Contoh',tbl:'5',type:'Dine In',note:'Tes cetak tiket',lines:[{id:'x',name:'Contoh Menu',price:10000,qty:2}],total:20000,t:new Date().toISOString()};
  if(db.set.prn.mode==='browser')showReceipt(ticketOf(o),false);
  else printTicket(o).then(ok=>toast(ok?'Tiket contoh dikirim':'Gagal cetak: '+(CO.perr||'printer belum terhubung')));
}

/* aksi kasir */
async function coAct(id,action,extra){
  try{
    const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action,...(extra||{})})});
    if(r.status===409){toast('Pesanan sudah diproses');return false}
    if(!r.ok)throw 0;
    if(action==='cancel')CO.mine.add(id);
    return true;
  }catch(e){toast('Gagal menghubungi server');return false}
}
function coConfirmPay(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(confirm('Sudah cek mutasi/notifikasi bank atau TNG? Pembayaran '+money(o.total)+' dari '+o.name+' benar-benar masuk?'))coAct(id,'paid');
}
async function coProof(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  openModal(`<h3>Bukti bayar · ${esc(o.num)}</h3><p style="color:var(--mu)" id="pfInfo">Memuat foto…</p>`);
  let d='';
  try{const r=await api('/api/co/'+id+'/proof');d=r.ok?((await r.json()).proof||''):''}catch(e){}
  const open=o.status==='new'||o.status==='accepted';
  openModal(`<h3>Bukti bayar · ${esc(o.num)}</h3>
  <p style="color:var(--mu);margin:0 0 8px">${esc(o.name)} · tagihan <b>${money(o.total)}</b>. Cocokkan jumlah dan waktu di foto dengan mutasi bank/TNG Anda.</p>
  ${d?`<a href="${d}" target="_blank" rel="noopener"><img src="${d}" alt="Bukti pembayaran pelanggan" style="display:block;max-width:100%;max-height:55vh;margin:0 auto 12px;border-radius:12px;border:1px solid #ddd"></a>`:'<p style="color:var(--mu)">Foto tidak tersedia.</p>'}
  ${o.pst===2?'<div class="chg"><span><i class="ic" data-ic="check"></i>Sudah Anda setujui.</span></div>':open?`<button class="btn" onclick="closeModal();coConfirmPay(${o.id})"><i class="ic" data-ic="check"></i>Setujui, pembayaran diterima</button><button class="btn sec" onclick="coRejectPay(${o.id})"><i class="ic" data-ic="x"></i>Tolak bukti</button>`:''}
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function coRejectPay(id){if(confirm('Tolak bukti ini? Pelanggan akan diminta mengunggah ulang.')){closeModal();coAct(id,'reject')}}
function coCancel(id){const o=CO.list.find(x=>x.id===id);if(o&&confirm('Batalkan pesanan '+o.num+' atas nama '+o.name+'?'+(isOnl(o)&&(o.pst===1||o.pst===2)?'\n\nPelanggan sudah membayar lewat QRIS. Kembalikan uangnya secara manual.':'')))coAct(id,'cancel')}
function scanEnter(el){
  const v=el.value.trim();if(!v||S.view!=='pos')return;
  const it=db.items.find(i=>!i.ns&&String(i.bc||'')===v);
  if(it){gridAdd(it.id);el.value='';S.q='';renderGrid();toast(it.name+' ditambahkan')}
}
/* kamera: pemindai barcode bila peramban mendukung (BarcodeDetector); pemindai Bluetooth/USB cukup mengetik ke kolom cari lalu Enter */
function scanCam(){
  P2.scan(code=>{const it=db.items.find(i=>!i.ns&&String(i.bc||'')===code);
    if(it){gridAdd(it.id);toast(it.name+' ditambahkan');return true}toast('Barcode '+code+' belum terdaftar');return false});
}
function coPay(id){
  if(ORDELA_APP_MODE!=='pos'){toast('Pembayaran pesanan dilanjutkan melalui aplikasi POS.');return}
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(Object.keys(S.cart).length&&!confirm('Keranjang kasir saat ini akan diganti dengan pesanan '+o.num+'. Lanjutkan?'))return;
  const cart={},warn=[];
  o.lines.forEach(l=>{const i=find(l.id);if(!i){warn.push(l.name+' (tidak ada)');return}if(i.stock<l.qty)warn.push(l.name+' (stok '+i.stock+')');cart[l.id]=l.qty});
  if(!Object.keys(cart).length){toast('Menu pesanan sudah tidak ada di daftar');return}
  S.cart=cart;S.cm={};S.promoId=null;S.dType='%';S.dVal=0;S.type=o.type==='Dine In'?'Dine In':'Takeaway';
  S.coId=id;S.coSig=JSON.stringify(cart);S.coCust=o.name;S.coTbl=o.tbl||'';
  if(o.status==='new')coAct(id,'accept');
  go('pos');renderGrid();renderInvoice();payForm();
  const c=$('#pCust');if(c)c.value=S.coCust;const tb=$('#pTbl');if(tb)tb.value=S.coTbl||'';
  if(warn.length)toast('Perhatian: '+warn.join(', '));
}
function coLink(no){
  if(!S.coId)return;
  const id=S.coId,same=JSON.stringify(S.cart)===S.coSig;S.coId=null;
  if(same)coDone(id,no);
}
async function coDone(id,no){
  try{const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action:'done',saleNo:no})});if(r.ok||r.status===409||r.status===404)return}catch(e){}
  CO.pend.push({id,no});try{localStorage.setItem('pos_co_pend',JSON.stringify(CO.pend))}catch(e){}
}
async function coFlush(){
  if(!CO.pend.length||!CL.tok)return;
  const left=[];
  for(const p of CO.pend){try{const r=await api('/api/co/'+p.id,{method:'POST',body:JSON.stringify({action:'done',saleNo:p.no})});if(!(r.ok||r.status===409||r.status===404))left.push(p)}catch(e){left.push(p)}}
  CO.pend=left;try{localStorage.setItem('pos_co_pend',JSON.stringify(left))}catch(e){}
}
async function coSetOpen(on){
  try{
    const r=await api('/api/co/settings',{method:'PUT',body:JSON.stringify({on,msg:($('#coMsg')||{}).value||''})});
    if(!r.ok)throw 0;CO.set=await r.json();toast(on?'Pemesanan QR dibuka':'Pemesanan QR ditutup');
  }catch(e){toast('Gagal menyimpan');renderCoSet()}
}

/* QR */
function coQr(){
  openModal(`<h3>QR Pesanan</h3><div class="qrbox" id="qrBox"></div>
  <label class="fl">Nomor meja (opsional, pesanan otomatis tahu mejanya)</label>
  <input class="fi" id="qrT" value="${esc(S.coT||'')}" maxlength="12" oninput="coQrDraw()" placeholder="mis. 5">
  <label class="fl">Alamat website pelanggan (untuk QR)</label>
  <input class="fi" id="qrPub" value="${esc(db.set.pubUrl||window.POS_PUBLIC_URL||'')}" placeholder="https://namaanda.com/" inputmode="url" autocapitalize="none" onchange="coSetPub(this.value)">
  <p class="hint" id="qrWarn" style="color:#d33;display:none">Alamat QR masih localhost, pelanggan tidak bisa membukanya. Isi alamat website Anda di atas.</p>
  <p class="hint" id="qrU" style="word-break:break-all"></p>
  <button class="btn" onclick="coQrPrint()"><i class="ic" data-ic="print"></i>Cetak kartu QR</button>
  <button class="btn sec" onclick="coQrPng()"><i class="ic" data-ic="download"></i>Unduh gambar (PNG)</button>
  <button class="btn sec" onclick="coCopy()"><i class="ic" data-ic="copy"></i>Salin tautan</button>
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
  coQrDraw();
}
function coQrDraw(){if(!storeCode()&&!coQrDraw.busy){coQrDraw.busy=1;api('/api/me').then(r=>r.json()).then(m=>{if(m&&m.username){setMe(m)}}).catch(()=>{}).finally(()=>{coQrDraw.busy=0;if(storeCode()&&$('#qrBox'))coQrDraw()})}const t=($('#qrT').value||'').trim();S.coT=t;const u=coUrl(t);$('#qrBox').innerHTML=qrSvg(u,260);$('#qrU').textContent=u;const w=$('#qrWarn');if(w)w.style.display=urlLocal()?'':'none'}
function coQrPrint(){
  const t=S.coT||'',u=coUrl(t);
  $('#pageStyle').textContent='@media print{@page{size:auto;margin:8mm}}';
  openModal(`<h3>Kartu QR</h3><div class="rc-wrap"><div id="receipt" class="rcpt" style="text-align:center;font-size:14px;width:auto;max-width:340px;margin:auto;font-family:system-ui,sans-serif">
  <b style="font-size:22px">${esc(db.set.store)}</b><div style="margin:6px 0 2px">Scan untuk memesan</div>${qrSvg(u,260)}
  ${t?`<div style="font-size:28px;font-weight:800">MEJA ${esc(t)}</div>`:''}<div style="font-size:11px;margin-top:4px;word-break:break-all">${esc(u)}</div></div></div>
  <button class="btn" onclick="window.print()"><i class="ic" data-ic="print"></i>Cetak</button><button class="btn sec" onclick="coQr()">Kembali</button>`);
}
function coQrPng(){
  const t=S.coT||'',u=coUrl(t),M=qrMatrix(u),n=M.length,sc=Math.max(4,Math.floor(900/(n+8))),W=(n+8)*sc,H=W+260,c=document.createElement('canvas');
  c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#000';
  for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(M[r][q])x.fillRect((q+4)*sc,(r+4)*sc+90,sc,sc);
  x.textAlign='center';x.fillStyle='#111';x.font='bold 60px sans-serif';x.fillText(db.set.store||'Ordela',W/2,70,W-40);
  x.font='38px sans-serif';x.fillText('Scan untuk memesan',W/2,W+135);
  if(t){x.font='bold 70px sans-serif';x.fillText('MEJA '+t,W/2,W+225,W-40)}
  c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='qr-pesan'+(t?'-meja-'+t:'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});
}
async function coCopy(){
  const u=coUrl(S.coT||'');
  try{await navigator.clipboard.writeText(u);toast('Tautan disalin')}catch(e){prompt('Salin tautan ini:',u)}
}

/* halaman Pesanan Online */
function coReady(){
  const m=db.set.prn.mode;
  return m==='browser'||m==='rawbt'||(m==='ble'&&PRN.dev&&PRN.dev.gatt.connected&&PRN.ch)||(m==='serial'&&PRN.writer);
}
function renderCo(full){
  if(!$('#coList'))return;
  const st=CO.set||{on:true,msg:''};
  if(full||!$('#coTop').innerHTML){
    const ck=(k,d,l,fn)=>`<label class="tgl"><input type="checkbox" ${coPref(k,d)?'checked':''} onchange="${fn||`coSetPref('${k}',this.checked)`}"><span>${l}</span></label>`;
    $('#coTop').innerHTML=`<div class="tgls">${ck('auto',true,'Cetak tiket otomatis')}${ck('sound',true,'Bunyi saat pesanan masuk')}${ck('vib',true,'Getar saat pesanan masuk')}${ck('notif',true,'Notifikasi sistem',"coSetNotif(this.checked)")}${ck('awake',true,'Layar tetap menyala',"coSetAwake(this.checked)")}</div>
    <div class="cob"><button class="btn sec" onclick="coBeep()"><i class="ic" data-ic="bell"></i>Tes bunyi</button><button class="btn sec" onclick="coTestPrint()"><i class="ic" data-ic="print"></i>Tes tiket</button><button class="btn sec" onclick="prnConnect().then(()=>renderCo(false))"><i class="ic" data-ic="plug"></i>Sambungkan printer</button></div>`;
  }
  const gear=$('#coGear');if(gear)gear.hidden=!can('set');
  {const o=$('#coOn');if(o&&document.activeElement!==o)o.checked=!!st.on}
  const un=CO.list.filter(o=>(o.status==='new'||o.status==='accepted')&&o.printed===0).length,msgs=[];
  msgs.push(CO.err?['neg','<i class="ic" data-ic="alert"></i>Server tidak terhubung']:['','<i class="ic" data-ic="dot"></i>Terhubung']);
  if(coPref('notif',true)&&'Notification' in window){
    if(Notification.permission==='default')msgs.push(['neg','<i class="ic" data-ic="bell"></i>Notifikasi belum aktif <button class="tag" type="button" onclick="coSetNotif(true)">Aktifkan</button>']);
    else if(Notification.permission==='denied')msgs.push(['neg','<i class="ic" data-ic="bell"></i>Notifikasi diblokir di browser']);
  }
  if(!CO.aud||CO.aud.state!=='running')msgs.push(['neg','<i class="ic" data-ic="mute"></i>Ketuk layar untuk aktifkan bunyi']);
  if(coAuto()&&!coReady())msgs.push(['neg','<i class="ic" data-ic="print"></i>Printer belum terhubung']);
  if(un&&coAuto())msgs.push(['neg','<i class="ic" data-ic="clock"></i>'+un+' tiket belum tercetak']);
  $('#coStat').innerHTML=msgs.map(m=>`<div class="chg ${m[0]}" style="margin:0 0 8px"><span>${m[1]}</span></div>`).join('');
  const L=CO.list,act=L.filter(o=>o.status==='new'||o.status==='accepted').sort((a,b)=>a.id-b.id),
    fin=L.filter(o=>o.status==='done'||o.status==='cancelled').sort((a,b)=>b.id-a.id).slice(0,40);
  const card=o=>{
    const ps=o.printed===2?'<span class="pst ok"><i class="ic" data-ic="check"></i>tercetak</span>':o.printed===1?'<span class="pst w">mencetak…</span>':(o.status==='new'||o.status==='accepted')?'<span class="pst w">belum tercetak</span>':'';
    const btn=o.status==='new'?`<button class="btn" onclick="coAct(${o.id},'accept')"><i class="ic" data-ic="check"></i>Terima</button>${can('pos')?`<button class="btn sec" onclick="coPay(${o.id})"><i class="ic" data-ic="card"></i>Bayar</button>`:''}`:o.status==='accepted'&&can('pos')?`<button class="btn" onclick="coPay(${o.id})"><i class="ic" data-ic="card"></i>Bayar</button>`:'';
    const act=(o.status==='new'||o.status==='accepted')?`${btn}<button class="btn sec" onclick="coPrint(${o.id})"><i class="ic" data-ic="print"></i>Cetak</button><button class="btn sec" onclick="coCancel(${o.id})"><i class="ic" data-ic="x"></i>Batal</button>`:'';
    const pb=isOnl(o)?(o.pst===2?'<span class="pst ok"><i class="ic" data-ic="card"></i>QRIS · diterima</span>':o.pst===1?'<span class="pst w"><i class="ic" data-ic="card"></i>QRIS · '+(o.hp?'bukti masuk, perlu dicek':'pelanggan klaim sudah bayar')+'</span>':o.pst===3?'<span class="pst"><i class="ic" data-ic="card"></i>QRIS · bukti ditolak</span>':'<span class="pst w"><i class="ic" data-ic="card"></i>QRIS · belum dibayar</span>'):'';
    const pbtn=(isOnl(o)&&(o.status==='new'||o.status==='accepted'))?(o.pst===1&&o.hp?`<button class="btn" onclick="coProof(${o.id})"><i class="ic" data-ic="image"></i>Lihat bukti bayar</button>`:o.pst===2?`<button class="btn sec" onclick="coAct(${o.id},'unpaid')"><i class="ic" data-ic="undo"></i>Batalkan konfirmasi bayar</button>`:`<button class="btn" onclick="coConfirmPay(${o.id})"><i class="ic" data-ic="check"></i>Pembayaran diterima</button>`):'';
    const tag=o.status==='cancelled'?'<span class="pst">dibatalkan</span>':o.status==='done'?`<span class="pst ok">selesai${o.saleNo?' · '+esc(o.saleNo):''}</span>`:o.status==='accepted'?'<span class="pst ok">diterima</span>':'<span class="pst w">baru</span>';
    return`<div class="coc ${o.status}"><div class="coh"><span class="no">${esc(o.num)}</span><span class="cn">${esc(o.name)}</span><span class="ct">${o.tbl?'Meja '+esc(o.tbl)+' · ':''}${esc(o.type==='Dine In'?'Dine In':'Takeaway')}</span><time>${ago(o.t)}</time></div>
    <ul>${o.lines.map(l=>`<li><b>${l.qty}x</b><span>${esc(l.name)}</span></li>`).join('')}</ul>
    ${o.note?`<div class="nt"><i class="ic" data-ic="note"></i>${esc(o.note)}</div>`:''}
    <div class="cof"><span>${money(o.total)}</span><span style="display:flex;gap:6px;flex-wrap:wrap">${tag}${pb}${ps}</span></div>
    ${act?`<div class="cob">${pbtn}${act}</div>`:''}</div>`;
  };
  const finRow=o=>`<button class="li" onclick="coDet(${o.id})"><span class="l"><b>${esc(o.num)} · ${esc(o.name)}</b><small>${o.tbl?'Meja '+esc(o.tbl)+' · ':''}${o.type==='Dine In'?'Dine In':'Takeaway'} · ${ago(o.u||o.t)}</small></span><span class="r"><b>${money(o.total)}</b><small>${o.status==='cancelled'?'dibatalkan':'selesai'}${isOnl(o)?' · QRIS'+(o.pst===2?' <i class="ic solo" data-ic="check"></i>':''):''}</small></span><span class="ch">›</span></button>`;
  {const td=new Date().toDateString(),nNew=act.filter(o=>o.status==='new').length,nAcc=act.filter(o=>o.status==='accepted').length,nDone=L.filter(o=>o.status==='done'&&new Date(o.u||o.t).toDateString()===td).length,vAct=act.reduce((a,o)=>a+(+o.total||0),0);
   const kc=(t,v,ic,bg)=>`<div class="kc"><div class="kt"><span>${t}</span></div><div class="kv"><span class="ki" style="background:${bg}"><i class="ic" data-ic="${ic}"></i></span>${v}</div></div>`;
   $('#coKp').innerHTML=kc('Pesanan baru',nNew,'bell','#f7c244')+kc('Diproses',nAcc,'clock','#3b9d6e')+kc('Selesai hari ini',nDone,'check','#6b7280')+kc('Nilai pesanan aktif',money(vAct),'card','#EF4444');}
  $('#coList').innerHTML=`<div class="cow"><div class="cow-a">`+(act.length?`<div class="sech"><h3>Aktif (${act.length})</h3></div><div class="cog">${act.map(card).join('')}</div>`:'<div class="empty" style="padding:30px 10px">Belum ada pesanan aktif.<br><small>Pesanan dari QR akan muncul di sini.</small></div>')+`</div>`
    +(fin.length?`<div class="cow-f"><div class="sech sech2"><h3>Selesai / batal (${fin.length})</h3></div><div class="panel"><div class="lst">${fin.map(finRow).join('')}</div></div></div>`:'')+`</div>`;
}
function coDet(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  const tm=t=>new Date(t).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  openModal(`<h3>${esc(o.num)} · ${esc(o.name)}</h3>
  <table class="dl"><tr><td>Status</td><td>${o.status==='cancelled'?'Dibatalkan':o.status==='done'?'Selesai':o.status==='accepted'?'Diterima':'Baru'}</td></tr>
  <tr><td>Dilayani oleh</td><td>${o.by?esc(o.by):'Pelanggan (pesan sendiri)'}</td></tr>
  <tr><td>Masuk</td><td>${tm(o.t)}</td></tr>${o.u&&o.u!==o.t?`<tr><td>Terakhir diubah</td><td>${tm(o.u)}</td></tr>`:''}
  <tr><td>Tipe</td><td>${o.tbl?'Meja '+esc(o.tbl)+' · ':''}${o.type==='Dine In'?'Dine In':'Takeaway'}</td></tr>
  ${o.saleNo?`<tr><td>Invoice</td><td>${esc(o.saleNo)}</td></tr>`:''}
  <tr><td>Pembayaran</td><td>${isOnl(o)?'QRIS · '+(o.pst===2?'diterima':o.pst===1?(o.hp?'bukti masuk, menunggu persetujuan':'pelanggan klaim sudah bayar'):o.pst===3?'bukti ditolak':'belum dibayar'):'Bayar di kasir'}</td></tr>
  <tr><td>Tiket</td><td>${o.printed===2?'tercetak':'belum tercetak'}</td></tr></table>
  <table class="dl">${o.lines.map(l=>`<tr><td>${l.qty}× ${esc(l.name)}<br><small>${money(l.price)}</small></td><td>${money(l.price*l.qty)}</td></tr>`).join('')}
  <tr><td>Subtotal</td><td>${money(o.sub)}</td></tr>${o.tax?`<tr><td>Pajak</td><td>${money(o.tax)}</td></tr>`:''}<tr class="tt"><td>Total</td><td>${money(o.total)}</td></tr></table>
  ${o.note?`<div class="nt"><i class="ic" data-ic="note"></i>${esc(o.note)}</div>`:''}
  ${o.saleNo&&db.orders.some(x=>x.no===o.saleNo)?`<button class="btn" onclick="histOpen('${esc(o.saleNo)}')">Lihat transaksi ${esc(o.saleNo)}</button>`:''}
  ${o.hp?`<button class="btn" onclick="coProof(${o.id})"><i class="ic" data-ic="image"></i>Lihat bukti bayar</button>`:''}
  <button class="btn sec" onclick="coPrint(${o.id});closeModal()"><i class="ic" data-ic="print"></i>Cetak ulang tiket</button>
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function setPay(k,v){db.set.pay[k]=v;save();renderPay()}
/* simpan kode QRIS statis toko (teks). Diperiksa dulu: format, CRC, dan harus QRIS Indonesia. */
function payQrisSave(txt){
  txt=String(txt||'').replace(/[\r\n\t]+/g,'').trim();
  if(!txt){db.set.pay.qris='';db.set.pay.on=false;save();renderPay();return}
  const c=QRIS.check(txt);
  if(!c.ok){toast(c.err);renderPay();return}
  if(c.dynamic||c.hasAmount){toast('Ini QRIS dinamis (sudah ada nominal). Pakai QRIS statis dari aplikasi merchant Anda.');renderPay();return}
  db.set.pay.qris=txt;if(!db.set.pay.name)db.set.pay.name=c.name||db.set.store||'';
  save();renderPay();toast('QRIS tersimpan: '+(c.name||'merchant'))
}
async function payQrisImg(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  try{
    const t=await QRIS.decodeImage(f);
    if(!t){toast('QR tidak terbaca dari foto itu. Coba foto yang lebih jelas, atau tempel kodenya.');return}
    payQrisSave(t);
  }catch(e){toast(e&&e.message==='nosupport'?'Browser ini belum bisa membaca QR dari foto. Tempel kode QRIS-nya (lihat petunjuk).':'Foto tidak bisa dibaca')}
}
/* uji coba: tampilkan QRIS dinamis Rp 1.000 supaya owner bisa memindainya dengan aplikasi bank sendiri */
function payQrisTest(){
  const y=db.set.pay;let q='';
  try{q=QRIS.dynamic(y.qris,1000)}catch(e){toast(e.message);return}
  openModal(`<h3>Uji QRIS dinamis</h3><p class="mu" style="margin:0 0 8px">Pindai dengan aplikasi e-wallet/m-banking. Nominal harus muncul otomatis <b>${money(1000)}</b>. Kalau tidak muncul, QRIS statis Anda tidak mendukung nominal dinamis; hubungi penyedia QRIS Anda.</p><div style="text-align:center;background:#fff;padding:10px;border-radius:12px">${qrSvg(q,260)}</div><button class="btn sec" style="margin-top:12px" onclick="closeModal()">Tutup</button>`);
}
function renderPay(){
  const p=$('#payForm');if(!p)return;
  if(!(CL.on&&can('co')&&can('set'))){p.hidden=true;applySetTab();return}
  p.hidden=false;const y=db.set.pay,c=y.qris?QRIS.check(y.qris):null,ok=!!(c&&c.ok);
  p.innerHTML=`<h3>Pembayaran Online (QRIS dinamis)</h3>
    <label class="tgl"><input type="checkbox" ${y.on&&ok?'checked':''} ${ok?'':'disabled'} onchange="setPay('on',this.checked)"><span>Tawarkan bayar online saat pelanggan memesan lewat QR</span></label>
    <p class="mu" style="margin:6px 0 10px">Aplikasi mengubah QRIS statis toko Anda menjadi <b>QRIS dinamis</b>: nominal pesanan terisi otomatis di aplikasi bank pelanggan. Pembayaran tetap Anda konfirmasi lewat bukti bayar atau mutasi.</p>
    <label class="fl">Kode QRIS statis toko</label>
    <textarea class="fi" rows="3" maxlength="520" spellcheck="false" placeholder="Tempel kode QRIS yang diawali 000201…" onchange="payQrisSave(this.value)">${esc(y.qris||'')}</textarea>
    ${y.qris?(ok?`<div class="chg" style="margin:8px 0"><span><i class="ic" data-ic="check"></i>QRIS valid · ${esc(c.name||'merchant')}</span></div>`:`<div class="chg neg" style="margin:8px 0"><span>${esc((c&&c.err)||'Kode tidak valid')}</span></div>`):''}
    <div class="cob"><button class="btn sm sec" onclick="$('#pqF').click()"><i class="ic" data-ic="image"></i>Baca dari foto QRIS</button>
    ${ok?`<button class="btn sm" onclick="payQrisTest()"><i class="ic" data-ic="qr"></i>Uji QR dinamis</button><button class="mini" style="color:var(--bt)" onclick="if(confirm('Hapus QRIS toko?'))payQrisSave('')">Hapus</button>`:''}
    <input type="file" id="pqF" accept="image/*" hidden onchange="payQrisImg(this)"></div>
    <details style="margin:8px 0"><summary>Cara mendapatkan kode QRIS</summary><p class="mu" style="margin:6px 0">Pindai stiker QRIS toko Anda dengan aplikasi pemindai QR apa pun (atau tombol baca foto di atas pada Chrome Android), lalu salin teks hasilnya. Teks itu panjang dan diawali <code>000201</code>. Gunakan QRIS <b>statis</b> milik toko Anda sendiri; QRIS dari pelanggan atau yang sudah ada nominalnya akan ditolak.</p></details>
    <label class="fl">Nama penerima (tampil ke pelanggan)</label>
    <input class="fi" value="${esc(y.name||'')}" maxlength="60" placeholder="mis. Ordela" onchange="setPay('name',this.value.trim())">
    <label class="fl">Petunjuk tambahan (opsional)</label>
    <textarea class="fi" rows="2" maxlength="300" placeholder="mis. Tulis nomor pesanan di kolom catatan" onchange="setPay('note',this.value.trim())">${esc(y.note||'')}</textarea>
`;
}
function renderCoSet(){
  const p=$('#coForm');if(!p)return;
  if(!(CL.on&&can('co')&&can('set'))){p.hidden=true;applySetTab();return}
  p.hidden=false;const st=CO.set||{on:true,msg:''};
  p.innerHTML=`<h3>Pesan lewat QR</h3>
    <label class="tgl"><input type="checkbox" id="coOn" ${st.on?'checked':''} onchange="coSetOpen(this.checked)"><span>Terima pesanan dari pelanggan</span></label>
    <label class="fl">Pesan saat ditutup (tampil ke pelanggan)</label>
    <input class="fi" id="coMsg" value="${esc(st.msg||'')}" maxlength="200" placeholder="mis. Dapur tutup, silakan pesan ke kasir" onchange="coSetOpen($('#coOn').checked)">
    <div class="cob"><button class="btn" onclick="coQr()"><i class="ic" data-ic="qr"></i>Tampilkan / Cetak QR</button><button class="btn sec" onclick="coCopy()"><i class="ic" data-ic="copy"></i>Salin tautan</button></div>
${ntForm()}`;
}
function coStart(){
  if(!CL.on)return;
  CO.title=document.title;
  try{CO.pend=JSON.parse(localStorage.getItem('pos_co_pend')||'[]')}catch(e){CO.pend=[]}
  coBadge();coLoop();coWake();coPushSync();
  setInterval(()=>{
    if(!CL.tok||!can('co'))return;
    if(S.view==='co')renderCo(false);
    coAutoPrint();coFlush();
    if(CO.ring<3&&S.view!=='co'&&coNew().length){CO.ring++;coBeep()}
  },10000);
}

/* ---------- akun, peran, izin ---------- */
const ORDELA_ACCESS_CONFIG=window.ORDELA_ACCESS_CONFIG;
const PERM_LBL=ORDELA_ACCESS_CONFIG.permissionLabels;
const PERM_DESC=ORDELA_ACCESS_CONFIG.permissionDescriptions;
const PERM_SHORT=ORDELA_ACCESS_CONFIG.permissionShortLabels;
const VIEW_PERM=ORDELA_ACCESS_CONFIG.viewPermissions;
/* Staging app split: keep the production host unchanged until the independent builds pass acceptance. */
const ORDELA_APP_MODE=window.ORDELA_APP_CONFIG.mode;
const ORDELA_POS_ONLY=new Set(window.ORDELA_APP_CONFIG.posOnly);
const ORDELA_BUSINESS_ONLY=new Set(window.ORDELA_APP_CONFIG.businessOnly);
CL.me=null;try{if(window.POS_SSO_API)localStorage.removeItem('pos_me');else CL.me=JSON.parse(localStorage.getItem('pos_me')||'null')}catch(e){}
function setMe(m){CL.me=m||null;try{if(m)localStorage.setItem('pos_me',JSON.stringify(m));else localStorage.removeItem('pos_me')}catch(e){}}
/* tanpa server (mode offline/standalone) tidak ada akun: semua terbuka */
function isOwner(){return !CL.on||(!!CL.me&&CL.me.role==='owner')}
function can(p){return !CL.on||(!!CL.me&&(CL.me.role==='owner'||(CL.me.perms||[]).includes(p)))}
/* karyawan yang HANYA punya izin Absensi: tidak boleh memakai Kasir, Meja, Beranda, atau Notifikasi (tidak ada transaksi) */
function attOnly(){const m=CL.on&&CL.me;if(!m||m.role==='owner')return false;const p=m.perms||[];return p.length>0&&p.every(x=>x==='att')}
function landing(){if(CL.on&&CL.me){if(ORDELA_APP_MODE==='business'&&canView('home'))return 'home';return 'menu'}const order=ORDELA_APP_MODE==='business'?['home','co','inv','att','set','prn','pos']:['pos','co','att','set','prn','home','inv'];return order.find(v=>canView(v))||'acc'}
function canView(v){
  if(ORDELA_APP_MODE==='pos'&&ORDELA_BUSINESS_ONLY.has(v))return false;
  if(ORDELA_APP_MODE==='business'&&ORDELA_POS_ONLY.has(v))return false;
  if(v==='table'&&can('co'))return true;   // server/pelayan melihat status meja dari antrean pesanan
  if(v==='home'&&can('hist'))return true;   // Rekap & Riwayat tampil di Beranda
  if(v==='riw')return can('pos')||can('hist')||can('co');
  if(v==='acc')return true;
  if(v==='att')return CL.on&&can('att');
  if(v==='branch')return CL.on&&isOwner();
  if(v==='menu')return true;
  if(v==='pyr')return CL.on&&isOwner();
  if(v==='set'&&can('prn'))return true;   // pemakai berizin Printer saja tetap bisa membuka Pengaturan > Printer
  const p=VIEW_PERM[v];if(p===undefined||p===null)return true;
  if(v==='co'||v==='usr')return CL.on&&(p==='#owner'?isOwner():can(p));
  return p==='#owner'?isOwner():can(p);
}
function navGroups(){
  document.querySelectorAll('.drawer .dg').forEach(g=>{
    let n=g.nextElementSibling,any=false;
    while(n&&!n.classList.contains('dg')){if(n.matches('button[data-v]')&&!n.hidden)any=true;n=n.nextElementSibling}
    g.hidden=!any;
  });
}
function openDash(){closeAll();location.href='dashboard.html'}
function applyAccess(){
  document.querySelectorAll('.drawer button[data-v],.bnav button[data-v],.rail button[data-v]').forEach(b=>{
    const ok=b.dataset.v==='acc'||canView(b.dataset.v);
    if(b.closest('.bnav'))b.style.display=ok?'':'none';else b.hidden=!ok;
  });
  {const bn=$('#bnav');if(bn){const n=[...bn.querySelectorAll('button[data-v]')].filter(b=>b.style.display!=='none').length;bn.style.gridTemplateColumns='repeat('+Math.max(1,n)+',1fr)';
    if(typeof navDot==='function')setTimeout(()=>{const o=bn.querySelector('button.on');navDot(o?o.dataset.v:null,true)},0)}}
  const dn=$('#dashNav');if(dn)dn.hidden=!isOwner();   // Dashboard ada di halaman sendiri (dashboard.html), hanya untuk owner
  if(typeof coBadge==='function')coBadge();
  navGroups();
  renderAcct();
  document.body.classList.toggle('attonly',attOnly());
  if(S.view&&!canView(S.view))go(landing());
}
function renderAcct(){
  const ba=$('#bnAcc'),lo=$('#lgout'),an=$('#accNav'),on=!!(CL.on&&CL.me);
  if(ba)ba.innerHTML=on?avHtml(CL.me,'nv'):'<i class="ic" data-ic="sliders"></i>';
  const rA=$('#rlAcc');if(rA)rA.innerHTML=on?avHtml(CL.me,'nv'):RAIL_USER;
  if(an){an.hidden=!on;if(on)an.innerHTML=avHtml(CL.me,'dv')+'<span class="anm">Akun</span>'}
  if(lo)lo.hidden=!on;
  if(typeof renderSec==='function')renderSec();
  if(ACCV.includes(S.view)&&!on)go('set');
}

/* ----- halaman login ----- */
function togglePw(){const i=$('#loginPw'),b=$('#loginEye');const s=i.type==='password';i.type=s?'text':'password';b.textContent=s?'Sembunyikan':'Tampilkan'}
function showLogin(msg){
  const w=$('#login');if(!w)return;
  closeModal&&closeModal();
  $('#loginLogo').src=db.set.logo||DEF_LOGO;$('#loginName').textContent=db.set.store||'Ordela';
  $('#loginErr').textContent=msg||'';$('#loginPw').value='';$('#loginPw').type='password';$('#loginEye').textContent='Tampilkan';
  let u='';try{u=localStorage.getItem('pos_user')||''}catch(e){}
  $('#loginUser').value=u;w.hidden=false;
  setTimeout(()=>{const i=u?$('#loginPw'):$('#loginUser');if(i)i.focus()},60);
}
/* Data lokal (menu, pesanan, pengaturan, cadangan) milik satu toko. Bila yang login berasal dari toko lain, data toko sebelumnya dibuang
   sebelum sinkron pertama, supaya tidak tertulis ke toko ini. Login ulang ke toko yang sama tidak menghapus apa pun. */
async function localOwnerGuard(m){
  const code=m&&m.store&&m.store.code;if(!code)return false;
  let prev=null;try{prev=localStorage.getItem('pos_dbstore')}catch(e){}
  if(prev===code)return false;
  try{localStorage.setItem('pos_dbstore',code)}catch(e){}
  if(prev===null&&CL.dirty)return false;     // perangkat lama tanpa penanda dan ada perubahan belum tersinkron: dipakai apa adanya agar tidak hilang
  try{localStorage.removeItem(KEY)}catch(e){}
  db=fixDb(seed());S.cart={};S.sel.clear();CL.ver=0;CL.dirty=false;persistMeta();
  try{await idbReq('readwrite',s=>s.clear());await idbSet('main',dbJson())}catch(e){}   // salinan, dasar penggabungan, dan snapshot toko sebelumnya
  applyBrand();return true;
}
async function doLogin(){
  const un=$('#loginUser').value.trim().toLowerCase(),pw=$('#loginPw').value,err=$('#loginErr'),btn=$('#loginBtn');
  if(!un||!pw){err.textContent='Isi username dan kata sandi';return}
  err.textContent='';btn.disabled=true;btn.textContent='Memeriksa…';
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,password:pw})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){err.textContent='Username/email atau kata sandi salah';return}
    if(r.status===403){err.textContent=j.error||'Akun tidak aktif';return}
    if(r.status===429){err.textContent='Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';return}
    if(!r.ok)throw 0;
    CL.tok=window.POS_SSO_API?'sso-cookie':j.token;setMe(j.me);await localOwnerGuard(j.me);
    try{if(!window.POS_SSO_API)localStorage.setItem('pos_tok',CL.tok);else localStorage.removeItem('pos_tok');localStorage.setItem('pos_user',un)}catch(e){}
    $('#loginPw').value='';$('#login').hidden=true;ssStamp();ssWarnHide();
    applyAccess();if(!canView(S.view)||S.view==='acc')go(landing());else render();
    syncNow();
  }catch(e){err.textContent='Tidak bisa terhubung ke server'}
  finally{btn.disabled=false;btn.textContent='Masuk'}
}
function doLogout(){logoutAsk()}
/* keluar: sesi di server ikut dimatikan, jadi token yang tersisa di perangkat tidak bisa dipakai lagi */
function serverLogout(){
  const t=CL.tok;if(!t)return;
  try{fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:'{}',keepalive:true}).catch(()=>{})}catch(e){}
}
async function coPushOff(tok){
  try{const reg=await navigator.serviceWorker.getRegistration(),sub=reg&&await reg.pushManager.getSubscription();if(!sub)return;
    try{await fetch('/api/push/sub',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({endpoint:sub.endpoint})})}catch(e){}
    await sub.unsubscribe()}catch(e){}
}
function cloudLogout(msg){
  try{if(window.nativePush&&CL.tok)nativePush.off((p,o)=>fetch(p,{...o,headers:{'Content-Type':'application/json',Authorization:'Bearer '+CL.tok}}))}catch(e){}
  try{if(CL.tok&&'PushManager' in window)coPushOff(CL.tok)}catch(e){}
  serverLogout();ssWarnHide();
  CL.tok='';setMe(null);try{localStorage.removeItem('pos_tok');localStorage.removeItem('pos_act')}catch(e){};ssCookieClear();
  CO.list=[];CO.rev=0;CO.seen.clear();
  setSt('auth');closeAll();closeModal();applyAccess();go('pos');showLogin(typeof msg==='string'?msg:'');
}

/* ----- sesi login: keluar otomatis bila tidak dipakai (pengaturan owner, berlaku di semua perangkat) ----- */
const SS={last:Date.now(),warn:false,on:false};
function idleMin(){const v=db&&db.set?db.set.idle:null;return v==null?30:Math.max(0,+v||0)}   // menit; 0 = tidak pernah
function fmtIdle(m){return m<60||m%60?m+' menit':(m/60)+' jam'}
function ssCookieGet(){try{const x=document.cookie.split(';').map(v=>v.trim()).find(v=>v.indexOf('ordela_pos_act=')===0);return x?Number(x.slice(15))||0:0}catch(e){return 0}}
function ssCookieSet(v){try{const shared=location.hostname==='ordela.my.id'||location.hostname.endsWith('.ordela.my.id');document.cookie='ordela_pos_act='+String(v)+'; Path=/; Max-Age=86400; SameSite=Lax; Secure'+(shared?'; Domain=.ordela.my.id':'')}catch(e){}}
function ssCookieClear(){try{const shared=location.hostname==='ordela.my.id'||location.hostname.endsWith('.ordela.my.id');document.cookie='ordela_pos_act=; Path=/; Max-Age=0; SameSite=Lax; Secure'+(shared?'; Domain=.ordela.my.id':'')}catch(e){}}
function ssStamp(){SS.last=Date.now();try{localStorage.setItem('pos_act',String(SS.last))}catch(e){}ssCookieSet(SS.last)}
function ssWarnHide(){if(!SS.warn)return;SS.warn=false;const w=$('#sesw');if(w)w.hidden=true}
function ssWarnShow(sec){SS.warn=true;const w=$('#sesw');if(w)w.hidden=false;const t=$('#seswT');if(t)t.textContent=sec}
function ssExempt(){return S.view==='co'&&can('co')&&coAuto()}   // layar dapur yang menerima & mencetak pesanan tidak ikut keluar
function ssCheck(){
  if(!CL.on||!CL.tok){ssWarnHide();return}
  const m=idleMin();if(!m){ssWarnHide();return}
  try{const a=Math.max(+localStorage.getItem('pos_act')||0,ssCookieGet());if(a>SS.last)SS.last=a}catch(e){}
  if(ssExempt()){if(Date.now()-SS.last>20000)ssStamp();ssWarnHide();return}
  const left=m*60000-(Date.now()-SS.last);
  if(left<=0){cloudLogout('Anda keluar otomatis karena tidak ada aktivitas selama '+fmtIdle(m)+'. Masuk lagi untuk melanjutkan.');return}
  if(left<=Math.min(60000,m*30000))ssWarnShow(Math.ceil(left/1000));else ssWarnHide();
}
function ssAct(){
  if(!CL.tok)return;
  if(Date.now()-SS.last<3000&&!SS.warn)return;
  ssStamp();ssWarnHide();
}
function ssStart(){
  if(SS.on)return;SS.on=true;
  let a=0;try{a=Math.max(+localStorage.getItem('pos_act')||0,ssCookieGet())}catch(e){}
  SS.last=a||Date.now();if(!a&&CL.tok)ssStamp();
  ['pointerdown','keydown','touchstart','wheel','scroll'].forEach(e=>document.addEventListener(e,ssAct,{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ssCheck()});
  window.addEventListener('pageshow',ssCheck);
  setInterval(ssCheck,1000);
  ssCheck();
}
function renderSec(){
  const p=$('#secForm');if(!p)return;
  if(!(CL.on&&isOwner())){p.hidden=true;applySetTab();return}
  p.hidden=false;const m=idleMin();
  const opts=[[5,'5 menit'],[15,'15 menit'],[30,'30 menit'],[60,'1 jam'],[120,'2 jam'],[240,'4 jam'],[480,'8 jam'],[0,'Tidak pernah']];
  p.innerHTML=`<h3>Keamanan Sesi</h3>
  <label class="fl">Keluar otomatis bila tidak dipakai</label>
  <select class="fi" id="secIdle" onchange="secSet(this.value)">${opts.map(o=>`<option value="${o[0]}"${o[0]===m?' selected':''}>${o[1]}</option>`).join('')}</select>
`;
}
function secSet(v){db.set.idle=Math.max(0,+v||0);save();ssStamp();toast('Pengaturan keamanan disimpan')}

/* ----- akun saya ----- */
function avHtml(m,cls){const ph=m&&m.photo;return `<span class="av ${cls||''}">${ph?`<img src="${esc(ph)}" alt="">`:esc(((m&&m.name)||'?').trim().charAt(0).toUpperCase())}</span>`}
let ACC={photo:null};
function accTap(){go(CL.on&&CL.me?'acc':'set')}
function openAcct(){go('acc')}
function accRow(l,v,id){return `<label class="fl">${l}</label><p class="accv"${id?` id="${id}"`:''}>${v}</p>`}
function accDate(iso,withTime){
  if(!iso)return '';const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso)?iso+'T00:00:00':iso);if(Number.isNaN(d.getTime()))return '';
  const o={day:'2-digit',month:'long',year:'numeric'};if(withTime){o.hour='2-digit';o.minute='2-digit'}
  return d.toLocaleDateString('id-ID',o)
}
/* nama & telepon toko: salinan sinkron di pengaturan toko (db.set), nama cadangan dari data akun */
function accStore(m){
  const n=String(db&&db.set&&db.set.store||'').trim(),sn=String(m&&m.store&&m.store.name||'').trim();
  return{name:n||sn,phone:String(db&&db.set&&db.set.phone||'').trim(),code:String(m&&m.store&&m.store.code||'')};
}
const APP_VER='1.0.0';
/* ikon garis 24px untuk halaman profil */
const PFI={
 receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
 print:'<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
 at:'<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
 tick:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 warn:'<path d="M12 7v6"/><path d="M12 17h.01"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 pencil:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 chev:'<path d="M9 6l6 6-6 6"/>',
 back:'<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.3 7.7A17 17 0 0 0 2 12s4 7 10 7a9.8 9.8 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
 trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
 store:'<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9"/><path d="M5 12v8h14v-8"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 pin:'<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 id:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.8-2.3 3-2.3s2.4.7 3 2.3M15 10h3M15 13h3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 cloud:'<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.8 3.8 0 0 1 17.5 18z"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-1.9-.4-2.5-1.2M12 6.5V8m0 8v1.5"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6"/>',
 warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'
};
const pfi=(n,z)=>`<svg class="pfi" width="${z||22}" height="${z||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PFI[n]||''}</svg>`;
const pfSub=(t,to)=>`<div class="subh"><button class="bk" type="button" onclick="${to}" aria-label="Kembali">${pfi('back',22)}</button><h2>${t}</h2></div>`;
const NONE='<span class="mu">Belum diisi</span>';
function accVerState(m){
  if(m.active===false)return{k:'bad',t:'Dinonaktifkan'};
  if(!m.hasAuth)return m.email?{k:'warn',t:'Email belum terhubung'}:{k:'ok',t:'Aktif'};
  return m.emailVerified?{k:'ok',t:'Terverifikasi'}:{k:'warn',t:'Belum diverifikasi'};
}
/* ----- halaman Profil ----- */
function renderAccPage(){
  const m=CL.me,box=$('#accPage');if(!m||!box)return;ACC.photo=m.photo||'';
  const vs=accVerState(m);
  box.innerHTML=`<div class="pfw">
    <div class="pfhero"><button class="pfav" type="button" onclick="accSheet('view')" aria-label="Ubah foto profil"><span id="accAvV"></span><i class="cam">${pfi('camera',16)}</i></button>
      <b class="pfn">${esc(m.name||'Pengguna')}</b><small class="pfr">${esc(usrRoleLabel(m.role))}</small></div>
    <div class="pfcard">
      <div class="pfrow">${pfi('mail',20)}<div class="tx"><small>Email</small><b>${m.email?esc(m.email):NONE}</b></div></div>
      <div class="pfrow">${pfi('phone',20)}<div class="tx"><small>Nomor Telepon</small><b>${m.phone?esc(m.phone):NONE}</b></div></div>
      <div class="pfrow">${pfi('check',20)}<div class="tx"><small>Status Akun</small><b class="${vs.k}">${esc(vs.t)}</b></div></div>
    </div>
    <button class="pfbtn" type="button" onclick="go('editacc')">${pfi('pencil',18)}Edit Profil</button>
    <button class="pfbtn out" type="button" onclick="go('accset')">${pfi('user',20)}Pengaturan Akun<span class="chev">${pfi('chev',18)}</span></button>
  </div>`;
  accAvDraw();
}
/* ----- Pengaturan Akun ----- */
function accSetItems(){
  const m=CL.me,vs=accVerState(m);
  const sub=!m.hasAuth?(m.email?'Email belum terhubung ke akun':'Tambahkan email akun Anda'):m.pendingEmail?'Menunggu verifikasi email baru':m.emailVerified?'Email Anda sudah terverifikasi':'Email belum diverifikasi';
  const ok=vs.k==='ok'&&m.hasAuth&&!m.pendingEmail;
  return[
   {g:'Akun',ic:'user',t:'Informasi Profil',d:'Lihat data diri, kontak, dan informasi toko.',to:"go('accinfo')",kw:'nama username telepon alamat tanggal lahir toko'},
   {g:'Akun',ic:'shield',t:'Keamanan Akun',d:'Ubah kata sandi untuk menjaga akun tetap aman.',to:"go('pw')",kw:'password sandi kunci',key:1},
   {g:'Akun',ic:'mail',t:'Verifikasi Email',d:sub,to:"go('accver')",kw:'email surel verifikasi',key:1,ok},
   {g:'Aplikasi',ic:'bell',t:'Notifikasi',d:'Atur notifikasi, bunyi, dan getar pesanan masuk.',to:"go('accnt')",kw:'suara bunyi getar pesanan'},
   {g:'Aplikasi',ic:'info',t:'Tentang Ordela',d:'Versi aplikasi '+APP_VER+' dan muat ulang versi terbaru.',to:"go('accabout')",kw:'versi update perbarui'},
   {g:'Sesi & Privasi',ic:'logout',t:'Keluar',d:'Akhiri sesi di perangkat ini.',to:'logoutAsk()',kw:'logout sign out',bad:1},
   {g:'Sesi & Privasi',ic:'trash',t:'Hapus Akun',d:'Hapus akun Anda secara permanen.',to:"go('accdel')",kw:'delete hapus akun privasi',bad:1}
  ];
}
function accSetList(){
  const box=$('#accSetList');if(!box||!CL.me)return;
  const q=(($('#accSetQ')||{}).value||'').trim().toLowerCase();
  const its=accSetItems().filter(i=>!q||(i.t+' '+i.d+' '+i.kw+' '+i.g).toLowerCase().includes(q));
  if(!its.length){box.innerHTML=`<p class="pfhint" style="text-align:center;padding:28px 0">Tidak ada pengaturan yang cocok dengan “${esc(q)}”.</p>`;return}
  let h='',g='';
  its.forEach(i=>{
    if(i.g!==g){if(g)h+='</div>';g=i.g;h+=`<div class="pfgl">${esc(g)}</div><div class="pfgrp">`}
    h+=`<button type="button" class="${i.key?'key':''}${i.bad?' bad':''}" onclick="${i.to}"><span class="ib2">${pfi(i.ic,i.key?24:20)}</span><span class="tx"><b>${i.t}</b><small>${esc(i.d)}</small></span>${i.ok?`<span class="okc">${pfi('check',22)}</span>`:''}${i.bad&&i.ic==='logout'?'':`<span class="chev">${pfi('chev',18)}</span>`}</button>`;
  });
  box.innerHTML=h+'</div>';
}
function renderAccSet(){
  const m=CL.me,box=$('#accSetPage');if(!m||!box)return;
  if(box.dataset.built==='1'&&box.querySelector('#accSetQ')){accSetList();return}   /* jangan hapus kata pencarian yang sedang diketik */
  box.dataset.built='1';
  box.innerHTML=`${pfSub('Pengaturan Akun',"go('acc')")}<div class="pfw">
    <div class="pfin pfsrch">${pfi('search',18)}<input class="fi" id="accSetQ" type="search" placeholder="Cari pengaturan" autocomplete="off" oninput="accSetList()" aria-label="Cari pengaturan"></div>
    <div id="accSetList"></div></div>`;
  accSetList();
}
/* ----- Informasi Profil (semua data, hanya baca) ----- */
function renderAccInfo(){
  const m=CL.me,box=$('#accInfoPage');if(!m||!box)return;
  const role=usrRoleLabel(m.role),st=accStore(m),own=m.role==='owner',vs=accVerState(m);
  const mu=t=>`<span class="mu">${t}</span>`;
  const row=(ic,l,v)=>`<div class="pfrow">${pfi(ic,20)}<div class="tx"><small>${l}</small><b>${v}</b></div></div>`;
  box.innerHTML=`${pfSub('Informasi Profil',"go('accset')")}<div class="pfw">
    <div class="pfcard">
      ${row('user','Nama lengkap',esc(m.name||'—'))}${row('at','Username','@'+esc(m.username||'—'))}
      ${row('mail','Alamat email',m.email?esc(m.email):NONE)}${row('phone','Nomor telepon',m.phone?esc(m.phone):NONE)}
      ${row('cal','Tanggal lahir',accDate(m.birth)?esc(accDate(m.birth)):NONE)}${row('pin','Alamat',m.address?esc(m.address):NONE)}
    </div>
    <div class="pfcard" style="margin-top:14px">
      ${row('shield','Peran / jabatan',esc(role))}
      ${row('store','Nama toko',st.name?esc(st.name):mu('Belum diatur'))}
      ${row('phone','Nomor telepon toko',st.phone?esc(st.phone):NONE)}
      ${own&&st.code?row('id','Kode toko',`<code>${esc(st.code)}</code>`):''}
      ${row('cal','Tanggal bergabung',accDate(m.createdAt)?esc(accDate(m.createdAt)):mu('Belum tersedia'))}
      ${row('clock','Login terakhir',accDate(m.lastLogin,1)?esc(accDate(m.lastLogin,1)):mu('Belum tersedia'))}
      ${row('check','Status akun',`<span class="${vs.k}">${esc(m.active===false?'Dinonaktifkan':'Aktif')}</span>`)}
      ${row('cloud','Koneksi',(CL.on&&CL.tok)?(navigator.onLine===false?'Tidak ada internet':'Terhubung ke server'):'Mode offline')}
    </div>
    <button class="pfbtn" type="button" onclick="go('editacc')">${pfi('pencil',18)}Edit Profil</button></div>`;
}
/* ----- Edit Profil ----- */
function renderEditAccPage(force){
  const m=CL.me,box=$('#editAccPage');if(!m||!box)return;
  /* render() jalan tiap sinkron data; jangan hapus isian/foto yang sedang diubah */
  if(!force&&box.dataset.built==='1'&&box.querySelector('#accName'))return;
  ACC.photo=m.photo||'';box.dataset.built='1';
  const own=m.role==='owner',st=accStore(m),today=new Date().toISOString().slice(0,10);
  const sp=phSplit(st.phone);
  box.innerHTML=`${pfSub('Edit Profil','accCancel()')}<div class="accp pfwrap">
  <div class="pfhero"><button class="pfav" type="button" onclick="accSheet('edit')" aria-label="Ubah foto profil"><span id="accAv"></span><i class="cam">${pfi('camera',16)}</i></button>
    <button class="pfpill" type="button" onclick="accSheet('edit')">${pfi('camera',18)}Ubah Foto</button>
    <button class="lnk" type="button" id="accRm" onclick="accPhotoDel()">Hapus foto</button></div>
  <label class="fl" for="accName">Nama Lengkap</label><div class="pfin">${pfi('user',20)}<input class="fi" id="accName" maxlength="60" value="${esc(m.name)}" autocomplete="name" oninput="accAvDraw()"></div>
  <label class="fl" for="accUser">Username</label><div class="pfin">${pfi('at',20)}<input class="fi" id="accUser" maxlength="24" value="${esc(m.username)}" autocomplete="username" autocapitalize="none" spellcheck="false" ${own?'':'readonly'}></div>
  <p class="hint">${own?'Dipakai untuk masuk. Huruf kecil, angka, titik, strip, garis bawah (3-24 karakter).':'Username karyawan hanya bisa diubah oleh owner (dipakai untuk login dan jadwal shift).'}</p>
  <label class="fl" for="accEmail">Email</label><div class="pfin">${pfi('mail',20)}<input class="fi" id="accEmail" type="email" value="${esc(m.email||'')}" placeholder="Belum diisi" readonly></div>
  <div id="accVst" class="vst"></div>
  <label class="fl">Nomor Telepon</label><div class="phr"><select class="fi" id="accCc" aria-label="Kode negara">${phCcOpts(phSplit(m.phone).cc)}</select><input class="fi" id="accPhone" type="tel" inputmode="tel" maxlength="14" placeholder="812 3456 7890" value="${esc(phSplit(m.phone).num)}" autocomplete="tel-national"></div>
  <label class="fl" for="accBirth">Tanggal Lahir</label><input class="fi" id="accBirth" type="date" min="1900-01-01" max="${today}" value="${esc(m.birth||'')}">
  <label class="fl" for="accAddr">Alamat</label><textarea class="fi" id="accAddr" rows="2" maxlength="300" placeholder="Alamat tempat tinggal">${esc(m.address||'')}</textarea>
  ${own?`<h3 class="acch">Toko</h3>
  <label class="fl" for="accStore">Nama Toko</label><div class="pfin">${pfi('store',20)}<input class="fi" id="accStore" maxlength="60" value="${esc(st.name)}" placeholder="Nama toko Anda"></div>
  <label class="fl">Nomor Telepon Toko</label><div class="phr"><select class="fi" id="accSCc" aria-label="Kode negara toko">${phCcOpts(sp.cc)}</select><input class="fi" id="accSPhone" type="tel" inputmode="tel" maxlength="14" placeholder="812 3456 7890" value="${esc(sp.num)}"></div>`:''}
  <p class="hint" id="accErr" style="color:var(--bad);min-height:16px;margin:10px 0 0" role="alert"></p>
  <button class="pfbtn" id="accSave" type="button" onclick="accSave()" style="margin-top:8px">${pfi('pencil',18)}Simpan Perubahan</button></div>`;
  accAvDraw();
  try{window.renderAccVerif&&window.renderAccVerif()}catch(e){}
}
function accCancel(){const b=$('#editAccPage');if(b)b.dataset.built='';go('acc')}
/* ----- Ubah Kata Sandi ----- */
function renderPwPage(){
  const box=$('#pwPage');if(!box)return;
  if(box.dataset.built==='1'&&box.querySelector('#pwOld'))return;   /* jangan hapus yang sedang diketik */
  box.dataset.built='1';
  const f=(id,l,ph,ac)=>`<label class="fl" for="${id}">${l}</label><div class="pfin pe">${pfi('lock',20)}<input class="fi" id="${id}" type="password" placeholder="${ph}" autocomplete="${ac}" maxlength="72"><button class="eyeb" type="button" aria-label="Tampilkan atau sembunyikan kata sandi" onclick="accEye('${id}',this)">${pfi('eye',20)}</button></div>`;
  box.innerHTML=`${pfSub('Ubah Kata Sandi',"go('accset')")}<div class="accp pfwrap">
    ${f('pwOld','Kata Sandi Lama','Masukkan kata sandi lama','current-password')}
    ${f('pwNew','Kata Sandi Baru','Masukkan kata sandi baru','new-password')}<p class="pfhint">Minimal 6 karakter.</p>
    ${f('pwNew2','Konfirmasi Kata Sandi Baru','Ulangi kata sandi baru','new-password')}
    <p class="hint" id="pwErr" style="color:var(--bad);min-height:16px"></p>
    <button class="pfbtn" type="button" onclick="changePw()" style="margin-top:8px">${pfi('check',18)}Simpan</button></div>`;
}
function accEye(id,b){const i=$('#'+id);if(!i)return;const sh=i.type==='password';i.type=sh?'text':'password';b.innerHTML=pfi(sh?'eyeoff':'eye',20)}
/* ----- layar sukses ----- */
function accDone(title,desc){
  const b=$('#accOkPage');
  if(b)b.innerHTML=`<div class="pfdone"><div class="big">${pfi('tick',46).replace('stroke-width="1.9"','stroke-width="2.4"')}</div><h2>${esc(title)}</h2><p>${esc(desc)}</p><button class="pfbtn" type="button" onclick="go('acc')">Kembali ke Profil</button></div>`;
  go('accok');
}
/* ----- Verifikasi Email ----- */
function accVerRender(){
  const m=CL.me,box=$('#accVerPage');if(!m||!box)return;
  const left=(window.authCdLeft&&authCdLeft())||0,em=esc(m.email||''),pe=esc(m.pendingEmail||'');
  const ob=(fn,ic,lbl,dis)=>`<button class="pfbtn out" type="button" style="justify-content:center" ${dis?'disabled':''} onclick="${fn}()">${pfi(ic,18)}${lbl}</button>`;
  let warn=true,title,txt,acts='';
  if(!m.hasAuth){title=m.email?'Email Belum Terhubung':'Belum Ada Email';txt=m.email?'Hubungkan email ke akun Anda agar bisa diverifikasi dan dipakai untuk reset kata sandi.':'Tambahkan email agar akun bisa diverifikasi dan dipakai untuk reset kata sandi.';acts=ob('authAddEmail','mail',m.email?'Hubungkan &amp; Verifikasi Email':'Tambah Email')}
  else if(m.pendingEmail){title='Menunggu Verifikasi Email Baru';txt=`Kami mengirim tautan ke <b>${pe}</b>. Buka tautan itu untuk menyelesaikan. Email lama (${em}) tetap dipakai sampai saat itu.`;acts=ob('authResendChange','refresh',left?`Kirim Ulang Tautan (${left} dtk)`:'Kirim Ulang Tautan',left)}
  else if(!m.emailVerified){title='Email Belum Diverifikasi';txt=`Buka tautan verifikasi yang kami kirim ke <b>${em}</b>. Belum menerima? Cek folder spam atau kirim ulang.`;acts=ob('authResend','refresh',left?`Kirim Ulang Email Verifikasi (${left} dtk)`:'Kirim Ulang Email Verifikasi',left)}
  else{warn=false;title='Email Terverifikasi';txt='Email Anda sudah terverifikasi.<br>Terima kasih telah mengamankan akun Anda.'}
  if(m.hasAuth)acts+=ob('authChangeEmail','pencil','Ubah Email');
  box.innerHTML=`${pfSub('Verifikasi Email',"go('accset')")}<div class="pfdone" style="padding-top:28px"><div class="pfenv">${pfi('mail',46)}<i class="bdg ${warn?'w':''}">${pfi(warn?'warn':'tick',16)}</i></div><h2>${title}</h2><p>${txt}</p>
    <div style="max-width:520px;margin:6px auto 0">${acts}<button class="pfbtn" type="button" onclick="go('acc')">Kembali ke Profil</button></div></div>`;
  clearTimeout(ACC.vt);if(left)ACC.vt=setTimeout(()=>{if(S.view==='accver')accVerRender()},1000);
}
/* ----- Notifikasi ----- */
function renderAccNt(){
  const box=$('#accNtPage');if(!box)return;
  const sw=(k,t,d,fn)=>`<label class="pfsw"><span class="tx"><b>${t}</b><small>${d}</small></span><span class="tgl"><input type="checkbox" ${coPref(k,true)?'checked':''} onchange="${fn||`coSetPref('${k}',this.checked)`}"></span></label>`;
  let ps='Tidak didukung di perangkat ini';
  if(window.nativeNotify)ps='Aplikasi Android';
  else if('Notification' in window)ps={granted:'Diizinkan',denied:'Diblokir di pengaturan browser',default:'Belum diminta'}[Notification.permission]||ps;
  box.innerHTML=`${pfSub('Notifikasi',"go('accset')")}<div class="pfw">
    <div class="pfcard">
      ${sw('notif','Notifikasi sistem','Tampilkan notifikasi saat ada pesanan online baru',"coSetNotif(this.checked).then(renderAccNt)")}
      ${sw('sound','Bunyi pesanan masuk','Putar bunyi saat pesanan online masuk')}
      ${sw('vib','Getar pesanan masuk','Getarkan perangkat saat pesanan online masuk')}
    </div>
    <p class="pfhint">Izin notifikasi perangkat: <b>${esc(ps)}</b></p>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="ntTest()">${pfi('bell',18)}Tes notifikasi</button>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="coBeep()">${pfi('bell',18)}Tes bunyi</button></div>`;
}
/* ----- Tentang Ordela ----- */
function renderAccAbout(){
  const m=CL.me,box=$('#accAboutPage');if(!m||!box)return;
  const st=accStore(m),own=m.role==='owner';
  const row=(ic,l,v)=>`<div class="pfrow">${pfi(ic,20)}<div class="tx"><small>${l}</small><b>${v}</b></div></div>`;
  box.innerHTML=`${pfSub('Tentang Ordela',"go('accset')")}<div class="pfw">
    <div class="pfhero"><img src="icon-192.png" alt="" width="84" height="84" style="border-radius:22px;box-shadow:0 8px 20px rgba(0,0,0,.12)"><b class="pfn">Ordela</b><small class="pfr">Aplikasi kasir dan pesanan untuk toko Anda</small></div>
    <div class="pfcard">
      ${row('info','Versi aplikasi',esc(APP_VER))}${row('globe','Situs','ordela.my.id')}
      ${st.name?row('store','Toko',esc(st.name)):''}${own&&st.code?row('id','Kode toko',`<code>${esc(st.code)}</code>`):''}
      ${row('cloud','Koneksi',(CL.on&&CL.tok)?(navigator.onLine===false?'Tidak ada internet':'Terhubung ke server'):'Mode offline')}
    </div>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="accRefreshApp()">${pfi('refresh',18)}Muat ulang versi terbaru</button></div>`;
}
/* ----- Hapus Akun ----- */
async function accDelLoad(){
  if(!CL.me||CL.me.role!=='owner'){ACC.delSole=false;return}
  try{const r=await api('/api/users');if(r.ok){const j=await r.json();ACC.delSole=!(j.users||[]).some(u=>u.role==='owner'&&u.active&&u.id!==CL.me.id)}else ACC.delSole=true}catch(e){ACC.delSole=true}
  if(S.view==='accdel'){const b=$('#accDelPage');if(b)b.dataset.built='';renderAccDel()}
}
function renderAccDel(){
  const m=CL.me,box=$('#accDelPage');if(!m||!box)return;
  if(box.dataset.built==='1'&&box.querySelector('#delPw'))return;
  if(ACC.delSole===undefined){ACC.delSole=null;accDelLoad()}
  const wipe=ACC.delSole===true,own=m.role==='owner';
  box.dataset.built='1';
  const li=t=>`<li>${t}</li>`;
  box.innerHTML=`${pfSub('Hapus Akun',"go('accset')")}<div class="pfw">
    <div class="deli">${pfi('warn',46).replace('stroke-width="1.9"','stroke-width="2.2"')}</div>
    <h2 class="delh">Yakin ingin menghapus akun?</h2>
    <p class="delp">${wipe?'Anda adalah satu-satunya owner. Menghapus akun ini akan <b>menghapus seluruh toko beserta semua datanya</b> secara permanen.':'Akun Anda akan dihapus dari toko ini dan tidak bisa dipakai masuk lagi. Tindakan ini tidak bisa dibatalkan.'}</p>
    <ul class="dell">${wipe?li('Semua menu, transaksi, dan pesanan online toko dihapus')+li('Semua akun karyawan toko ikut dihapus')+li('Kode toko dan tautan pemesanan tidak berlaku lagi'):li('Anda langsung keluar dari semua perangkat')+(own?li('Owner lain tetap bisa mengelola toko'):li('Riwayat transaksi toko tetap tersimpan'))}${li('Data tidak bisa dipulihkan')}</ul>
    <label class="fl" for="delPw">Masukkan kata sandi untuk melanjutkan</label>
    <div class="pfin pe">${pfi('lock',20)}<input class="fi" id="delPw" type="password" placeholder="Kata sandi Anda" autocomplete="current-password" maxlength="72" oninput="accDelChk()"><button class="eyeb" type="button" aria-label="Tampilkan atau sembunyikan kata sandi" onclick="accEye('delPw',this)">${pfi('eye',20)}</button></div>
    <label class="delck"><input type="checkbox" id="delOk" onchange="accDelChk()"><span>Saya mengerti bahwa akun${wipe?' dan seluruh data toko':''} akan dihapus permanen.</span></label>
    <p class="hint" id="delErr" style="color:var(--bad);min-height:16px"></p>
    <button class="pfbtn delbtn" id="delGo" type="button" disabled onclick="accDelAsk()">Ya, hapus akun saya</button>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="go('accset')">Batal</button>
    <p class="pfhint" style="text-align:center;margin-top:14px">${wipe?'Ingin mengganti kepemilikan dulu? Jadikan karyawan sebagai owner di menu Pengguna sebelum menghapus akun.':''}</p></div>`;
}
function accDelChk(){const g=$('#delGo');if(!g)return;g.disabled=!(($('#delPw')||{}).value&&($('#delOk')||{}).checked);const e=$('#delErr');if(e)e.textContent=''}
function accDelAsk(){
  const wipe=ACC.delSole===true;
  openModal(`<div class="lgo"><div class="lgi">${pfi('warn',30)}</div><h3>Hapus akun Anda?</h3>
  <p>${wipe?'Seluruh toko dan datanya akan dihapus permanen.':'Tindakan ini tidak bisa dibatalkan dan Anda tidak akan bisa memulihkan akun.'}</p>
  <div class="dlg2"><button class="btn del" type="button" onclick="accDelDo()">Hapus</button><button class="btn sec" type="button" onclick="closeModal()">Batal</button></div></div>`);
}
async function accDelDo(){
  const pw=($('#delPw')||{}).value||'';closeModal();
  const e=$('#delErr'),g=$('#delGo');if(g)g.disabled=true;
  try{
    const r=await api('/api/me',{method:'DELETE',body:JSON.stringify({password:pw})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){if(e)e.textContent=j.error||'Gagal menghapus akun';if(g)g.disabled=false;return}
    cloudLogout('Akun Anda telah dihapus.');
  }catch(x){if(e)e.textContent='Tidak ada koneksi. Coba lagi.';if(g)g.disabled=false}
}
function accRefreshApp(){
  ask('Muat ulang aplikasi?',CL.dirty?'Ada perubahan yang belum tersinkron. Tunggu sampai tersinkron dulu supaya tidak hilang.':'Aplikasi akan mengambil versi terbaru lalu dimuat ulang. Data Anda tidak dihapus.','Muat ulang',async()=>{
    try{const rs=await (navigator.serviceWorker&&navigator.serviceWorker.getRegistrations?navigator.serviceWorker.getRegistrations():[]);await Promise.all(rs.map(r=>r.unregister()));
      if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}
    location.reload();
  });
}
function accAvDraw(){
  const m=CL.me||{};
  /* halaman profil (accAvV) dan halaman edit (accAv) memakai id berbeda: dua elemen berid sama membuat foto tidak berubah */
  const nm=(($('#accName')||{}).value||m.name||'?').trim().charAt(0).toUpperCase();
  const v=$('#accAvV');if(v)v.innerHTML=(m.photo?`<img src="${esc(m.photo)}" alt="">`:esc(String(m.name||'?').trim().charAt(0).toUpperCase()));
  const e=$('#accAv');if(e)e.innerHTML=ACC.photo?`<img src="${esc(ACC.photo)}" alt="">`:esc(nm);
  const r=$('#accRm');if(r)r.hidden=!ACC.photo;
}
let ACC_CROP=null;
function accSheet(ctx){
  ACC.ctx=ctx||'edit';
  openModal(`<div class="shh"><h3>Pilih Foto</h3><button class="x" type="button" onclick="closeModal()" aria-label="Tutup">${pfi('x',18)}</button></div>
  <button class="shr" type="button" onclick="accPick('cam')">${pfi('camera',22)}Ambil Foto</button>
  <button class="shr" type="button" onclick="accPick('gal')">${pfi('image',22)}Pilih dari Galeri</button>
  <button class="shr" type="button" onclick="closeModal()">${pfi('x',22)}Batal</button>`);
  $('#mw').classList.add('sheetm');
}
function accPick(k){closeModal();const i=$(k==='cam'?'#accFileCam':'#accFile');if(i)i.click()}
function accPhoto(inp){
  const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  if(!ACC.ctx)ACC.ctx=S.view==='editacc'?'edit':'view';
  if(!/^image\//.test(f.type)){toast('Pilih file gambar');return}
  if(f.size>12*1024*1024){toast('Ukuran foto maksimal 12 MB');return}
  const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>openAccCrop(im);im.onerror=()=>toast('Foto tidak bisa dibaca');im.src=rd.result};
  rd.onerror=()=>toast('Foto tidak bisa dibaca');rd.readAsDataURL(f);
}
function openAccCrop(im){
  ACC_CROP={im,zoom:1,x:0,y:0,drag:null};
  const opt=(ic,t,d,fn)=>`<button type="button" onclick="${fn}"><span class="ib2">${pfi(ic,20)}</span><span class="tx"><b>${t}</b><small>${d}</small></span></button>`;
  $('#accPhotoPage').innerHTML=`${pfSub('Ubah Foto Profil','accPhotoBack()')}<div class="pfw pcrop">
    <div class="cropstage" id="cropStage"><canvas id="cropCanvas" width="320" height="320"></canvas><i class="cframe"></i></div>
    <div class="cropcontrols"><label for="cropZoom"><span>Perbesar foto</span><b id="cropZoomVal">100%</b></label><input id="cropZoom" type="range" min="1" max="3" step=".01" value="1" oninput="accCropZoom(this.value)"></div>
    <div class="pfmenu">${opt('camera','Ambil Foto','Gunakan kamera',"accPick('cam')")}${opt('image','Pilih dari Galeri','Pilih foto yang sudah ada',"accPick('gal')")}${opt('trash','Hapus Foto','Hapus foto profil saat ini','accPhotoRemove()')}</div>
    <button class="pfbtn" type="button" id="accPhSave" onclick="saveAccCrop()">Simpan Foto</button></div>`;
  go('accphoto');
  const c=$('#cropCanvas');c.onpointerdown=accCropDown;c.onpointermove=accCropMove;c.onpointerup=accCropUp;c.onpointercancel=accCropUp;c.onpointerleave=accCropUp;accCropDraw();
}
function accPhotoBack(){ACC_CROP=null;go(ACC.ctx==='edit'?'editacc':'acc')}
/* simpan foto langsung ke akun (dari halaman Profil, bukan dari form Edit Profil) */
async function accPhotoApply(photo){
  const m=CL.me;if(!m)return false;
  try{
    const r=await api('/api/me',{method:'PUT',body:JSON.stringify({name:m.name,phone:m.phone||'',photo,birth:m.birth||'',address:m.address||''})}),j=await r.json();
    if(!r.ok){toast(j.error||'Gagal menyimpan foto');return false}
    setMe(j);renderAcct();return true;
  }catch(x){if(x.message!=='auth')toast('Tidak bisa terhubung ke server');return false}
}
async function accPhotoRemove(){
  ACC_CROP=null;
  if(ACC.ctx==='edit'){ACC.photo='';go('editacc');accAvDraw();return}
  if(await accPhotoApply('')){go('acc');toast('Foto profil dihapus')}
}
function accCropDraw(){
  const q=ACC_CROP,c=$('#cropCanvas');if(!q||!c)return;const x=c.getContext('2d'),w=c.width,h=c.height,im=q.im;
  const base=Math.max(w/im.width,h/im.height),sc=base*q.zoom,iw=im.width*sc,ih=im.height*sc;
  const maxX=Math.max(0,(iw-w)/2),maxY=Math.max(0,(ih-h)/2);q.x=Math.max(-maxX,Math.min(maxX,q.x));q.y=Math.max(-maxY,Math.min(maxY,q.y));
  x.clearRect(0,0,w,h);x.fillStyle='#171717';x.fillRect(0,0,w,h);x.drawImage(im,(w-iw)/2+q.x,(h-ih)/2+q.y,iw,ih);
}
function accCropZoom(v){if(!ACC_CROP)return;ACC_CROP.zoom=Number(v)||1;const e=$('#cropZoomVal');if(e)e.textContent=Math.round(ACC_CROP.zoom*100)+'%';accCropDraw()}
function accCropDown(e){if(!ACC_CROP)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);ACC_CROP.drag={x:e.clientX,y:e.clientY,ox:ACC_CROP.x,oy:ACC_CROP.y}}
function accCropMove(e){const q=ACC_CROP;if(!q||!q.drag)return;e.preventDefault();const r=e.currentTarget.getBoundingClientRect(),scale=320/r.width;q.x=q.drag.ox+(e.clientX-q.drag.x)*scale;q.y=q.drag.oy+(e.clientY-q.drag.y)*scale;accCropDraw()}
function accCropUp(){if(ACC_CROP)ACC_CROP.drag=null}
function cancelAccCrop(){accPhotoBack()}
async function saveAccCrop(){
  const q=ACC_CROP;if(!q)return;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=q.im,w=320,h=320,base=Math.max(w/im.width,h/im.height),sc=base*q.zoom,iw=im.width*sc,ih=im.height*sc;
  x.fillStyle='#fff';x.fillRect(0,0,256,256);x.drawImage(im,((w-iw)/2+q.x)/w*256,((h-ih)/2+q.y)/h*256,iw/w*256,ih/h*256);
  let url;try{url=c.toDataURL('image/jpeg',.84)}catch(e){toast('Foto tidak bisa diproses');return}
  ACC_CROP=null;
  if(ACC.ctx==='edit'){ACC.photo=url;go('editacc');accAvDraw();return}
  const b=$('#accPhSave');if(b)b.disabled=true;
  if(await accPhotoApply(url)){go('acc');toast('Foto profil diperbarui')}else if(b)b.disabled=false;
}
/* nomor telepon: kode negara + nomor, disimpan seperti "+62 812 3456 7890" */
const PH_CC=[['62','🇮🇩 Indonesia'],['60','🇲🇾 Malaysia'],['65','🇸🇬 Singapura'],['673','🇧🇳 Brunei'],['66','🇹🇭 Thailand'],['63','🇵🇭 Filipina'],['84','🇻🇳 Vietnam'],['855','🇰🇭 Kamboja'],['91','🇮🇳 India'],['86','🇨🇳 Tiongkok'],['852','🇭🇰 Hong Kong'],['81','🇯🇵 Jepang'],['82','🇰🇷 Korea Selatan'],['61','🇦🇺 Australia'],['966','🇸🇦 Arab Saudi'],['971','🇦🇪 UEA'],['44','🇬🇧 Inggris'],['1','🇺🇸 AS / Kanada']];
function phDefCc(){let z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}return /Kuala_Lumpur|Kuching/.test(z)?'60':/Singapore/.test(z)?'65':/Brunei/.test(z)?'673':'62'}
function phSplit(v){
  v=String(v||'').trim();const dg=v.replace(/\D/g,'');
  if(!dg)return{cc:phDefCc(),num:''};
  if(v[0]==='+'){const c=PH_CC.map(x=>x[0]).sort((a,b)=>b.length-a.length).find(c=>dg.startsWith(c));if(c)return{cc:c,num:phFmt(dg.slice(c.length))};return{cc:phDefCc(),num:phFmt(dg)}}
  return{cc:phDefCc(),num:phFmt(dg.replace(/^0+/,''))};
}
function phFmt(d){d=String(d).replace(/\D/g,'');return d.replace(/^(\d{3})(\d{1,4})?(\d{1,4})?(\d*)$/,(m,a,b,c,r)=>[a,b,c,r].filter(Boolean).join(' '))}
function phCcOpts(sel){return PH_CC.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${n} (+${c})</option>`).join('')}
function accPhotoDel(){ACC.photo='';accAvDraw()}
async function accSave(){
  const e=$('#accErr'),btn=$('#accSave'),m=CL.me,own=m&&m.role==='owner',name=$('#accName').value.trim().replace(/\s+/g,' ');
  const num=x=>x.replace(/\D/g,'').replace(/^0+/,''),fmt=(cc,n)=>n?'+'+cc+' '+phFmt(n):'';
  const pn=num($('#accPhone').value),phone=fmt($('#accCc').value,pn),birth=$('#accBirth').value,addr=$('#accAddr').value.trim();
  if(!name){e.textContent='Nama lengkap wajib diisi';return}
  if(pn&&(pn.length<6||phone.length>20)){e.textContent='Nomor telepon tidak valid';return}
  if(birth&&(birth>new Date().toISOString().slice(0,10)||birth<'1900-01-01')){e.textContent='Tanggal lahir tidak valid';return}
  const body={name,phone,photo:ACC.photo||'',birth,address:addr};
  let sName='',sPhone='';
  if(own){
    const un=$('#accUser').value.trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(un)){e.textContent='Username 3-24 karakter: huruf kecil, angka, titik, strip, garis bawah';return}
    body.username=un;
    sName=($('#accStore').value||'').trim().replace(/\s+/g,' ');
    if(sName.length<2){e.textContent='Nama toko minimal 2 karakter';return}
    body.storeName=sName;
    const sn=num($('#accSPhone').value);if(sn&&sn.length<6){e.textContent='Nomor telepon toko tidak valid';return}
    sPhone=fmt($('#accSCc').value,sn);
  }
  btn.disabled=true;e.textContent='';
  try{
    const r=await api('/api/me',{method:'PUT',body:JSON.stringify(body)}),j=await r.json();
    if(!r.ok){e.textContent=j.error||'Gagal menyimpan';return}
    setMe(j);
    if(own){db.set.store=sName;db.set.phone=sPhone;save();try{applyBrand()}catch(x){}}
    const b=$('#editAccPage');if(b)b.dataset.built='';
    renderAcct();accDone('Profil Berhasil Diperbarui','Informasi profil Anda telah berhasil disimpan.');
  }catch(x){if(x.message!=='auth')e.textContent='Tidak bisa terhubung ke server'}
  finally{btn.disabled=false}
}
async function changePw(){
  const o=$('#pwOld').value,n=$('#pwNew').value,n2=$('#pwNew2').value,e=$('#pwErr');
  if(!o||!n){e.textContent='Isi password saat ini dan password baru';return}
  if(n.length<6){e.textContent='Password baru minimal 6 karakter';return}
  if(n!==n2){e.textContent='Pengulangan password tidak sama';return}
  try{
    const r=await api('/api/me/password',{method:'POST',body:JSON.stringify({old:o,new:n})});
    const j=await r.json();
    if(!r.ok){e.textContent=j.error||'Gagal';return}
    CL.tok=window.POS_SSO_API?'sso-cookie':j.token;try{if(!window.POS_SSO_API)localStorage.setItem('pos_tok',CL.tok);else localStorage.removeItem('pos_tok')}catch(x){}
    ['pwOld','pwNew','pwNew2'].forEach(i=>{const e=$('#'+i);if(e)e.value=''});$('#pwErr').textContent='';const pb=$('#pwPage');if(pb)pb.dataset.built='';accDone('Kata Sandi Berhasil Diubah','Gunakan kata sandi baru saat Anda masuk berikutnya.');
  }catch(x){if(x.message!=='auth')e.textContent='Tidak bisa terhubung ke server'}
}
/* dialog keluar: hanya dua pilihan, Keluar atau Batal */
function logoutAsk(){
  openModal(`<div class="lgo"><div class="lgi"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></div>
  <h3>Keluar dari akun?</h3><p>${CL.dirty?'Ada perubahan yang belum tersinkron dan bisa hilang kalau Anda keluar sekarang.':'Anda perlu masuk lagi untuk memakai aplikasi.'}</p>
  <button class="btn red" onclick="closeModal();cloudLogout()">Keluar</button>
  <button class="btn sec" onclick="closeModal()">Batal</button></div>`);
}

/* ----- pembatasan saat sinkron: karyawan tidak mengirim perubahan di luar izinnya ----- */
const SET_FREE_KEYS=['gv','lang','fsAuto','logoInit','logoApp'];
function restrictToServer(M,S){
  const me=CL.me;if(!me||me.role==='owner')return M;
  const has=k=>(me.perms||[]).includes(k),out={...M};
  out.items=S.items.map(si=>{const m=M.items.find(x=>x.id===si.id);return m?{...si,stock:m.stock}:si});   // karyawan: hanya stok yang boleh berubah
  out.cats=S.cats;
  const om=new Map(S.orders.map(o=>[o.no,o]));
  out.orders=M.orders.map(o=>om.get(o.no)||o);
  const set={...M.set};
  for(const k of Object.keys(S.set||{})){
    if(SET_FREE_KEYS.includes(k)||has('set')||(k==='prn'&&has('prn')))continue;
    set[k]=S.set[k];
  }
  out.set=set;return out;
}


/* ----- absensi: selfie kamera + lokasi GPS + shift (jam shift hanya diatur owner) ----- */
const ATT={rows:[],me:null,tz:'',today:'',range:'7',who:'',busy:0,last:0,built:false,users:[],stream:null,pos:null,photo:'',mode:'in',gpsOn:false};
const ATT_TZ=[['','Ikut zona waktu server'],['Asia/Jakarta','WIB (Jakarta)'],['Asia/Makassar','WITA (Makassar/Bali)'],['Asia/Jayapura','WIT (Jayapura)'],['Asia/Kuala_Lumpur','Malaysia (Kuala Lumpur)'],['Asia/Singapore','Singapura']];
function attC(){return db.set.att||{}}
function attTzv(){return ATT.tz||attC().tz||undefined}
function attT(iso){try{return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:attTzv()})}catch(e){return ''}}
function attD(day){try{return new Date(day+'T00:00:00Z').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})}catch(e){return day}}
function attAdd(day,n){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function attMn(n){n=Math.round(n);return n>=60?Math.floor(n/60)+' jam '+(n%60?n%60+' mnt':''):n+' mnt'}
function attDist(a,b,c,d){const R=6371000,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return Math.round(2*R*Math.asin(Math.min(1,Math.sqrt(h))))}
function attStore(){const c=attC(),la=parseFloat(c.lat),ln=parseFloat(c.lng);return(Number.isFinite(la)&&Number.isFinite(ln)&&String(c.lat)!==''&&String(c.lng)!=='')?{lat:la,lng:ln,rad:Math.max(20,+c.radius||100),strict:!!c.strict}:null}
function attBadge(r){
  if(r.type==='in')return r.status==='late'?`<span class="pst bad">Terlambat ${esc(attMn(r.mins))}</span>`:r.status==='ontime'?'<span class="pst ok">Tepat waktu</span>':'<span class="pst">Tanpa shift</span>';
  return r.status==='early'?`<span class="pst w">Pulang cepat ${esc(attMn(r.mins))}</span>`:r.status==='ok'?'<span class="pst ok">Pulang sesuai jadwal</span>':'<span class="pst">Pulang</span>';
}
function attLocChip(r){
  const st=attStore(),co=(r.lat!=null?`<small>${(+r.lat).toFixed(5)}, ${(+r.lng).toFixed(5)}${r.acc?' (±'+r.acc+' m)':''}</small>`:'');
  if(r.dist==null||!st)return co;
  return (r.dist<=st.rad?`<span class="pst ok">${r.dist} m dari toko</span>`:`<span class="pst bad">Di luar area toko · ${r.dist} m</span>`)+co;
}
function attRowHtml(r){
  return `<div class="atr"><span class="av">${esc((r.name||'?').trim().charAt(0).toUpperCase())}</span><div class="atm"><b>${esc(r.name)}</b> <small style="display:inline">${esc(attD(r.day))}</small><br>
    ${r.type==='in'?'Masuk':'Pulang'} <b>${esc(attT(r.t))}</b>${r.shift?` · ${esc(r.shift)} ${esc(r.sstart)}–${esc(r.send)}`:''}<br>${attBadge(r)}${attLocChip(r)}
    ${r.hp?`<br><button class="lnk" type="button" onclick="attPhoto(${r.id})">Lihat foto selfie</button>`:''}</div></div>`;
}
function attFiltered(){
  const from=ATT.range==='today'?ATT.today:ATT.range==='30'?attAdd(ATT.today,-29):attAdd(ATT.today,-6);
  const me=(CL.me||{}).username;return ATT.rows.filter(r=>r.day>=from&&(!me||r.uname===me));
}
function attDraw(){
  const st=$('#attStat'),hs=$('#attHist');if(!st||!hs)return;
  const c=attC(),me=CL.me||{},m=ATT.me||{},shs=(c.shifts||[]).filter(x=>x.id),asg=(c.assign||{})[me.username],ash=shs.find(x=>x.id===asg);
  let h=`<div class="attclk" id="attClock"></div><div class="attdt" id="attDate"></div>`;
  if(!c.on)h+=`<div class="attst"><b>Absensi belum aktif</b>${isOwner()?'Aktifkan di Pengaturan → Absensi & Shift.':'Hubungi owner untuk mengaktifkannya.'}</div>`;
  else{
    const cur=m.open?shs.find(x=>x.id===m.shiftId):ash;
    if(m.open)h+=`<div class="attst"><b>Sedang bertugas sejak ${esc(attT(m.since))}</b>${cur?esc(cur.name)+' · '+esc(cur.start)+'–'+esc(cur.end):'Tanpa shift'}${m.last?'<br>'+attBadge(m.last):''}</div><button class="btn red" onclick="attOpen('out')"><i class="ic" data-ic="clock"></i>Absen Pulang</button>`;
    else{
      h+=`<div class="attst"><b>${m.last&&m.last.type==='out'?'Terakhir pulang '+esc(attD(m.last.day))+' '+esc(attT(m.last.t)):'Belum absen masuk'}</b>`;
      if(ash)h+=`Shift Anda: ${esc(ash.name)} · ${esc(ash.start)}–${esc(ash.end)} (toleransi ${ash.grace||0} mnt)`;
      else if(shs.length)h+=`<label class="fl" for="attShift" style="margin-top:6px">Pilih shift</label><select class="fi" id="attShift"><option value="">— pilih shift —</option>${shs.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.start)}–${esc(x.end)}</option>`).join('')}</select>`;
      else h+='Owner belum mengatur shift, kehadiran dicatat tanpa jam shift.';
      h+=`</div><button class="btn" onclick="attOpen('in')"><i class="ic" data-ic="clock"></i>Absen Masuk</button>`;
    }
  }
  st.innerHTML=h;attClock();
  const rows=attFiltered(),ins=rows.filter(r=>r.type==='in'),late=ins.filter(r=>r.status==='late').length,ont=ins.filter(r=>r.status==='ontime').length;
  const akc=(t,v,bg)=>`<div class="kc"><div class="kt"><span>${t}</span></div><div class="kv"><span class="ki" style="background:${bg}"><i class="ic" data-ic="check"></i></span>${v}</div></div>`;
  hs.innerHTML=`<h3>Riwayat Absensi Saya</h3>
  <div class="chips">${[['today','Hari ini'],['7','7 hari'],['30','30 hari']].map(x=>`<button type="button" class="chip ${ATT.range===x[0]?'on':''}" onclick="ATT.range='${x[0]}';attDraw()">${x[1]}</button>`).join('')}</div>
  <div class="chips atsum"><span class="pst ok">Tepat waktu: ${ont}</span><span class="pst bad">Terlambat: ${late}</span><span class="pst">Masuk: ${ins.length}</span></div>
  <div class="kp wkp atkp">${akc('Tepat waktu',ont,'#3b9d6e')}${akc('Terlambat',late,'#EF4444')}${akc('Total masuk',ins.length,'#6b7280')}</div>
  ${rows.length?rows.map(attRowHtml).join(''):'<div class="empty">Belum ada data absensi</div>'}`;
}
function attClock(){
  const e=$('#attClock');if(!e)return;
  try{const n=new Date(),z=attTzv();e.textContent=n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:z});$('#attDate').textContent=n.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:z})}catch(x){}
}
setInterval(attClock,1000);
async function attLoad(force){
  if(ATT.busy||(!force&&Date.now()-ATT.last<4000))return;
  ATT.busy=1;
  try{
    const r=await api('/api/att'),j=await r.json();
    if(r.ok){ATT.rows=j.rows||[];ATT.me=j.me||null;ATT.today=j.today||'';ATT.tz=j.tz||'';ATT.last=Date.now();if(!ATT.xman&&ATT.today){ATT.xf=ATT.today.slice(0,8)+'01';ATT.xt=ATT.today;const a=$('#axF'),b=$('#axT');if(a)a.value=ATT.xf;if(b)b.value=ATT.xt}}
  }catch(e){}
  finally{ATT.busy=0}
  if(S.view==='att')attDraw();
}
function renderAtt(){
  const box=$('#attBox');if(!box)return;
  if(!ATT.built||!$('#attStat')){
    ATT.built=true;
    box.innerHTML=`<div class="panel attp" id="attStat"></div><div class="panel attp" id="attHist"></div>`;
    ATT.last=0;
  }
  if(!ATT.today)ATT.today=new Date().toISOString().slice(0,10);
  attDraw();attLoad();
}

/* --- kamera + GPS --- */
function attStop(){try{if(ATT.stream){ATT.stream.getTracks().forEach(t=>t.stop());ATT.stream=null}}catch(e){}}
function attOpen(type){
  const c=attC(),sh=$('#attShift');
  if(type==='in'&&sh&&!sh.value){toast('Pilih shift dulu');return}
  ATT.mode=type;ATT.photo='';ATT.pos=null;ATT.shiftSel=sh?sh.value:'';
  openModal(`<h3>${type==='in'?'Absen Masuk':'Absen Pulang'}</h3>
  <div class="attcam"><video id="attVid" playsinline muted autoplay></video><img id="attSnap" alt="Foto selfie" hidden></div>
  <div class="attloc" id="attLoc">Mencari lokasi…</div>
  <p class="hint" id="attErr" style="color:var(--bad);min-height:16px;margin:4px 0"></p>
  <button class="btn" id="attShot" onclick="attShot()" disabled>Ambil Foto</button>
  <button class="btn sec" id="attRetake" onclick="attRetake()" hidden>Ulangi Foto</button>
  <button class="btn" id="attSend" onclick="attSend()" hidden disabled>Kirim Absen</button>
  <button class="btn sec" onclick="closeModal()">Batal</button>`);
  attCam();attGps();
}
async function attCam(){
  const er=$('#attErr');
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw {name:window.isSecureContext===false?'Insecure':'NoApi'};
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:640}},audio:false});
    if(!$('#attVid')){st.getTracks().forEach(t=>t.stop());return}
    ATT.stream=st;const v=$('#attVid');v.srcObject=st;try{await v.play()}catch(e){}
    const b=$('#attShot');if(b)b.disabled=false;
  }catch(e){
    if(er)er.textContent=e&&e.name==='NotAllowedError'?'Kamera diblokir. Izinkan akses kamera di pengaturan browser, lalu buka absen lagi.':e&&e.name==='Insecure'?'Kamera hanya bisa dipakai lewat alamat https.':'Kamera tidak ditemukan atau tidak bisa dibuka.';
  }
}
function attGps(){
  const el=$('#attLoc');
  if(!navigator.geolocation){if(el){el.className='attloc bad';el.textContent='Perangkat ini tidak mendukung GPS'}return}
  if(el){el.className='attloc';el.textContent='Mencari lokasi…'}
  navigator.geolocation.getCurrentPosition(p=>{
    ATT.pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0)};
    const e=$('#attLoc');if(!e)return;const st=attStore();let t='Lokasi terdeteksi · akurasi ±'+ATT.pos.acc+' m',cls='ok';
    if(st){const d=attDist(ATT.pos.lat,ATT.pos.lng,st.lat,st.lng);ATT.pos.d=d;if(d<=st.rad)t+=' · '+d+' m dari toko';else{t='Di luar area toko: '+d+' m (maks. '+st.rad+' m)';cls='bad'}}
    e.className='attloc '+cls;e.textContent=t;attReadySend();
  },err=>{
    const e=$('#attLoc');if(!e)return;e.className='attloc bad';
    e.innerHTML=(err&&err.code===1?'Izin lokasi ditolak. Aktifkan GPS/lokasi untuk browser ini. ':'Lokasi belum didapat. ')+'<button class="lnk" type="button" onclick="attGps()">Coba lagi</button>';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function attShot(){
  const v=$('#attVid');if(!v||!v.videoWidth){$('#attErr').textContent='Kamera belum siap';return}
  const W=320,H=Math.round(v.videoHeight*W/v.videoWidth),c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(v,0,0,W,H);
  ATT.photo=c.toDataURL('image/jpeg',.65);
  const im=$('#attSnap');im.src=ATT.photo;im.hidden=false;v.hidden=true;$('#attShot').hidden=true;$('#attRetake').hidden=false;$('#attSend').hidden=false;$('#attErr').textContent='';attReadySend();
}
function attRetake(){ATT.photo='';$('#attSnap').hidden=true;$('#attVid').hidden=false;$('#attShot').hidden=false;$('#attRetake').hidden=true;$('#attSend').hidden=true;const v=$('#attVid');if(v&&(!ATT.stream||!ATT.stream.active))attCam();else if(v){try{v.play()}catch(e){}}}
function attReadySend(){const b=$('#attSend');if(!b)return;const st=attStore(),out=st&&st.strict&&ATT.pos&&ATT.pos.d!=null&&ATT.pos.d>st.rad;b.disabled=!(ATT.photo&&ATT.pos)||!!out}
async function attSend(){
  if(!ATT.photo||!ATT.pos)return;const b=$('#attSend'),er=$('#attErr');b.disabled=true;b.textContent='Mengirim…';er.textContent='';
  try{
    const r=await api('/api/att',{method:'POST',body:JSON.stringify({type:ATT.mode,photo:ATT.photo,lat:ATT.pos.lat,lng:ATT.pos.lng,acc:ATT.pos.acc,shift:ATT.shiftSel||''})}),j=await r.json();
    if(!r.ok){er.textContent=j.error||'Gagal mengirim absen';b.disabled=false;b.textContent='Kirim Absen';return}
    const rec=j.rec;closeModal();
    toast((rec.type==='in'?'Absen masuk ':'Absen pulang ')+'tercatat'+(rec.status==='late'?' · Terlambat '+attMn(rec.mins):rec.status==='ontime'?' · Tepat waktu':rec.status==='early'?' · Pulang cepat '+attMn(rec.mins):''));
    attLoad(true);
  }catch(e){if(e.message!=='auth'){er.textContent='Tidak bisa terhubung ke server';b.disabled=false;b.textContent='Kirim Absen'}}
}
async function attPhoto(id){
  const r0=ATT.rows.find(x=>x.id===id)||{};
  openModal(`<h3>${esc(r0.name||'Foto absen')}</h3><div class="hint">Memuat foto…</div><button class="btn sec" onclick="closeModal()">Tutup</button>`);
  try{
    const r=await api('/api/att/photo?id='+id),j=await r.json();
    if(!r.ok||!j.photo){openModal(`<h3>${esc(r0.name||'Foto absen')}</h3><div class="hint">Foto tidak tersedia (foto lama otomatis dihapus setelah 60 hari).</div><button class="btn sec" onclick="closeModal()">Tutup</button>`);return}
    openModal(`<h3>${esc(r0.name||'Foto absen')}</h3><div class="hint">${r0.type==='in'?'Masuk':'Pulang'} ${esc(attD(r0.day))} ${esc(attT(r0.t))}</div><img src="${esc(j.photo)}" alt="Foto selfie absen" style="width:100%;border-radius:20px;margin:8px 0"><button class="btn sec" onclick="closeModal()">Tutup</button>`);
  }catch(e){}
}
/* --- pengaturan (khusus owner): jam shift, lokasi toko, pembagian shift --- */
async function attCfgDraw(){
  const b=$('#attForm');if(!b||!isOwner())return;
  const c=attC();
  try{const j=await (await api('/api/users')).json();ATT.users=(j.users||[]).filter(u=>u.active)}catch(e){}
  b.innerHTML=`<h3>Pengaturan Absensi &amp; Shift <span class="pst w">khusus owner</span></h3>
  <label class="tgl"><input type="checkbox" id="acOn" ${c.on?'checked':''}><span>Aktifkan absensi karyawan</span></label>
  <label class="fl" for="acTz">Zona waktu toko</label><select class="fi" id="acTz">${ATT_TZ.map(z=>`<option value="${z[0]}" ${(c.tz||'')===z[0]?'selected':''}>${z[1]}</option>`).join('')}</select>
  <label class="fl">Lokasi toko (untuk cek jarak absen)</label>
  <div class="acll"><input class="fi" id="acLat" inputmode="decimal" placeholder="Latitude" value="${esc(String(c.lat==null?'':c.lat))}"><input class="fi" id="acLng" inputmode="decimal" placeholder="Longitude" value="${esc(String(c.lng==null?'':c.lng))}"></div>
  <button class="btn sec" type="button" onclick="acHere()">📍 Pakai lokasi saya sekarang (GPS)</button>
  <label class="fl" for="acRad">Radius area toko (meter)</label><input class="fi" id="acRad" type="number" min="20" max="5000" value="${+c.radius||100}">
  <label class="tgl"><input type="checkbox" id="acStrict" ${c.strict?'checked':''}><span>Absen hanya boleh dari dalam area toko</span></label>
  <label class="fl">Shift</label><div id="acShifts">${(c.shifts||[]).map(acShiftRow).join('')}</div>
  <button class="btn sec" type="button" onclick="acAdd()">+ Tambah shift</button>
  <label class="fl">Shift tiap karyawan</label><div id="acAssign"></div>
  <p class="hint" id="acErr" style="color:var(--bad);min-height:16px"></p>
  <button class="btn" onclick="acSave()">Simpan Pengaturan Absensi</button>`;
  acAssignDraw();
}
function acShiftRow(x){
  return `<div class="acs" data-id="${esc(x.id)}"><div class="nm"><label>Nama shift</label><input class="fi acn" maxlength="30" placeholder="Mis. Pagi" value="${esc(x.name||'')}" oninput="acAssignDraw()"></div>
  <div><label>Mulai</label><input class="fi act1" type="time" value="${esc(x.start||'')}"></div><div><label>Selesai</label><input class="fi act2" type="time" value="${esc(x.end||'')}"></div>
  <div><label title="Toleransi telat, dalam menit">Toleransi mnt</label><input class="fi acg" type="number" inputmode="numeric" min="0" max="120" value="${+x.grace||0}"></div>
  <button class="btn sec acdel" type="button" onclick="this.closest('.acs').remove();acAssignDraw()">Hapus shift</button></div>`;
}
function acAdd(){const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);$('#acShifts').insertAdjacentHTML('beforeend',acShiftRow({id,name:'',start:'08:00',end:'16:00',grace:10}));acAssignDraw()}
function acRead(){return [...document.querySelectorAll('#acShifts .acs')].map((e,i)=>({id:e.dataset.id,name:e.querySelector('.acn').value.trim()||('Shift '+(i+1)),start:e.querySelector('.act1').value,end:e.querySelector('.act2').value,grace:Math.max(0,Math.min(120,Math.round(+e.querySelector('.acg').value||0)))}))}
function acAssignDraw(){
  const box=$('#acAssign');if(!box)return;const shs=acRead(),cur={...(attC().assign||{})};
  box.querySelectorAll('select[data-u]').forEach(s=>{cur[s.dataset.u]=s.value});
  box.innerHTML=ATT.users.length?ATT.users.map(u=>`<div class="asg"><span>${esc(u.name)} <small style="color:var(--mu)">@${esc(u.username)}</small></span><select class="fi" data-u="${esc(u.username)}"><option value="">Pilih sendiri</option>${shs.map(x=>`<option value="${esc(x.id)}" ${cur[u.username]===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`).join(''):'<div class="hint">Belum ada karyawan.</div>';
}
function acHere(){
  if(!navigator.geolocation){toast('GPS tidak didukung perangkat ini');return}
  toast('Mencari lokasi…');
  navigator.geolocation.getCurrentPosition(p=>{$('#acLat').value=p.coords.latitude.toFixed(6);$('#acLng').value=p.coords.longitude.toFixed(6);toast('Lokasi toko diisi dari GPS')},()=>toast('Lokasi tidak didapat. Izinkan akses lokasi.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function acSave(){
  if(!isOwner())return;const er=$('#acErr'),shs=acRead();
  for(const x of shs){if(!x.start||!x.end){er.textContent='Isi jam mulai dan selesai untuk setiap shift';return}if(x.start===x.end){er.textContent='Jam mulai dan selesai tidak boleh sama ('+x.name+')';return}}
  const la=$('#acLat').value.trim().replace(',','.'),ln=$('#acLng').value.trim().replace(',','.');
  if((la||ln)&&(!(Math.abs(+la)<=90)||!(Math.abs(+ln)<=180)||!la||!ln)){er.textContent='Latitude/longitude tidak valid';return}
  const assign={};document.querySelectorAll('#acAssign select[data-u]').forEach(s=>{if(s.value&&shs.some(x=>x.id===s.value))assign[s.dataset.u]=s.value});
  db.set.att={on:$('#acOn').checked,tz:$('#acTz').value,lat:la?+la:'',lng:ln?+ln:'',radius:Math.max(20,Math.min(5000,Math.round(+$('#acRad').value||100))),strict:$('#acStrict').checked,shifts:shs,assign};
  er.textContent='';save();toast('Pengaturan absensi disimpan');attDraw();
}

/* halaman tidak boleh bergeser ke samping: tarikan horizontal hanya berlaku di area yang memang bisa di-scroll ke samping */
(function(){
  let sx=0,sy=0,mode=null,tg=null;
  const hs=e=>{for(;e&&e!==document.body&&e.nodeType===1;e=e.parentElement){if(e.matches&&e.matches('input[type=range],input[type=text],input[type=search],input[type=number],textarea,[data-hz]'))return true;if(e.scrollWidth>e.clientWidth+1&&/(auto|scroll)/.test(getComputedStyle(e).overflowX))return true}return false};
  document.addEventListener('touchstart',e=>{if(e.touches.length!==1){mode='multi';return}sx=e.touches[0].clientX;sy=e.touches[0].clientY;mode=null;tg=e.target},{passive:true,capture:true});
  document.addEventListener('touchmove',e=>{
    if(e.touches.length!==1||mode==='multi')return;
    const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
    if(mode===null&&(Math.abs(dx)>5||Math.abs(dy)>5))mode=Math.abs(dx)>Math.abs(dy)?(hs(tg)?'ok':'block'):'v';
    if(mode==='block'&&e.cancelable)e.preventDefault();
  },{passive:false,capture:true});
  const fix=()=>{const d=document.documentElement,b=document.body;if(d.scrollLeft||b.scrollLeft||window.scrollX){d.scrollLeft=0;b.scrollLeft=0;try{scrollTo(0,0)}catch(e){}}};
  addEventListener('scroll',fix,{passive:true,capture:true});
  if(window.visualViewport)visualViewport.addEventListener('scroll',()=>{if(visualViewport.offsetLeft){try{scrollTo(0,0)}catch(e){}}});
  addEventListener('orientationchange',fix);
})();
/* gestur geser kiri/kanan (back/forward browser) dimatikan: tidak berpindah ke halaman lain seperti dashboard */
(function(){try{history.replaceState({pos:1},'');history.pushState({pos:2},'');addEventListener('popstate',function(){try{history.pushState({pos:2},'')}catch(e){}});addEventListener('pageshow',function(e){if(e.persisted){try{history.pushState({pos:2},'')}catch(x){}}})}catch(e){}})();

function usrRoleKey(s){return String(s||'').trim().toLowerCase()}
function usrRoleLabel(s){const k=usrRoleKey(s);if(k==='owner')return 'Owner';if(k==='staff'||k==='staf')return 'Staf';const b={kasir:'Kasir',server:'Server',kitchen:'Kitchen'};return b[k]||String(s||'').replace(/(^|\s)\S/g,x=>x.toUpperCase())}
/* ---------- modal & boot ---------- */
function openModal(h){$('#modal').innerHTML=h;$('#mw').classList.remove('sheetm');$('#mw').classList.add('on')}
function closeModal(){attStop();$('#mw').classList.remove('on')}
function render(){
  if(ORDELA_APP_MODE==='pos'){renderCats();renderGrid();renderInvoice();}
  if(window.P2&&P2.views[S.view])P2.views[S.view]();
  if(S.view==='home')renderHome();
  if(S.view==='table')renderTable();
  if(S.view==='alert')renderAlert();
  if(S.view==='inv')renderInv();
  if(S.view==='set')renderSet();
  if(S.view==='rc')renderRc();
  if(S.view==='prn')renderPrn();
  if(S.view==='co')renderCo(true);
  if(S.view==='usr')renderUsr();
  if(S.view==='acc')renderAccPage();
  if(S.view==='accset')renderAccSet();
  if(S.view==='accinfo')renderAccInfo();
  if(S.view==='editacc')renderEditAccPage();   /* tidak menimpa isian yang sedang diubah */
  if(S.view==='pw')renderPwPage();
  if(S.view==='accver')accVerRender();
  if(S.view==='accnt')renderAccNt();
  if(S.view==='accabout')renderAccAbout();
  if(S.view==='accdel')renderAccDel();
  if(S.view==='att')renderAtt();else ATT.built=false;
  if(S.view==='pyr')pyRender();
}
const RAIL_USER='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>';
/* ---------- Beranda (rekap + riwayat) / Meja / Notifikasi ---------- */
const sumT=l=>l.reduce((a,b)=>a+(+b.total||0),0);
const cmp=n=>{try{return new Intl.NumberFormat(db.set.loc||'id-ID',{notation:'compact',maximumFractionDigits:1}).format(n)}catch(e){return String(Math.round(n))}};
const cmpM=n=>{const s=db.set,v=cmp(n);return s.curPos==='after'?v+' '+s.cur:s.cur+' '+v};
/* deret penjualan untuk grafik: per jam (satu hari) atau per hari (rentang tanggal) */
const inR=(x,f,t)=>{const k=dkey(x.t);return(!f||k>=f)&&(!t||k<=t)};
function dl(a,b){if(!b)return a?'<span class="dlt up">▲ baru</span>':'<span class="dlt">—</span>';const p=(a-b)/b*100;return`<span class="dlt ${p>=0?'up':'dn'}">${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(0)}%</span>`}
function promoUsed(id){let n=0;for(const o of db.orders)if(o.promo&&o.promo.id===id)n++;return n}
function holdTotal(h){let t=0;for(const k in h.cart){const i=find(bid(k));if(!i)continue;const m=(h.cm||{})[k];t+=(i.price+(m?m.sel.reduce((a,x)=>a+(+x.p||0),0):0))*h.cart[k]}return t}
function locTbl(k){const o=[];
  (db.holds||[]).filter(h=>!h.del&&h.tbl&&(!k||tkey(h.tbl)===tkey(k))).forEach(h=>o.push({kind:'hold',tbl:h.tbl,id:h.id,t:h.t,by:h.by,cust:h.cust,n:Object.values(h.cart).reduce((a,b)=>a+b,0),total:holdTotal(h)}));
  (db.occ||[]).filter(x=>!x.del&&(!k||tkey(x.tbl)===tkey(k))).forEach(x=>o.push({kind:'occ',tbl:x.tbl,id:x.id,t:x.t,by:x.by,cust:x.cust,no:x.no,total:x.total}));
  return o}
function tblStep(d){db.set.tblN=Math.max(1,Math.min(60,(+db.set.tblN||9)+d));save();renderTable()}
function renderTable(){
  const el=$('#tableBox');if(!el)return;
  const act=(typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>tkey(o.tbl)&&(o.status==='new'||o.status==='accepted'));
  const n=Math.max(1,Math.min(60,+db.set.tblN||9)),names=[];
  for(let i=1;i<=n;i++)names.push(String(i));
  act.forEach(o=>{const k=tkey(o.tbl);if(!names.includes(k))names.push(k)});
  const LT=locTbl();LT.forEach(x=>{const k=tkey(x.tbl);if(!names.includes(k))names.push(k)});
  const lt=k=>LT.filter(x=>tkey(x.tbl)===k);
  const by=k=>act.filter(o=>tkey(o.tbl)===k);
  const st=k=>{const a=by(k),l=lt(k);return(a.some(o=>o.status==='accepted')||l.some(x=>x.kind==='occ'))?'p':(a.length||l.length)?'n':(window.P2&&P2.rsvFor(k).length?'r':'f')};
  const c={f:0,n:0,p:0,r:0};names.forEach(k=>c[st(k)]++);
  const lbl={f:'Kosong',n:'Baru · belum bayar',p:'Diproses',r:'Dipesan'};
  const rv=k=>{const q=window.P2?P2.rsvFor(k)[0]:null;return q?'<small>'+new Date(q.t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')+' · '+esc(q.name)+'</small>':''};
  const paid=o=>o.pst===2,pl=k=>{const a=by(k),l=lt(k);if(!a.length&&!l.length)return '';return(a.every(paid)&&!l.some(x=>x.kind==='hold'))?'Sudah bayar':'Belum bayar'};
  el.innerHTML=`
  <div class="hm-h"><div><h2>Meja</h2></div>
    ${isOwner()||can('set')?`<span class="stp">Jumlah meja <button onclick="tblStep(-1)" aria-label="Kurangi">−</button>${n}<button onclick="tblStep(1)" aria-label="Tambah">+</button></span>`:''}</div>
  <div class="tbg">
    <div class="panel"><div class="tbs">${names.map(k=>{const s=st(k),a=by(k),l=lt(k);return`<button type="button" class="tbc ${s==='f'?'':s}" onclick="tblOpen('${esc(k).replace(/'/g,"\\'")}')"><b>${esc(k)}</b><small>${s==='p'?'Diproses · '+pl(k):lbl[s]}</small>${rv(k)}${l.length&&!a.length?`<small>${l.length} pesanan kasir${[...new Set(l.map(x=>x.by).filter(Boolean))].length?' · '+esc([...new Set(l.map(x=>x.by).filter(Boolean))].join(', ')):''}</small>`:''}${a.length?`<small>${a.length} pesanan${[...new Set(a.map(o=>o.by).filter(Boolean))].length?' · '+esc([...new Set(a.map(o=>o.by).filter(Boolean))].join(', ')):''}</small>`:''}</button>`}).join('')}</div>
      <div class="tlg"><span><i style="background:#6fd6a0"></i>Kosong: ${c.f}</span><span><i style="background:#f7c244"></i>Pesanan baru: ${c.n}</span><span><i style="background:var(--b)"></i>Diproses: ${c.p}</span><span><i style="background:#60a5fa"></i>Dipesan: ${c.r}</span></div></div>
    <div class="panel"><h3>Pesanan Aktif</h3>${act.length?act.map(o=>`<button class="li" onclick="coDet(${o.id})"><span class="l"><b>Meja ${esc(o.tbl)} · ${esc(o.name)}</b><small>${o.lines.reduce((a,l)=>a+l.qty,0)} item · ${esc(ago(o.t))}${o.by?' · '+esc(o.by):''}</small></span><span class="r"><b>${money(o.total)}</b><small>${o.status==='new'?'baru':'diproses'}</small></span><span class="ch">›</span></button>`).join(''):'<div class="mt">Belum ada pesanan online aktif dengan nomor meja.</div>'}${LT.map(x=>`<button class="li" onclick="tblOpen('${esc(tkey(x.tbl)).replace(/'/g,"\\'")}')"><span class="l"><b>Meja ${esc(x.tbl)} · ${esc(x.cust||'Kasir')}</b><small>${x.kind==='hold'?x.n+' item · ditahan':esc(x.no)} · ${esc(ago(x.t))}${x.by?' · '+esc(x.by):''}</small></span><span class="r"><b>${money(x.total)}</b><small>${x.kind==='hold'?'belum bayar':'sudah bayar'}</small></span><span class="ch">›</span></button>`).join('')}</div>
  </div>`;
}

async function tblClear(k){
  const a=(CO.list||[]).filter(o=>tkey(o.tbl)===tkey(k)&&(o.status==='new'||o.status==='accepted'));const oc=(db.occ||[]).filter(x=>!x.del&&tkey(x.tbl)===tkey(k));
  if(!a.length){if(oc.length&&confirm('Pelanggan di meja '+k+' sudah pergi? Meja jadi kosong.')){oc.forEach(x=>{x.del=1;x.u=Date.now()});save();toast('Meja '+k+' dikosongkan');renderTable()}closeModal();return}
  const unp=a.filter(o=>o.pst!==2),tot=unp.reduce((x,o)=>x+o.total,0);
  if(unp.length&&!can('pos')){toast('Ada pesanan belum dibayar, minta kasir');return}
  const msg=unp.length?'Meja '+k+' dikosongkan.\n\n'+unp.length+' pesanan BELUM DIBAYAR ('+money(tot)+') akan dibatalkan dan tidak masuk penjualan. Lanjutkan?':'Pelanggan di meja '+k+' sudah pergi? Pesanan ditandai selesai dan meja jadi kosong.';
  if(!confirm(msg))return;
  let ok=true;for(const o of a){const r=await coAct(o.id,o.pst===2?'done':'cancel');if(!r)ok=false}
  oc.forEach(x=>{x.del=1;x.u=Date.now()});if(oc.length)save();
  closeModal();toast(ok?'Meja '+k+' dikosongkan':'Sebagian pesanan gagal diubah');
  try{const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}}catch(e){}
  if(S.view==='table')renderTable();
}
function tblOpen(k){
  const a=(CO.list||[]).filter(o=>tkey(o.tbl)===tkey(k)&&(o.status==='new'||o.status==='accepted')),tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  const sl=o=>o.status==='new'?'Menunggu diterima':'Sedang diproses',pay=o=>o.pst===2?'Sudah bayar':'Belum bayar';
  const lc=locTbl(k);
  openModal(`<h3>Meja ${esc(k)}</h3>`+(a.length||lc.length?lc.map(x=>`<div class="tbo"><div class="tbh"><b>${x.kind==='hold'?'Pesanan ditahan':esc(x.no)}${x.cust?' · '+esc(x.cust):''}</b><span class="pst ${x.kind==='occ'?'ok':'w'}">${x.kind==='occ'?'Sudah bayar':'Belum bayar'}</span></div><small>Kasir: <b>${esc(x.by||'-')}</b> · ${tm(x.t)}</small><div class="tbt"><span>Total</span><b>${money(x.total)}</b></div>${x.kind==='hold'&&ORDELA_APP_MODE==='pos'&&can('pos')?'<button class="btn sec" onclick="closeModal();holdList()">Buka pesanan ditahan</button>':''}</div>`).join('')+a.map(o=>`<div class="tbo"><div class="tbh"><b>${esc(o.num)} · ${esc(o.name)}</b><span class="pst ${o.pst===2?'ok':'w'}">${pay(o)}</span></div>
    <small>${sl(o)} · ${tm(o.t)} · Dilayani: <b>${o.by?esc(o.by):'Pelanggan (pesan sendiri)'}</b></small>
    <div class="tbl">${o.lines.map(l=>`<div><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>`).join('')}</div>
    ${o.note?`<small>Catatan: ${esc(o.note)}</small>`:''}<div class="tbt"><span>Total</span><b>${money(o.total)}</b></div>
    <button class="btn sec" onclick="closeModal();coDet(${o.id})">Detail pesanan</button></div>`).join(''):'<p class="hint">Meja ini kosong, belum ada pesanan aktif.</p>')
  +((a.length||lc.some(x=>x.kind==='occ'))&&(can('co')||can('pos'))?(a.every(o=>o.pst===2)||can('pos')?`<button class="btn sec" onclick="tblClear('${esc(k).replace(/'/g,"\\'")}')"><i class="ic" data-ic="check"></i>Kosongkan Meja ${esc(k)}</button>`:'<p class="hint">Ada pesanan belum dibayar. Hanya kasir yang bisa mengosongkan meja ini.</p>'):'')
  +(can('co')?`<button class="btn" onclick="closeModal();noOpen('${esc(k).replace(/'/g,"\\'")}')">+ Ambil Pesanan di Meja ${esc(k)}</button>`:'')+`<button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
/* ---------- Notifikasi ---------- */
function renderAlert(){
  const el=$('#alertBox');if(!el)return;
  const f=[],lowN=+db.set.low||5;
  (typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>o.status==='new').forEach(o=>f.push({t:o.t,k:'warn',ic:'!',h:'Pesanan online '+esc(o.num)+' dari '+esc(o.name),s:o.lines.map(x=>x.qty+'× '+esc(x.name)).join(', '),amt:money(o.total),go:'co'}));
  db.items.filter(i=>(+i.stock||0)<=Math.max(0,+i.min>=0?+i.min:lowN)).slice(0,8).forEach(i=>f.push({t:null,k:(+i.stock||0)<=0?'bad':'warn',ic:(+i.stock||0)<=0?'×':'!',h:esc(i.name)+((+i.stock||0)<=0?' habis':' stok menipis'),s:'Sisa stok: '+(+i.stock||0),go:'inv'}));
  db.orders.slice(0,12).forEach(o=>f.push({t:o.t,k:'ok',ic:'✓',h:'Pesanan '+esc(o.no)+' berhasil dibayar',s:esc(o.method)+' · '+esc(o.type)+(o.tbl?' · Meja '+esc(o.tbl):''),amt:money(o.total),o}));
  (db.voided||[]).slice(0,5).forEach(v=>f.push({t:v.at||v.t,k:'bad',ic:'×',h:'Transaksi '+esc(v.no)+' dibatalkan',s:'oleh '+esc(v.by||'-'),amt:money(v.total)}));
  f.sort((a,b)=>(b.t?+new Date(b.t):9e15)-(a.t?+new Date(a.t):9e15));
  el.innerHTML=`<div class="bar"><h2><i class="ic" data-ic="bell"></i>Notifikasi</h2></div>
  <div class="panel">${f.length?f.map(x=>`<div class="al"><span class="ai ${x.k}">${x.ic}</span><div class="am"><b>${x.h}</b><small>${x.s||''}</small>${x.o?`<details><summary>Lihat detail</summary><div class="dtl">${x.o.lines.map(l=>`<div><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>`).join('')}</div></details>`:''}${x.go?`<button class="go" onclick="go('${x.go}')">Buka ›</button>`:''}</div><div class="ar">${x.amt?'<b>'+x.amt+'</b>':''}${x.t?esc(ago(x.t)):''}</div></div>`).join(''):'<div class="mt">Belum ada notifikasi.</div>'}</div>`;
}
function railBrand(){
  const e=$('#railLogo'),s=db.set;if(!e)return;
  e.innerHTML=s.logo&&s.logoApp!==false&&imgSrc(s.logo)?'<img alt="" src="'+imgSrc(s.logo)+'">':'<i class="ic solo" data-ic="food"></i>';
}
setInterval(()=>{if(document.hidden)return;if(S.view==='home'){const ae=document.activeElement;if(!(ae&&ae.tagName==='INPUT'&&ae.closest&&ae.closest('#homeBox')))renderHome()}else if(S.view==='table')renderTable();else if(S.view==='alert')renderAlert()},15000);
applyBrand();
tick();go(matchMedia('(min-width:701px)').matches?'home':'pos');initI18n();dbBoot();cloudStart();coStart();applyAccess();bleAutoSoon(1200);
