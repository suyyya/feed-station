/**
 * 🍳 投喂站 · 多人版后端（零依赖）
 * 运行：node server.js  →  http://localhost:3789
 * 数据：data/db.json + uploads/（图片）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
// 数据目录支持环境变量覆盖（云部署挂持久卷用），默认本地 data/ + uploads/
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = process.env.PORT || 3789;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- 数据 ---------- */
let db = { users: [], memberships: [], feeds: [] };
if (fs.existsSync(DATA_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { console.error('db 解析失败，使用空数据', e.message); }
}
const saveDb = () => fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));

const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const token = () => crypto.randomBytes(24).toString('hex');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 去掉易混 O/I/0/1
function genCode() {
  let c;
  do {
    c = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (db.users.some(u => u.inviteCode === c));
  return c;
}

const FOODS = ['gossip','praise','compliment','rant','joke','photo','link','file'];
const REACTIONS = {
  gossip:     ['瓜很甜，籽有点多，细节不够！','吃瓜吃到饱！还有吗？','这瓜保熟，我信你！','瓜已下肚，人已精神'],
  praise:     ['真香！甜到蛀牙了！','被甜到了，今天值了','这颗糖我存着慢慢含','夸得我脸都红了！'],
  compliment: ['草莓味的赞美，绝了','被治愈了，谢谢饲养员！','这句我截屏收藏了','眼泪不争气地从嘴角流下'],
  rant:       ['辣得直冒汗，但好爽！','苦是苦了点，但懂你','这是今天的饭，我干了','吐完好受多了，对吧？'],
  joke:       ['好冷……（打了个哆嗦）','笑不出来，但嘴角动了','冷到我了，回你一个哈欠','好烂！再来一个！'],
  photo:      ['哇，看起来真不错！','这张我保存了！','现烤的就是香','已端上桌，细细品尝'],
  link:       ['夹层很厚，一口满足','已收藏，明天细品','这是今日最佳！','打开就停不下来了'],
  file:       ['豪华便当！慢慢消化','已收到，感恩饲养员','这是今日干饭巅峰','够我研究一整晚'],
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* ---------- 工具 ---------- */
const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};
const readBody = req => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 20 * 1024 * 1024) { reject(new Error('too large')); req.destroy(); } });
  req.on('end', () => {
    if (!raw) return resolve({});
    try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('bad json')); }
  });
  req.on('error', reject);
});
const authUser = req => {
  const h = req.headers.authorization || '';
  const tk = h.replace(/^Bearer\s+/i, '');
  return db.users.find(u => u.token === tk) || null;
};
const fmtUser = u => ({ id: u.id, name: u.name, sp: u.sp, inviteCode: u.inviteCode });
const todayKey = ts => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/* ---------- 路由 ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  const method = req.method;

  /* 静态资源 */
  if (method === 'GET' && (p === '/' || p === '/index.html')) {
    const file = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(fs.readFileSync(file));
    }
    return send(res, 404, { error: 'public/index.html 不存在' });
  }
  if (method === 'GET' && p.startsWith('/uploads/')) {
    const name = path.basename(p);
    const file = path.join(UPLOAD_DIR, name);
    if (fs.existsSync(file)) {
      const ext = path.extname(name).toLowerCase();
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' });
      return res.end(fs.readFileSync(file));
    }
    return send(res, 404, { error: 'not found' });
  }

  /* API */
  if (!p.startsWith('/api/')) return send(res, 404, { error: 'not found' });
  try {
    /* ---- 注册 ---- */
    if (p === '/api/register' && method === 'POST') {
      const { name, pass, sp } = await readBody(req);
      const n = (name || '').trim();
      if (!n) return send(res, 400, { error: '名字不能为空' });
      if (n.length > 12) return send(res, 400, { error: '名字太长啦（12 字以内）' });
      if (!pass || pass.length < 4) return send(res, 400, { error: '密码至少 4 位' });
      if (db.users.some(u => u.name === n)) return send(res, 400, { error: '这名字已经在投喂站登记过啦，直接登录试试？' });
      const user = { id: uid('u'), name: n, pass: hash(pass), sp: sp || '🐶', inviteCode: genCode(), token: token(), createdAt: Date.now() };
      db.users.push(user);
      saveDb();
      return send(res, 200, { token: user.token, user: fmtUser(user) });
    }

    /* ---- 登录 ---- */
    if (p === '/api/login' && method === 'POST') {
      const { name, pass } = await readBody(req);
      const user = db.users.find(u => u.name === (name || '').trim());
      if (!user || user.pass !== hash(pass || '')) return send(res, 401, { error: '名字或密码不对，再试试' });
      user.token = token();
      saveDb();
      return send(res, 200, { token: user.token, user: fmtUser(user) });
    }

    /* ---- 鉴权 ---- */
    const me = authUser(req);
    if (!me) return send(res, 401, { error: '登录过期啦，重新登录一下' });

    /* ---- 我的信息 ---- */
    if (p === '/api/me' && method === 'GET') {
      const members = db.memberships
        .filter(m => m.ownerId === me.id)
        .map(m => {
          const u = db.users.find(x => x.id === m.memberId);
          if (!u) return null;
          const count = db.feeds.filter(f => f.ownerId === me.id && f.memberId === u.id).length;
          return { id: u.id, name: u.name, sp: u.sp, count };
        })
        .filter(Boolean);
      const joined = db.memberships
        .filter(m => m.memberId === me.id)
        .map(m => {
          const u = db.users.find(x => x.id === m.ownerId);
          return u ? { ownerId: u.id, ownerName: u.name, ownerSp: u.sp } : null;
        })
        .filter(Boolean);
      return send(res, 200, { user: fmtUser(me), members, joined });
    }

    /* ---- 加入投喂站 ---- */
    if (p === '/api/join' && method === 'POST') {
      const { code } = await readBody(req);
      const c = (code || '').trim().toUpperCase();
      const owner = db.users.find(u => u.inviteCode === c);
      if (!owner) return send(res, 404, { error: '没找到这个投喂站，再核对一下邀请码？' });
      if (owner.id === me.id) return send(res, 400, { error: '不能加入自己的投喂站哦' });
      const exists = db.memberships.some(m => m.ownerId === owner.id && m.memberId === me.id);
      if (exists) return send(res, 200, { ok: true, ownerName: owner.name, already: true });
      db.memberships.push({ id: uid('m'), ownerId: owner.id, memberId: me.id, joinedAt: Date.now() });
      saveDb();
      return send(res, 200, { ok: true, ownerName: owner.name, already: false });
    }

    /* ---- 投喂 ---- */
    if (p === '/api/feed' && method === 'POST') {
      const { memberId, foodId, text, mediaUrl } = await readBody(req);
      if (!FOODS.includes(foodId)) return send(res, 400, { error: '这道菜不存在' });
      const member = db.users.find(u => u.id === memberId);
      if (!member) return send(res, 404, { error: '这位朋友不在了' });
      const rel = db.memberships.some(m => m.ownerId === me.id && m.memberId === memberId);
      if (!rel) return send(res, 403, { error: 'ta 还没加入你的投喂站，喂不了' });
      const t = (text || '').trim();
      if (!t && !mediaUrl) return send(res, 400, { error: '总得喂点啥吧' });
      const meal = {
        id: uid('f'),
        ownerId: me.id,
        memberId,
        foodId,
        text: t,
        media: mediaUrl ? { type: 'image', url: mediaUrl } : null,
        reaction: pick(REACTIONS[foodId] || REACTIONS.praise),
        ts: Date.now(),
        dateKey: todayKey(Date.now()),
      };
      db.feeds.push(meal);
      saveDb();
      return send(res, 200, { meal });
    }

    /* ---- 图片上传 ---- */
    if (p === '/api/media' && method === 'POST') {
      const { data } = await readBody(req);
      if (!data || !data.startsWith('data:image/')) return send(res, 400, { error: '只支持图片' });
      const m = data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!m) return send(res, 400, { error: '图片格式不对' });
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 5 * 1024 * 1024) return send(res, 400, { error: '图片太大' });
      const fname = uid('img') + '.' + ext;
      fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);
      return send(res, 200, { url: '/uploads/' + fname });
    }

    /* ---- 我投喂的记录 ---- */
    if (p === '/api/feeds' && method === 'GET') {
      const list = db.feeds
        .filter(f => f.ownerId === me.id)
        .map(f => {
          const m = db.users.find(u => u.id === f.memberId);
          return { ...f, memberName: m ? m.name : '?', memberSp: m ? m.sp : '❔' };
        })
        .sort((a, b) => b.ts - a.ts);
      return send(res, 200, { feeds: list });
    }

    /* ---- 我的饭桌（我被投喂的） ---- */
    if (p === '/api/table' && method === 'GET') {
      const list = db.feeds
        .filter(f => f.memberId === me.id)
        .map(f => {
          const u = db.users.find(x => x.id === f.ownerId);
          return { ...f, feederName: u ? u.name : '神秘人', feederSp: u ? u.sp : '👻' };
        })
        .sort((a, b) => b.ts - a.ts);
      return send(res, 200, { feeds: list });
    }

    /* ---- 撤菜 ---- */
    if (p.startsWith('/api/feed/') && method === 'DELETE') {
      const id = p.slice('/api/feed/'.length);
      const idx = db.feeds.findIndex(f => f.id === id);
      if (idx === -1) return send(res, 404, { error: '这道菜不在了' });
      const f = db.feeds[idx];
      if (f.ownerId !== me.id && f.memberId !== me.id) return send(res, 403, { error: '这盘菜不是你桌上的' });
      db.feeds.splice(idx, 1);
      saveDb();
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'api not found' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: '服务器开小差了：' + e.message });
  }
});

/* 图片投喂：前端先调 /api/media 拿到 url，再在 /api/feed 里传 mediaUrl */

server.listen(PORT, () => {
  console.log('🍳 投喂站已开张 → http://localhost:' + PORT);
  console.log('   数据文件：' + DATA_FILE);
});
