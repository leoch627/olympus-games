const W = 8, H = 8;
const SAVE_KEY = 'olympus_games_save_v1';

const QUESTIONS = [
  { q: '雅典娜象征什么', a: ['智慧', '智慧与战争'] },
  { q: '阿波罗常关联哪项', a: ['艺术', '音乐', '光明'] },
  { q: '赫尔墨斯常见职能', a: ['传信', '商旅', '信使'] },
  { q: '狄俄尼索斯相关主题', a: ['酒神', '狂欢'] },
];

const basePlayer = () => ({
  x: 0, y: 0,
  str: 20, agi: 20, con: 20, wis: 20, ins: 20,
  hp: 100, fame: 0,
  blessing: 'none',
  apolloReroll: 0,
});

const state = {
  player: basePlayer(),
  exit: { x: 7, y: 7 },
  events: new Map(),
  over: false,
  floor: 1,
};

function roll(n = 100) { return Math.floor(Math.random() * n) + 1; }
function key(x, y) { return `${x},${y}`; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function log(msg) {
  const box = document.getElementById('log');
  box.innerHTML = `<div>• ${msg}</div>` + box.innerHTML;
}

function initEvents() {
  state.events.clear();
  const pool = ['enemy', 'enemy', 'enemy', 'enemy', 'knowledge', 'knowledge', 'rest', 'shrine'];
  for (let i = 0; i < 14; i++) {
    const x = roll(W) - 1, y = roll(H) - 1;
    if ((x === 0 && y === 0) || (x === state.exit.x && y === state.exit.y)) continue;
    if (state.events.has(key(x, y))) continue;
    state.events.set(key(x, y), pool[roll(pool.length) - 1]);
  }
}

function renderStats() {
  const p = state.player;
  const el = document.getElementById('stats');
  const items = [
    ['楼层', state.floor], ['祝福', p.blessing], ['生命', p.hp], ['名声', p.fame],
    ['力量', p.str], ['敏捷', p.agi], ['体质', p.con], ['智慧', p.wis], ['灵感', p.ins],
    ['Apollo重掷', p.apolloReroll], ['位置', `${p.x + 1},${p.y + 1}`]
  ];
  el.innerHTML = items.map(([k, v]) => `<div class="stat">${k}: ${v}</div>`).join('');
}

function renderMaze() {
  const p = state.player;
  const el = document.getElementById('maze');
  let html = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let cls = 'cell', text = '';
      if (x === state.exit.x && y === state.exit.y) { cls += ' exit'; text = '出口'; }
      const e = state.events.get(key(x, y));
      if (e === 'enemy') { cls += ' enemy'; text = '敌'; }
      if (e === 'knowledge') { cls += ' knowledge'; text = '知'; }
      if (e === 'rest') { cls += ' rest'; text = '休'; }
      if (e === 'shrine') { cls += ' shrine'; text = '神'; }
      if (x === p.x && y === p.y) { cls += ' player'; text = '你'; }
      html += `<div class="${cls}">${text}</div>`;
    }
  }
  el.innerHTML = html;
}

function applyBlessing(name, duringBoot = false) {
  const p = state.player;
  if (!duringBoot) {
    // reset to baseline then re-apply selected blessing
    const hpKeep = p.hp, fameKeep = p.fame, pos = { x: p.x, y: p.y };
    state.player = { ...basePlayer(), hp: hpKeep, fame: fameKeep, x: pos.x, y: pos.y, blessing: 'none' };
  }
  const pp = state.player;
  pp.blessing = name;
  if (name === 'Hermes') pp.agi += 5;
  if (name === 'Athena') pp.wis += 5;
  if (name === 'Chaos') { pp.str += 2; pp.agi += 2; pp.con += 2; pp.wis += 2; pp.ins += 2; }
  if (name === 'Apollo') { pp.ins += 5; pp.apolloReroll = 1; }
  if (name === 'Dionysus') pp.ins += 5;
  if (name === 'Hestia') pp.con += 5;
  if (name === 'Artemis') pp.str += 5;
  log(`你获得了 ${name} 的祝福`);
  renderStats();
}

