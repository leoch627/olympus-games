const W = 10, H = 10;
const SAVE_KEY = 'olympus_games_save_v2';

const QUIZ_BANK = [
  { q: '哪位神祇将火种盗予人类', options: ['普罗米修斯', '赫菲斯托斯', '宙斯', '阿瑞斯'], answer: 0, reward: 'wis' },
  { q: '赫尔墨斯常见职能是', options: ['信使与商旅', '海洋统治', '冥界审判', '战争神谕'], answer: 0, reward: 'ins' },
  { q: '雅典娜主要象征', options: ['丰收', '智慧与战略', '狩猎', '狂欢'], answer: 1, reward: 'wis' },
  { q: '阿波罗常关联', options: ['光明与艺术', '海啸', '冥界', '偷盗'], answer: 0, reward: 'ins' },
];

const basePlayer = () => ({
  name: 'xxxx', x: 0, y: 0,
  str: 20, agi: 20, con: 20, wis: 20, ins: 20,
  hp: 100, fame: 0,
  blessing: 'none',
  apolloReroll: 0,
});

const state = {
  player: basePlayer(),
  floor: 1,
  over: false,
  exit: { x: W - 1, y: H - 1 },
  events: new Map(),
  mazeWalls: [],
};

const battleModal = () => document.getElementById('battleModal');
const quizModal = () => document.getElementById('quizModal');

function roll(n = 100) { return Math.floor(Math.random() * n) + 1; }
function key(x, y) { return `${x},${y}`; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function log(msg) {
  const box = document.getElementById('log');
  box.innerHTML = `<div>• ${msg}</div>` + box.innerHTML;
}

function initMazeWalls() {
  state.mazeWalls = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ n: true, e: true, s: true, w: true, visited: false }))
  );

  const stack = [{ x: 0, y: 0 }];
  state.mazeWalls[0][0].visited = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = [];
    if (cur.y > 0 && !state.mazeWalls[cur.y - 1][cur.x].visited) dirs.push({ d: 'n', x: cur.x, y: cur.y - 1 });
    if (cur.x < W - 1 && !state.mazeWalls[cur.y][cur.x + 1].visited) dirs.push({ d: 'e', x: cur.x + 1, y: cur.y });
    if (cur.y < H - 1 && !state.mazeWalls[cur.y + 1][cur.x].visited) dirs.push({ d: 's', x: cur.x, y: cur.y + 1 });
    if (cur.x > 0 && !state.mazeWalls[cur.y][cur.x - 1].visited) dirs.push({ d: 'w', x: cur.x - 1, y: cur.y });

    if (!dirs.length) { stack.pop(); continue; }
    const nxt = dirs[roll(dirs.length) - 1];

    const a = state.mazeWalls[cur.y][cur.x];
    const b = state.mazeWalls[nxt.y][nxt.x];
    if (nxt.d === 'n') { a.n = false; b.s = false; }
    if (nxt.d === 'e') { a.e = false; b.w = false; }
    if (nxt.d === 's') { a.s = false; b.n = false; }
    if (nxt.d === 'w') { a.w = false; b.e = false; }

    b.visited = true;
    stack.push({ x: nxt.x, y: nxt.y });
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) delete state.mazeWalls[y][x].visited;
}

function initEvents() {
  state.events.clear();
  const pool = ['enemy', 'enemy', 'enemy', 'knowledge', 'knowledge', 'rest', 'shrine'];
  for (let i = 0; i < 24; i++) {
    const x = roll(W) - 1, y = roll(H) - 1;
    if ((x === 0 && y === 0) || (x === state.exit.x && y === state.exit.y)) continue;
    if (state.events.has(key(x, y))) continue;
    state.events.set(key(x, y), pool[roll(pool.length) - 1]);
  }
}

