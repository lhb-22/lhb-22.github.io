// server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =====================
// 💚 MongoDB 연결 (Docker 대응 → host.docker.internal)
// =====================
mongoose
  .connect('mongodb://host.docker.internal:27017/lhb_web')
  .then(() => console.log('💚 MongoDB 연결 성공! (lhb_web DB)'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));


// =====================
// 💚 MongoDB Schema: 게임 기록 로그
// =====================
const gameLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  gameType: { type: String, enum: ['color', 'reaction', 'person'], required: true },
  score: Number,
  time: Number,
  createdAt: { type: Date, default: Date.now },
});

const GameLog = mongoose.model('GameLog', gameLogSchema);


// =====================
// 🔧 MySQL 연결 풀 (Docker 대응 → host.docker.internal)
// =====================
const pool = mysql.createPool({
  host: 'host.docker.internal',
  user: 'root',
  password: 'lhb0202',
  database: 'lhb_web',
  waitForConnections: true,
  connectionLimit: 10,
});

// MySQL 연결 테스트
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL 연결 성공!');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL 연결 실패:', err);
  }
})();


// =====================
// ✅ 회원가입
// =====================
app.post('/api/signup', async (req, res) => {
  const { username, loginId, password } = req.body;

  if (!username || !loginId || !password) {
    return res.json({ ok: false, message: '모든 값을 입력해주세요.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [exists] = await conn.query(
      'SELECT id FROM users WHERE loginId = ?',
      [loginId]
    );

    if (exists.length > 0) {
      return res.json({ ok: false, message: '이미 사용 중인 ID입니다.' });
    }

    await conn.query(
      'INSERT INTO users (username, loginId, password) VALUES (?, ?, ?)',
      [username, loginId, password]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('signup error:', err);
    res.json({ ok: false, message: '회원가입 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});


// =====================
// ✅ 로그인
// =====================
app.post('/api/login', async (req, res) => {
  const { loginId, password } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT id, username FROM users WHERE loginId = ? AND password = ?',
      [loginId, password]
    );

    if (rows.length === 0) {
      return res.json({ ok: false, message: 'ID 또는 비밀번호가 올바르지 않습니다.' });
    }

    res.json({
      ok: true,
      userId: rows[0].id,
      username: rows[0].username,
    });
  } catch (err) {
    console.error('login error:', err);
    res.json({ ok: false, message: '로그인 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});


// =====================
// 🎨 색상 테스트 (랭킹 + 로그)
// =====================
app.post('/api/color/save', async (req, res) => {
  const { username, score } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT score FROM color_ranking WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO color_ranking (username, score) VALUES (?, ?)',
        [username, score]
      );
    } else if (score > rows[0].score) {
      await conn.query(
        'UPDATE color_ranking SET score = ? WHERE username = ?',
        [score, username]
      );
    }

    await GameLog.create({ username, gameType: 'color', score });

    res.json({ ok: true });
  } catch (err) {
    console.error('color save error:', err);
    res.json({ ok: false });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/color/rank', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT username, score FROM color_ranking ORDER BY score DESC LIMIT 10'
    );
    res.json({ ok: true, rows });
  } catch (err) {
    res.json({ ok: false });
  } finally {
    if (conn) conn.release();
  }
});


// =====================
// ⚡ 반응속도 (랭킹 + 로그)
// =====================
app.post('/api/reaction/save', async (req, res) => {
  const { username, time } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT time FROM reaction_ranking WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO reaction_ranking (username, time) VALUES (?, ?)',
        [username, time]
      );
    } else if (time < rows[0].time) {
      await conn.query(
        'UPDATE reaction_ranking SET time = ? WHERE username = ?',
        [time, username]
      );
    }

    await GameLog.create({ username, gameType: 'reaction', time });

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/reaction/rank', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT username, time FROM reaction_ranking ORDER BY time ASC LIMIT 10'
    );
    res.json({ ok: true, rows });
  } catch (err) {
    res.json({ ok: false });
  } finally {
    if (conn) conn.release();
  }
});


// =====================
// 🧠 인물 맞추기 (랭킹 + 로그)
// =====================
app.post('/api/person/submit', async (req, res) => {
  const { username, score } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT score FROM person_ranking WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO person_ranking (username, score) VALUES (?, ?)',
        [username, score]
      );
    } else if (score > rows[0].score) {
      await conn.query(
        'UPDATE person_ranking SET score = ? WHERE username = ?',
        [score, username]
      );
    }

    await GameLog.create({ username, gameType: 'person', score });

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/person/ranking', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT username, score FROM person_ranking ORDER BY score DESC LIMIT 10'
    );
    res.json({ ok: true, rows });
  } catch (err) {
    res.json({ ok: false });
  } finally {
    if (conn) conn.release();
  }
});


// =====================
// 💚 유저별 로그 조회
// =====================
app.get('/api/logs/:username', async (req, res) => {
  try {
    const logs = await GameLog.find({ username: req.params.username })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ ok: true, logs });
  } catch (err) {
    res.json({ ok: false });
  }
});


// =====================
// 기본 라우트
// =====================
app.get('/', (req, res) => {
  res.send('LHB Web Game Server Running ✔');
});


// =====================
// 서버 실행
// =====================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