function combat() {
  const p = state.player;
  const enemyType = roll(100) <= 45 ? 'beast' : 'hero';
  let enemy = { str: 16 + roll(12), agi: 16 + roll(12), con: 16 + roll(12), hp: 55 + roll(30) };

  if (p.blessing === 'Athena') {
    const t = ['str', 'agi', 'con'][roll(3) - 1];
    enemy[t] = Math.round(enemy[t] * 0.9);
    log(`Athena 洞悉弱点：敌方${t} -10%`);
  }

  const main = ['str', 'agi', 'wis', 'ins'][roll(4) - 1];
  const pAvg = (p.str + p.agi + p.con + p.wis + p.ins) / 5;
  const eAvg = (enemy.str + enemy.agi + enemy.con + enemy.str + enemy.agi) / 5;
  const baseRoll = roll(100);
  const chaosSwing = p.blessing === 'Chaos' ? (roll(21) - 11) : 0;
  let r = baseRoll + (p[main] - enemy[main]) * 0.6 + (pAvg - eAvg) * 0.4 + chaosSwing;

  if (p.blessing === 'Apollo' && p.apolloReroll > 0 && r < 40) {
    p.apolloReroll -= 1;
    const reroll = roll(100);
    r = reroll + (p[main] - enemy[main]) * 0.6 + (pAvg - eAvg) * 0.4 + chaosSwing;
    log(`Apollo 触发重掷：新骰值 ${Math.round(r)}`);
  }

  r = clamp(Math.round(r), 1, 100);
  let mult = 0, tag = '失误';
  if (r === 100) { mult = 3; tag = '大成功'; }
  else if (r >= 86) { mult = 2; tag = '直击要害'; }
  else if (r >= 51) { mult = 1; tag = '成功命中'; }
  else if (r >= 26) { mult = 0.5; tag = '擦伤'; }
  else if (r === 1) { mult = -0.6; tag = '大失败'; }

  const critMin = p.blessing === 'Dionysus' ? 90 : 95;
  let extraCrit = (r >= critMin) ? 1.5 : 1;
  let base = p[main] * 0.6 + ((p.str + p.agi + p.con + p.wis + p.ins - p[main]) / 4) * 0.4;
  if (p.blessing === 'Artemis' && enemyType === 'beast') base *= 1.2;

  let dmg = Math.round(base * mult * extraCrit - enemy.con / 3);
  if (mult < 0) {
    p.hp += dmg;
    log(`大失败(骰:${r})，你自伤 ${Math.abs(dmg)} HP`);
  } else if (dmg <= 0) {
    log(`战斗结果 ${tag}(骰:${r})，未造成有效伤害`);
  } else {
    enemy.hp -= dmg;
    log(`战斗结果 ${tag}(骰:${r})，对${enemyType === 'beast' ? '魔兽' : '英雄'}造成 ${dmg} 伤害`);
  }

  if (p.hp <= 0) { state.over = true; p.hp = 0; log('你倒下了，进入冥界，游戏结束'); return; }

  if (enemy.hp <= 0) {
    p.fame += 3;
    log('你战胜敌人，名声 +3');
  } else {
    const back = Math.max(1, Math.round(enemy.str * 0.4 - enemy.con / 6));
    p.hp -= back;
    log(`敌方反击造成 ${back} 伤害`);
    if (p.hp <= 0) { state.over = true; p.hp = 0; log('你倒下了，进入冥界，游戏结束'); }
  }
}

