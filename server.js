// server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');   // 💚 MongoDB

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =====================
// 💚 MongoDB 연결 (최신 버전 방식)
// =====================
mongoose.connect('mongodb://localhost:27017/lhb_web')
  .then(() => console.log('💚 MongoDB 연결 성공! (lhb_web DB)'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));

// =====================
// 💚 게임 플레이 로그 스키마 (MongoDB)
// =====================
const gameLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  gameType: { type: String, enum: ['color', 'reaction', 'person'], required: true },
  score: Number, // color / person 에서 사용
  time: Number,  // reaction 에서 사용
  createdAt: { type: Date, default: Date.now },
});

const GameLog = mongoose.model('GameLog', gameLogSchema);

// =====================
// 🔧 MySQL 연결 풀
// =====================
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'lhb0202',   // ★ MySQL root 비번
  database: 'lhb_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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

  if (!loginId || !password) {
    return res.json({ ok: false, message: 'ID와 비밀번호를 모두 입력해주세요.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT id, username, loginId FROM users WHERE loginId = ? AND password = ?',
      [loginId, password]
    );

    if (rows.length === 0) {
      return res.json({ ok: false, message: 'ID 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = rows[0];
    res.json({
      ok: true,
      userId: user.id,
      username: user.username,
      loginId: user.loginId,
    });
  } catch (err) {
    console.error('login error:', err);
    res.json({ ok: false, message: '로그인 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// =====================
// 🎨 색상 구별 테스트 랭킹 (MySQL + MongoDB 로그)
// =====================

// 점수 저장 (높은 점수만 유지) + 플레이 기록 누적 저장
app.post('/api/color/save', async (req, res) => {
  const { username, score } = req.body;

  if (!username || typeof score !== 'number') {
    return res.json({ ok: false, message: 'username과 score가 필요합니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // --- MySQL 랭킹 로직 ---
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

    // --- MongoDB 플레이 로그 누적 ---
    try {
      await GameLog.create({
        username,
        gameType: 'color',
        score,
      });
    } catch (mongoErr) {
      console.error('color game log error:', mongoErr);
      // 로그는 실패해도 랭킹 응답은 정상 처리
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('color save error:', err);
    res.json({ ok: false, message: '점수 저장 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// 랭킹 조회 (높은 점수 순)
app.get('/api/color/rank', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT username, score FROM color_ranking ORDER BY score DESC, created_at ASC LIMIT 10'
    );

    res.json({ ok: true, rows });
  } catch (err) {
    console.error('color rank error:', err);
    res.json({ ok: false, message: '랭킹 조회 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// =====================
// ⚡ 반응 속도 테스트 랭킹 (MySQL + MongoDB 로그)
// =====================

// 기록 저장 (더 빠른 time일 때만 갱신) + 플레이 기록 누적 저장
app.post('/api/reaction/save', async (req, res) => {
  const { username, time } = req.body;

  if (!username || typeof time !== 'number') {
    return res.json({ ok: false, message: 'username과 time이 필요합니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // --- MySQL 랭킹 로직 ---
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

    // --- MongoDB 플레이 로그 누적 ---
    try {
      await GameLog.create({
        username,
        gameType: 'reaction',
        time,
      });
    } catch (mongoErr) {
      console.error('reaction game log error:', mongoErr);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('reaction save error:', err);
    res.json({ ok: false, message: '기록 저장 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// 랭킹 조회 (빠른 순)
app.get('/api/reaction/rank', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT username, time FROM reaction_ranking ORDER BY time ASC, created_at ASC LIMIT 10'
    );

    res.json({ ok: true, rows });
  } catch (err) {
    console.error('reaction rank error:', err);
    res.json({ ok: false, message: '랭킹 조회 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// =====================
// 🧠 인물 맞추기 게임 랭킹 (MySQL + MongoDB 로그)
// =====================

// 점수 저장 (더 높은 점수만 갱신) + 플레이 기록 누적 저장
app.post('/api/person/submit', async (req, res) => {
  const { username, score } = req.body;

  if (!username || typeof score !== 'number') {
    return res.json({ ok: false, message: 'username과 score가 필요합니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // --- MySQL 랭킹 로직 ---
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

    // --- MongoDB 플레이 로그 누적 ---
    try {
      await GameLog.create({
        username,
        gameType: 'person',
        score,
      });
    } catch (mongoErr) {
      console.error('person game log error:', mongoErr);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('person submit error:', err);
    res.json({ ok: false, message: '인물게임 점수 저장 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// 인물 맞추기 게임 랭킹 조회 (정답 수 높은 순)
app.get('/api/person/ranking', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      'SELECT username, score FROM person_ranking ORDER BY score DESC, created_at ASC LIMIT 10'
    );

    res.json({ ok: true, rows });
  } catch (err) {
    console.error('person ranking error:', err);
    res.json({ ok: false, message: '인물게임 랭킹 조회 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

// =====================
// 💚 유저별 게임 플레이 기록 조회 (MongoDB)
//  예) GET /api/logs/yeeeun
//      GET /api/logs/yeeeun?gameType=color
// =====================
app.get('/api/logs/:username', async (req, res) => {
  const { username } = req.params;
  const { gameType } = req.query; // color / reaction / person

  const filter = { username };
  if (gameType) {
    filter.gameType = gameType;
  }

  try {
    const logs = await GameLog.find(filter)
      .sort({ createdAt: -1 })        // 최근 기록부터
      .limit(100);                    // 너무 많아지지 않게 제한

    res.json({ ok: true, logs });
  } catch (err) {
    console.error('get logs error:', err);
    res.json({ ok: false, message: '플레이 로그 조회 중 오류가 발생했습니다.' });
  }
});

// =====================
// 기본 라우트
// =====================
app.get('/', (req, res) => {
  res.send('LHB Web Game Server Running');
});

// =====================
// 서버 실행
// =====================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
