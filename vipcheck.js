const http=require('http');
const songs={1:[2085859568,'LET ME LUV U'],12:[2656164256,'冷色晚风'],14:[2062751869,'Scared 2 Be Lonely'],17:[1409329965,'Manta'],6:[3382153693,'National Treasures(对照)']};
function get(p){return new Promise(r=>{http.get('http://127.0.0.1:8080'+p,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(d));}).on('error',()=>r(''));});}
(async()=>{
  for(const n of Object.keys(songs)){
    const [id,name]=songs[n];
    let u={};
    try{ u=JSON.parse(await get('/ncm/api/song/url/v1?id='+id+'&level=exhigh')).data[0]||{}; }catch(e){}
    const trial=!!u.freeTrialInfo;
    console.log(`${name}\t可播${Math.round((u.time||0)/1000)}s\t${trial?'⚠还是试听':'✅整首解锁'}\t码率${Math.round((u.br||0)/1000)}kbps`);
  }
})();
