import React, { useState } from 'react';
import * as tf from '@tensorflow/tfjs';

function App() {
  const [username, setUsername] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [skillScore, setSkillScore] = useState(null);
  const [tfStatus, setTfStatus] = useState('');

  // ============================
  //  MongoDB 플레이 기록 불러오기
  // ============================
  const fetchLogs = async () => {
    if (!username.trim()) {
      setMsg('닉네임을 입력해주세요!');
      setLogs([]);
      setSkillScore(null);
      setTfStatus('');
      return;
    }

    setLoading(true);
    setMsg('');
    setSkillScore(null);
    setTfStatus('');

    try {
      const res = await fetch(
        `http://localhost:3000/api/logs/${encodeURIComponent(username)}`
      );
      const data = await res.json();

      if (data.ok) {
        const list = data.logs || [];
        setLogs(list);

        if (list.length === 0) {
          setMsg('플레이 기록이 아직 없습니다 😢');
        } else {
          setMsg(`총 ${list.length}개의 플레이 기록을 불러왔습니다!`);
        }
      } else {
        setMsg(data.message || '기록 불러오는 중 오류 발생');
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
      setMsg('서버 연결 실패 (server.js 실행 확인)');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================
  //  TensorFlow.js 실력 분석 기능
  // ============================
  const analyzeWithTF = async () => {
    if (!logs || logs.length === 0) {
      setTfStatus('먼저 플레이 기록을 조회해주세요!');
      return;
    }

    let bestColorScore = null;
    let bestReactionTime = null;

    logs.forEach((log) => {
      if (log.gameType === 'color' && typeof log.score === 'number') {
        if (bestColorScore === null || log.score > bestColorScore)
          bestColorScore = log.score;
      }
      if (log.gameType === 'reaction' && typeof log.time === 'number') {
        if (bestReactionTime === null || log.time < bestReactionTime)
          bestReactionTime = log.time;
      }
    });

    if (bestColorScore === null || bestReactionTime === null) {
      setTfStatus('색상 점수 + 반응속도 기록이 모두 있어야 분석할 수 있어요!');
      return;
    }

    setTfStatus('TensorFlow.js로 실력 분석 중입니다...');

    const normScore = Math.min(bestColorScore / 30, 1);
    const normTime = Math.min(bestReactionTime / 1000, 1);

    // 🎯 간단한 신경망 모델 생성
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [2] }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
    });

    const xs = tf.tensor2d(
      [
        [0.2, 0.9],
        [0.4, 0.7],
        [0.6, 0.5],
        [0.8, 0.3],
        [1.0, 0.1],
      ],
      [5, 2]
    );

    const ys = tf.tensor2d([[20], [40], [60], [80], [95]], [5, 1]);

    try {
      await model.fit(xs, ys, { epochs: 80, verbose: 0 });

      const input = tf.tensor2d([[normScore, 1 - normTime]]);

      // ⛔ 오류 원인 제거: as tf.Tensor 삭제!
      const output = model.predict(input);

      const value = (await output.data())[0];
      const score = Math.round(Math.max(0, Math.min(100, value)));

      setSkillScore(score);
      setTfStatus('AI 모델이 실력 지수를 예측했습니다 🤖');
    } catch (err) {
      console.error(err);
      setTfStatus('TensorFlow.js 분석 중 오류 발생');
    } finally {
      xs.dispose();
      ys.dispose();
    }
  };

  // ============================
  //  화면 렌더링
  // ============================
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#bba7e3',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 16px',
        fontFamily: 'Pretendard, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '880px',
          background: '#f7f3ff',
          padding: '28px 32px',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <h1
          style={{
            color: '#5c2cff',
            fontSize: '24px',
            fontWeight: 800,
            marginBottom: '8px',
          }}
        >
          🎮 LHB GAMES · 플레이 기록 대시보드
        </h1>

        <p style={{ fontSize: '13px', color: '#555', marginBottom: '18px' }}>
          MongoDB에 저장된 실제 게임 기록을 조회하고  
          TensorFlow.js로 실력 지수를 예측합니다.
        </p>

        {/* 닉네임 입력 + 조회 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <input
            placeholder="닉네임 입력 (예: test1)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '999px',
              border: '1px solid #ddd',
              fontSize: '13px',
            }}
          />
          <button
            onClick={fetchLogs}
            style={{
              background: '#6e38ff',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            기록 조회
          </button>
        </div>

        {msg && <p style={{ fontSize: '12px', marginBottom: '12px' }}>{msg}</p>}

        {/* TensorFlow.js 분석 박스 */}
        <div
          style={{
            padding: '12px',
            borderRadius: '16px',
            background: '#efe5ff',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: '#5c2cff' }}>🤖 TensorFlow.js 실력 분석</strong>
            <button
              onClick={analyzeWithTF}
              style={{
                background: '#5c2cff',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              분석하기
            </button>
          </div>

          {tfStatus && (
            <p style={{ fontSize: '12px', marginTop: '6px', color: '#444' }}>
              {tfStatus}
            </p>
          )}

          {skillScore !== null && (
            <p
              style={{
                fontSize: '14px',
                marginTop: '6px',
                fontWeight: 'bold',
                color: '#3b1fb8',
              }}
            >
              예측 실력 지수: {skillScore} / 100
            </p>
          )}
        </div>

        {/* 기록 리스트 */}
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '12px',
            background: '#fff',
          }}
        >
          {logs.map((log) => (
            <div
              key={log._id}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
              }}
            >
              <strong>[{log.gameType}]</strong> {log.username}
              {log.score !== undefined && <div>점수: {log.score}</div>}
              {log.time !== undefined && <div>기록: {log.time} ms</div>}
              <div style={{ color: '#777', fontSize: '11px' }}>
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div style={{ padding: '16px', fontSize: '12px', color: '#777' }}>
              조회된 기록이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
