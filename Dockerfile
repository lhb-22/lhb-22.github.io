# 1. Node 18 기반 이미지 사용
FROM node:18

# 2. 컨테이너 안에서 작업할 디렉토리
WORKDIR /app

# 3. package.json, package-lock.json 먼저 복사
#    (의존성 설치 캐시 활용용)
COPY package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. 나머지 소스 코드 전부 복사
COPY . .

# 6. 서버에서 사용하는 포트 (server.js가 3000 쓰고 있으니까)
EXPOSE 3000

# 7. 컨테이너 시작 시 실행할 명령
CMD ["node", "server.js"]