function renderStats() {
  const p = state.player;
  const top = document.getElementById('topMeta');
  const info = document.getElementById('playerInfo');
  const quick = document.getElementById('quickActions');

  top.innerHTML = `
    <span>【第${state.floor}层】</span>
    <span>【名声${p.fame}】</span>
    <span>【设置】</span>
    <span>【帮助】</span>
  `;

  info.textContent = [
    `姓名：${p.name}`,
    `[生命] ${p.hp}   [力量] ${p.str}`,
    `[体质] ${p.con}   [敏捷] ${p.agi}`,
    `[智慧] ${p.wis}   [灵感] ${p.ins}`,
    `[位置] ${p.x + 1},${p.y + 1}`,
    `[祝福] ${p.blessing}`,
  ].join('\n');

  quick.textContent = '【装备】【背包】【神谕】';
}

function renderMaze() {
  const p = state.player;
  const el = document.getElementById('maze');
  let html = '';

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wall = state.mazeWalls[y][x];
      let cls = 'cell', text = '';
      const e = state.events.get(key(x, y));

      if (x === state.exit.x && y === state.exit.y) { cls += ' exit'; text = '🚪'; }
      if (e === 'enemy') { cls += ' enemy'; text = '👹'; }
      if (e === 'knowledge') { cls += ' knowledge'; text = '📜'; }
      if (e === 'rest') { cls += ' rest'; text = '🏕️'; }
      if (e === 'shrine') { cls += ' shrine'; text = '✨'; }
      if (x === p.x && y === p.y) { cls += ' player'; text = 'P'; }

      const style = `border-top:${wall.n ? 4 : 0}px solid #000; border-right:${wall.e ? 4 : 0}px solid #000; border-bottom:${wall.s ? 4 : 0}px solid #000; border-left:${wall.w ? 4 : 0}px solid #000;`;
      html += `<div class="${cls}" style="${style}">${text}</div>`;
    }
  }
  el.innerHTML = html;
}

function applyBlessing(name) {
  const p = state.player;
  const hpKeep = p.hp, fameKeep = p.fame, pos = { x: p.x, y: p.y }, floorKeep = state.floor;
  state.player = { ...basePlayer(), hp: hpKeep, fame: fameKeep, x: pos.x, y: pos.y, blessing: 'none', name: p.name };
  state.floor = floorKeep;

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

function showBattleModal(text, rollNum) {
  document.getElementById('battleText').textContent = text;
  const bar = document.getElementById('resultBar');
  bar.style.width = `${rollNum}%`;
  if (rollNum <= 25) bar.style.background = '#c0392b';
  else if (rollNum <= 50) bar.style.background = '#e67e22';
  else if (rollNum <= 85) bar.style.background = '#6b8e23';
  else if (rollNum <= 99) bar.style.background = '#d4af37';
  else bar.style.background = '#7e57c2';
  battleModal().classList.remove('hidden');
}

function hideBattleModal() { battleModal().classList.add('hidden'); }

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
  const extraCrit = (r >= critMin) ? 1.5 : 1;
  let base = p[main] * 0.6 + ((p.str + p.agi + p.con + p.wis + p.ins - p[main]) / 4) * 0.4;
  if (p.blessing === 'Artemis' && enemyType === 'beast') base *= 1.2;

  const dmg = Math.round(base * mult * extraCrit - enemy.con / 3);
  let summary = '';

  if (mult < 0) {
    p.hp += dmg;
    summary = `大失败(骰:${r})，你自伤 ${Math.abs(dmg)} HP`;
    log(summary);
  } else if (dmg <= 0) {
    summary = `战斗结果 ${tag}(骰:${r})，未造成有效伤害`;
    log(summary);
  } else {
    enemy.hp -= dmg;
    summary = `战斗结果 ${tag}(骰:${r})，对${enemyType === 'beast' ? '魔兽' : '英雄'}造成 ${dmg} 伤害`;
    log(summary);
  }

  if (p.hp <= 0) { state.over = true; p.hp = 0; log('你倒下了，进入冥界，游戏结束'); }
  else if (enemy.hp <= 0) { p.fame += 3; log('你战胜敌人，名声 +3'); }
  else {
    const back = Math.max(1, Math.round(enemy.str * 0.4 - enemy.con / 6));
    p.hp -= back;
    log(`敌方反击造成 ${back} 伤害`);
    if (p.hp <= 0) { state.over = true; p.hp = 0; log('你倒下了，进入冥界，游戏结束'); }
  }

  showBattleModal(summary, r);
}

