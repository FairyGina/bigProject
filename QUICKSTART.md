# 🚀 빠른 시작 가이드

## 로컬 개발 환경 (Docker Compose)

### 1. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일 수정:
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_long_secret_key_at_least_256_bits
```

### 2. 전체 스택 실행
```bash
docker-compose up -d --build
```

### 3. 접속 확인
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/actuator/health

### 4. 로그 확인
```bash
docker-compose logs -f
```

---

## GitHub Actions 설정 (CI/CD)

### 1. Docker Hub 준비
1. [Docker Hub](https://hub.docker.com) 계정 생성
2. Settings → Security → New Access Token 생성
3. 토큰 복사 (한 번만 표시됨)

### 2. GitHub Secrets 설정
Repository → Settings → Secrets and variables → Actions → New repository secret

필수 Secrets:
```
DOCKER_USERNAME       # Docker Hub 사용자명
DOCKER_PASSWORD       # Docker Hub 액세스 토큰
```

배포용 Secrets (서버 배포 시):
```
DEPLOY_HOST          # 서버 IP 또는 도메인
DEPLOY_USER          # SSH 사용자명
DEPLOY_SSH_KEY       # SSH Private Key
DEPLOY_PATH          # /home/user/bigProject
```

### 3. 첫 배포 테스트
```bash
git add .
git commit -m "feat: setup CI/CD pipeline"
git push origin main
```

GitHub Actions 탭에서 워크플로우 실행 확인!

---

## 개별 개발 모드

### Frontend만 개발
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:5173

### Backend만 개발
```bash
./gradlew bootRun
```
→ http://localhost:8080

---

## 유용한 명령어

### Docker Compose
```bash
# 전체 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart backend

# 로그 실시간 확인
docker-compose logs -f backend

# 완전 초기화 (볼륨 포함)
docker-compose down -v
docker-compose up -d --build

# 컨테이너 상태 확인
docker-compose ps
```

### Gradle
```bash
# 빌드
./gradlew build

# 테스트
./gradlew test

# 클린 빌드
./gradlew clean build

# 의존성 업데이트 확인
./gradlew dependencyUpdates
```

### Git 워크플로우
```bash
# Feature 브랜치 생성
git checkout -b feature/new-feature

# 변경사항 커밋
git add .
git commit -m "feat: add new feature"

# Push 및 PR 생성
git push origin feature/new-feature
```

---

## 트러블슈팅

### 포트 충돌
`.env` 파일에서 포트 변경:
```env
FRONTEND_PORT=3000
BACKEND_PORT=8081
DB_PORT=5433
```

### DB 연결 실패
```bash
# DB 상태 확인
docker-compose ps db

# DB 재시작
docker-compose restart db

# DB 로그 확인
docker-compose logs db
```

### 빌드 캐시 문제
```bash
# Docker 빌드 캐시 삭제
docker-compose build --no-cache

# Gradle 캐시 삭제
./gradlew clean
```

---

## 다음 단계

1. ✅ 로컬 환경 구축 완료
2. ✅ GitHub Actions 설정 완료
3. 📝 프로덕션 서버 설정 (CI-CD-README.md 참고)
4. 📊 모니터링 추가 (Prometheus, Grafana)
5. 🔒 보안 강화 (HTTPS, 방화벽)

상세한 내용은 `CI-CD-README.md`를 참고하세요!
