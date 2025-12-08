// frontend/src/GameLogDashboard.js
import React, { useState } from "react";

const API_BASE = "http://localhost:3000"; // 백엔드 주소 (도커/노드 서버)

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function GameLogDashboard() {
  const [username, setUsername] = useState("");
  const [, setLoading] = useState(false); // CI 에러 피하려고 사용 안 하는 state
  const [logs, setLogs] = useState([]);
  const [gameType, setGameType] = useState("all");
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!username.trim()) {
      setError("유저 이름을 입력해주세요.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      let url = `${API_BASE}/api/logs/${encodeURIComponent(username.trim())}`;
      if (gameType !== "all") {
        url += `?gameType=${gameType}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "로그를 불러오는 중 오류가 발생했습니다.");
        setLogs([]);
      } else {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
      setError("서버에 접속할 수 없습니다. (백엔드 서버가 켜져 있는지 확인!)");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 16px",
        background:
          "linear-gradient(135deg, #eef4ff 0%, #f7f3ff 40%, #e5f0ff 100%)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          background: "#fff",
          borderRadius: "24px",
          padding: "28px 24px 32px",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)",
          border: "1px solid rgba(148, 163, 184, 0.35)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          🎮 게임 기록 대시보드
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
          MongoDB에 저장된 <b>color / reaction / person</b> 게임 플레이 기록을
          한 번에 조회할 수 있습니다.
        </p>

        {/* 검색 폼 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 160px" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                color: "#4b5563",
              }}
            >
              유저 이름
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="예: yeeun 또는 hyunbin"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ width: 140 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                color: "#4b5563",
              }}
            >
              게임 종류
            </div>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            >
              <option value="all">전체</option>
              <option value="color">색상 구별(color)</option>
              <option value="reaction">반응 속도(reaction)</option>
              <option value="person">인물 맞추기(person)</option>
            </select>
          </div>

          <button
            onClick={handleFetch}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 22,
            }}
          >
            기록 조회하기
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "8px 10px",
              borderRadius: 10,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* 테이블 */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  날짜
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  게임
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  점수 / 기록
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: "14px 8px",
                      textAlign: "center",
                      color: "#9ca3af",
                    }}
                  >
                    조회된 기록이 없습니다. (유저 이름과 게임 종류를 확인해 주세요)
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td
                      style={{
                        padding: "9px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {formatDate(log.createdAt)}
                    </td>
                    <td
                      style={{
                        padding: "9px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        textTransform: "capitalize",
                      }}
                    >
                      {log.gameType}
                    </td>
                    <td
                      style={{
                        padding: "9px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {log.gameType === "reaction"
                        ? `${log.time} ms`
                        : `${log.score} 점`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "right",
          }}
        >
          * MongoDB GameLog 컬렉션 기반 실시간 조회
        </p>
      </div>
    </div>
  );
}
