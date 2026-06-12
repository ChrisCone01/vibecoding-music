const http=require('http');
const fs=require('fs');
function get(p){return new Promise(r=>{http.get('http://127.0.0.1:3000'+p,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(d));}).on('error',e=>r(JSON.stringify({err:String(e)})));});}
(async()=>{
  const k=JSON.parse(await get('/login/qr/key?timestamp='+Date.now()));
  const key=k.data&&k.data.unikey;
  if(!key){console.log('KEYFAIL '+JSON.stringify(k).slice(0,200));return;}
  fs.writeFileSync('ncm_qrkey.txt', key);
  const q=JSON.parse(await get('/login/qr/create?key='+key+'&qrimg=true&timestamp='+Date.now()));
  const img=q.data&&q.data.qrimg;
  if(!img){console.log('QRFAIL '+JSON.stringify(q).slice(0,200));return;}
  fs.writeFileSync('ncm_login_qr.png', Buffer.from(img.split(',')[1],'base64'));
  console.log('OK key='+key);
})();
