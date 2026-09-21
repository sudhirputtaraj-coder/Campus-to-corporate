/** One-column CSV, preserving leading zeros in register numbers. */
export function parsePlacementCsv(input:string):string[]{
  if(typeof input!=='string'||input.length>50000)throw Error('Use a CSV smaller than 50 KB.');
  const text=input.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false;let closed=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=ch;continue;}
    if(ch==='"'){if(field||closed)throw Error('Invalid CSV quoting. Use the template.');quoted=true;continue;}
    if(ch===','||ch==='\r'||ch==='\n'){row.push(field);field='';closed=false;if(ch!==','){if(row.some(v=>v.trim()))rows.push(row);row=[];if(ch==='\r'&&text[i+1]==='\n')i++;}}
    else{if(closed)throw Error('Invalid text after a quoted value.');field+=ch;}
  }
  if(quoted)throw Error('Incomplete quoted value.');row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  if(rows[0]?.length!==1||rows[0][0].trim()!=='register_number')throw Error('The header must be register_number, with only one column.');
  const data=rows.slice(1);if(!data.length||data.length>100)throw Error('Include 1 to 100 students per file.');
  if(data.some(r=>r.length!==1||!r[0].trim()||r[0].trim().length>80||/[\r\n\x00]/.test(r[0])))throw Error('Each row must contain one register number of 1 to 80 characters.');
  const registers=data.map(r=>r[0].trim());if(new Set(registers).size!==registers.length)throw Error('Remove duplicate register numbers.');return registers;
}
