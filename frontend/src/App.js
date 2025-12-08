import React from 'react';
import './App.css';

function App() {
  return (
    <div className="wrap">
      <header>
        <div className="brand">LEE HYUNBIN Portfolio</div>
        <nav>
          <a href="#about">About</a>
          <a href="#skills">Skills</a>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      {/* ABOUT */}
      <section id="about">
        <div className="name">이현빈</div>
        <p className="section-text">
          군산대학교 컴퓨터정보공학과 3학년으로, 웹 UI/UX 구성과 미니게임 개발을 중심으로 학습하고 있습니다.
          깔끔하고 실용적인 인터페이스를 만드는 데 관심이 많으며,
          사용자 경험 향상을 위한 구조적인 웹 페이지와 상호작용 구현에 집중하고 있습니다.
        </p>
      </section>

      {/* SKILLS */}
      <section id="skills" className="alt">
        <div className="section-title">Skills</div>

        <div className="skills">
          <div className="skill">HTML5</div>
          <div className="skill">CSS3</div>
          <div className="skill">JavaScript</div>
          <div className="skill">UI Layout Design</div>
          <div className="skill">MySQL · Node.js 기초</div>
          <div className="skill">Responsive Web</div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects">
        <div className="section-title">Projects</div>

        <div className="project">
          <div className="project-title">Mini Game World</div>
          <p className="project-desc">
            색상 구별 테스트, 반응 속도 테스트 등 인터랙티브 미니게임을 HTML/CSS/JS 기반으로 제작한 프로젝트입니다.
          </p>
          <a href="portfolio.html">→ 프로젝트 보러가기</a>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="alt">
        <div className="section-title">Contact</div>

        <div className="contact-item">📧 이메일: gusqlsdlee042@naver.com</div>
        <div className="contact-item">📱 전화번호: 010-2103-9175</div>
        <div className="contact-item">🏫 학번: 2301464</div>
      </section>

      <footer>
        © 2024 LEE HYUNBIN · Portfolio
      </footer>
    </div>
  );
}

export default App;