function knowledgeEvent() {
  const p = state.player;
  const q = QUESTIONS[roll(QUESTIONS.length) - 1];
  const ans = prompt(`知识试炼：${q.q}\n请输入答案`) || '';
  const ok = q.a.some(x => ans.includes(x));
  if (ok) {
    const gain = roll(2) === 1 ? 'wis' : 'ins';
    const v = 1 + (roll(2) - 1);
    p[gain] += v;
    log(`答对了，${gain === 'wis' ? '智慧' : '灵感'} +${v}`);
  } else {
    log('答案不完整，本次未获得属性奖励');
  }
}

function restEvent() {
  const p = state.player;
  let recover = Math.round(15 + p.con * 0.4);
  if (p.blessing === 'Hestia') recover += 15;
  p.hp = clamp(p.hp + recover, 0, 140);
  log(`你在营地休整，恢复 ${recover} HP`);
}

function shrineEvent() {
  const p = state.player;
  const opts = ['str', 'agi', 'con', 'wis', 'ins'];
  const t = opts[roll(opts.length) - 1];
  const inc = 2 + (roll(2) - 1);
  p[t] += inc;
  p.fame += 1;
  log(`神龛赐福：${t} +${inc}，名声 +1`);
}

function nextFloor() {
  state.floor += 1;
  state.player.x = 0;
  state.player.y = 0;
  state.player.fame += 5;
  state.over = false;
  initEvents();
  log(`进入第 ${state.floor} 层，名声 +5`);
}

function triggerCell() {
  const p = state.player;
  if (p.x === state.exit.x && p.y === state.exit.y) {
    nextFloor();
    renderStats(); renderMaze();
    return;
  }

  const k = key(p.x, p.y);
  const e = state.events.get(k);
  if (!e) return;
  if (e === 'enemy') combat();
  if (e === 'knowledge') knowledgeEvent();
  if (e === 'rest') restEvent();
  if (e === 'shrine') shrineEvent();
  state.events.delete(k);
}

function move(dx, dy) {
  if (state.over) return;
  const p = state.player;
  const nx = p.x + dx, ny = p.y + dy;
  if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
  p.x = nx; p.y = ny;

  if (p.blessing === 'Hermes' && roll(100) <= p.agi) {
    p.fame += 1;
    log('Hermes 诡诈成功，名声 +1');
  }

  triggerCell();
  renderStats(); renderMaze();
}

function saveGame() {
  const data = {
    player: state.player,
    exit: state.exit,
    floor: state.floor,
    over: state.over,
    events: Array.from(state.events.entries()),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  log('已保存到本地存档');
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { log('没有可用存档'); return; }
  try {
    const data = JSON.parse(raw);
    state.player = data.player;
    state.exit = data.exit;
    state.floor = data.floor;
    state.over = data.over;
    state.events = new Map(data.events || []);
    log('已读取本地存档');
    renderStats(); renderMaze();
  } catch {
    log('存档损坏，读取失败');
  }
}

function bind() {
  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.onclick = () => {
      const m = btn.dataset.move;
      if (m === 'up') move(0, -1);
      if (m === 'down') move(0, 1);
      if (m === 'left') move(-1, 0);
      if (m === 'right') move(1, 0);
    };
  });

  document.getElementById('reset').onclick = boot;
  document.getElementById('save').onclick = saveGame;
  document.getElementById('load').onclick = loadGame;
  document.getElementById('applyBlessing').onclick = () => {
    const val = document.getElementById('blessingSelect').value;
    applyBlessing(val);
  };

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') move(0, -1);
    if (e.key === 'ArrowDown') move(0, 1);
    if (e.key === 'ArrowLeft') move(-1, 0);
    if (e.key === 'ArrowRight') move(1, 0);
  });
}

function boot() {
  state.player = basePlayer();
  state.floor = 1;
  state.over = false;
  state.exit = { x: 7, y: 7 };
  initEvents();
  document.getElementById('log').innerHTML = '';
  log('游戏开始：移动到出口，触发事件并成长');
  renderStats(); renderMaze();
}

bind();
boot();
