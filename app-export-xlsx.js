/* Standalone XLSX generation utilities shared by POS and Business. */
(function (window) {
  'use strict';
  function crc32(u){let t=crc32.t;if(!t){t=crc32.t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}let r=0xFFFFFFFF;for(let i=0;i<u.length;i++)r=t[(r^u[i])&255]^(r>>>8);return(r^0xFFFFFFFF)>>>0}
  function zipStore(files){
    const enc=new TextEncoder(),u16=n=>[n&255,(n>>8)&255],u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255],parts=[],cd=[];let off=0;
    for(const f of files){
      const nm=enc.encode(f.name),d=enc.encode(f.text),crc=crc32(d),sz=d.length;
      const lh=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(sz),...u32(sz),...u16(nm.length),...u16(0),...nm]);
      cd.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(sz),...u32(sz),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off),...nm]));
      parts.push(lh,d);off+=lh.length+sz;
    }
    const cdl=cd.reduce((a,x)=>a+x.length,0);
    return new Blob([...parts,...cd,new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdl),...u32(off),0,0])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function xlsxBuild(sheets,dec){
    const X=v=>String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26}return s};
    const sheetXml=sh=>{
      const rows=sh.rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((c,ci)=>{
        const ref=col(ci)+(ri+1);if(c==null||c==='')return'';
        if(typeof c==='object'&&c.f)return`<c r="${ref}" s="3"><f>${X(c.f)}</f><v>${c.v}</v></c>`;
        if(typeof c==='number')return`<c r="${ref}" s="2"><v>${c}</v></c>`;
        const st=(sh.head&&ri===0)||(typeof c==='object'&&c.b)?' s="1"':'';
        return`<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${X(typeof c==='object'?c.t:c)}</t></is></c>`;
      }).join('')+'</row>').join('');
      return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${sh.head?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':''}</sheetView></sheetViews><cols>${sh.w.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`;
    };
    const nf=dec>0?'#,##0.'+'0'.repeat(dec):'#,##0';
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="${nf}"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE9D6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const files=[
      {name:'[Content_Types].xml',text:H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'},
      {name:'_rels/.rels',text:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',text:H+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((sh,i)=>`<sheet name="${X(sh.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'},
      {name:'xl/_rels/workbook.xml.rels',text:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
      {name:'xl/styles.xml',text:styles},
      ...sheets.map((sh,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,text:sheetXml(sh)}))];
    return zipStore(files);
  }
  window.OrdelaXlsx = Object.freeze({ crc32, zipStore, build: xlsxBuild });
})(window);
