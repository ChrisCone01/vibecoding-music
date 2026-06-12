const http=require('http');
const fs=require('fs');
const key=fs.readFileSync('ncm_qrkey.txt','utf8').trim();
function get(p){return new Promise(r=>{http.get('http://127.0.0.1:3000'+p,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({body:d,headers:res.headers}));}).on('error',e=>r({body:JSON.stringify({err:String(e)})}));});}
(async()=>{
  const res=await get('/login/qr/check?key='+key+'&timestamp='+Date.now());
  let j={}; try{j=JSON.parse(res.body);}catch(e){}
  console.log('code='+j.code+' msg='+(j.message||''));
  // code: 800=过期 801=待扫 802=待确认 803=成功
  if(j.code===803){
    const cookie=j.cookie||'';
    fs.writeFileSync('ncm_cookie.txt', cookie);
    console.log('LOGIN_OK cookie_len='+cookie.length);
    // 验证登录账号
    const acc=await get('/user/account?timestamp='+Date.now()+'&cookie='+encodeURIComponent(cookie));
    try{const a=JSON.parse(acc.body); const p=a.profile||{}; const vip=(a.account||{}).vipType; console.log('account: '+(p.nickname||'?')+'  vipType='+vip+' (0=无VIP, 11=黑胶)');}catch(e){console.log('acc parse fail');}
  }
})();