function showQuizModal() {
  const q = QUIZ_BANK[roll(QUIZ_BANK.length) - 1];
  document.getElementById('quizQ').textContent = q.q;
  const opts = document.getElementById('quizOptions');
  opts.innerHTML = '';

  q.options.forEach((txt, idx) => {
    const b = document.createElement('button');
    b.textContent = String.fromCharCode(65 + idx) + '. ' + txt;
    b.onclick = () => {
      if (idx === q.answer) {
        const gain = q.reward;
        const v = 1 + (roll(2) - 1);
        state.player[gain] += v;
        log(`答对了，${gain === 'wis' ? '智慧' : '灵感'} +${v}`);
      } else {
        log('回答错误，本次无奖励');
      }
      quizModal().classList.add('hidden');
      renderStats();
    };
    opts.appendChild(b);
  });

  document.getElementById('quizSkip').onclick = () => {
    state.player.hp = clamp(state.player.hp - 5, 0, 140);
    log('你跳过了试炼，生命 -5');
    quizModal().classList.add('hidden');
    renderStats();
  };

  quizModal().classList.remove('hidden');
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
  state.exit = { x: W - 1, y: H - 1 };
  initMazeWalls();
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
  if (e === 'knowledge') showQuizModal();
  if (e === 'rest') restEvent();
  if (e === 'shrine') shrineEvent();
  state.events.delete(k);
}

function canMove(nx, ny, dir) {
  if (nx < 0 || ny < 0 || nx >= W || ny >= H) return false;
  const cur = state.mazeWalls[state.player.y][state.player.x];
  if (dir === 'up') return !cur.n;
  if (dir === 'down') return !cur.s;
  if (dir === 'left') return !cur.w;
  if (dir === 'right') return !cur.e;
  return false;
}

function move(dx, dy, dir) {
  if (state.over) return;
  const p = state.player;
  const nx = p.x + dx, ny = p.y + dy;
  if (!canMove(nx, ny, dir)) return;
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
    floor: state.floor,
    over: state.over,
    exit: state.exit,
    events: Array.from(state.events.entries()),
    mazeWalls: state.mazeWalls,
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
    state.floor = data.floor;
    state.over = data.over;
    state.exit = data.exit;
    state.events = new Map(data.events || []);
    state.mazeWalls = data.mazeWalls;
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
      if (m === 'up') move(0, -1, 'up');
      if (m === 'down') move(0, 1, 'down');
      if (m === 'left') move(-1, 0, 'left');
      if (m === 'right') move(1, 0, 'right');
    };
  });

  document.getElementById('battleClose').onclick = hideBattleModal;
  document.getElementById('reset').onclick = boot;
  document.getElementById('save').onclick = saveGame;
  document.getElementById('load').onclick = loadGame;
  document.getElementById('applyBlessing').onclick = () => {
    const val = document.getElementById('blessingSelect').value;
    applyBlessing(val);
  };

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') move(0, -1, 'up');
    if (e.key === 'ArrowDown') move(0, 1, 'down');
    if (e.key === 'ArrowLeft') move(-1, 0, 'left');
    if (e.key === 'ArrowRight') move(1, 0, 'right');
  });
}

function boot() {
  state.player = basePlayer();
  state.floor = 1;
  state.over = false;
  state.exit = { x: W - 1, y: H - 1 };
  initMazeWalls();
  initEvents();
  document.getElementById('log').innerHTML = '';
  log('游戏开始：探索迷宫，触发事件，抵达出口');
  renderStats(); renderMaze();
}

bind();
boot();
