const W = 8, H = 8;
const state = {
  player: { x: 0, y: 0, str: 20, agi: 20, con: 20, wis: 20, ins: 20, hp: 100, fame: 0 },
  exit: { x: 7, y: 7 },
  events: new Map(),
  over: false,
};

function roll(n=100){ return Math.floor(Math.random()*n)+1; }
function key(x,y){ return `${x},${y}`; }

function initEvents(){
  state.events.clear();
  for(let i=0;i<9;i++){
    const x=roll(W)-1,y=roll(H)-1;
    if((x===0&&y===0)||(x===7&&y===7)) continue;
    const t = i<5?'enemy':'knowledge';
    state.events.set(key(x,y), t);
  }
}

function log(msg){
  const box=document.getElementById('log');
  box.innerHTML = `<div>• ${msg}</div>` + box.innerHTML;
}

function renderStats(){
  const p=state.player;
  const el=document.getElementById('stats');
  const items=[['力量',p.str],['敏捷',p.agi],['体质',p.con],['智慧',p.wis],['灵感',p.ins],['生命',p.hp],['名声',p.fame],['位置',`${p.x+1},${p.y+1}`]];
  el.innerHTML=items.map(([k,v])=>`<div class="stat">${k}: ${v}</div>`).join('');
}

function renderMaze(){
  const p=state.player;
  const el=document.getElementById('maze');
  let html='';
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    let cls='cell', text='';
    if(x===state.exit.x&&y===state.exit.y){ cls+=' exit'; text='出口'; }
    const e=state.events.get(key(x,y));
    if(e==='enemy'){ cls+=' enemy'; text='敌'; }
    if(e==='knowledge'){ cls+=' knowledge'; text='知'; }
    if(x===p.x&&y===p.y){ cls+=' player'; text='你'; }
    html += `<div class="${cls}">${text}</div>`;
  }
  el.innerHTML=html;
}

function battle(){
  const p=state.player;
  const enemy={str:16+roll(12),agi:16+roll(12),con:16+roll(12),hp:55+roll(30)};
  const main=['str','agi','wis','ins'][roll(4)-1];
  const pAvg=(p.str+p.agi+p.con+p.wis+p.ins)/5;
  const eAvg=(enemy.str+enemy.agi+enemy.con+enemy.agi+enemy.str)/5;
  let r=roll(100) + (p[main]-enemy[main])*0.6 + (pAvg-eAvg)*0.4;
  r=Math.max(1,Math.min(100,Math.round(r)));

  let mult=0, tag='失误';
  if(r===100){mult=3;tag='大成功';}
  else if(r>=86){mult=2;tag='直击要害';}
  else if(r>=51){mult=1;tag='成功命中';}
  else if(r>=26){mult=0.5;tag='擦伤';}
  else if(r===1){mult=-0.6;tag='大失败';}

  const base = p[main]*0.6 + ((p.str+p.agi+p.con+p.wis+p.ins-p[main])/4)*0.4;
  const dmg = Math.round(base*mult - enemy.con/3);

  if(mult<0){
    p.hp += dmg; // dmg negative
    log(`战斗大失败(骰:${r})，你自伤 ${Math.abs(dmg)} HP`);
  } else if(dmg<=0){
    log(`战斗结果 ${tag}(骰:${r})，未造成有效伤害`);
  } else {
    enemy.hp -= dmg;
    log(`战斗结果 ${tag}(骰:${r})，造成 ${dmg} 伤害`);
  }

  if(p.hp<=0){
    state.over=true; p.hp=0;
    log('你倒下了，进入冥界，游戏结束');
    return;
  }

  if(enemy.hp<=0){
    p.fame += 3;
    log('你战胜敌人，名声 +3');
  } else {
    const back = Math.max(1,Math.round(enemy.str*0.4-enemy.con/6));
    p.hp -= back;
    log(`敌方反击造成 ${back} 伤害`);
    if(p.hp<=0){ state.over=true; p.hp=0; log('你倒下了，进入冥界，游戏结束'); }
  }
}

function knowledge(){
  const p=state.player;
  const gain = roll(2)===1?'wis':'ins';
  const v = 1 + (roll(2)-1);
  p[gain]+=v;
  log(`你通过知识试炼，${gain==='wis'?'智慧':'灵感'} +${v}`);
}

function move(dx,dy){
  if(state.over) return;
  const p=state.player;
  const nx=p.x+dx, ny=p.y+dy;
  if(nx<0||ny<0||nx>=W||ny>=H) return;
  p.x=nx; p.y=ny;

  if(nx===state.exit.x&&ny===state.exit.y){
    p.fame += 5;
    log('你抵达出口，进入下一层（MVP先到此） 名声 +5');
    state.over=true;
  }

  const k=key(nx,ny);
  const e=state.events.get(k);
  if(e==='enemy'){ battle(); state.events.delete(k); }
  if(e==='knowledge'){ knowledge(); state.events.delete(k); }

  renderStats(); renderMaze();
}

function bind(){
  document.querySelectorAll('[data-move]').forEach(btn=>{
    btn.onclick=()=>{
      const m=btn.dataset.move;
      if(m==='up') move(0,-1);
      if(m==='down') move(0,1);
      if(m==='left') move(-1,0);
      if(m==='right') move(1,0);
    };
  });
  document.getElementById('reset').onclick=boot;
  window.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp') move(0,-1);
    if(e.key==='ArrowDown') move(0,1);
    if(e.key==='ArrowLeft') move(-1,0);
    if(e.key==='ArrowRight') move(1,0);
  });
}

function boot(){
  state.player={ x:0,y:0,str:20,agi:20,con:20,wis:20,ins:20,hp:100,fame:0 };
  state.over=false;
  initEvents();
  document.getElementById('log').innerHTML='';
  log('游戏开始：探索迷宫，触发事件，抵达出口');
  renderStats(); renderMaze();
}

bind();
boot();
