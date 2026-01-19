# BigProject - CI/CD Architecture

## 🏗️ 프로젝트 구조

```
bigProject/
├── frontend/              # React + Vite 프론트엔드
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── src/                   # Spring Boot 백엔드
├── Dockerfile            # 백엔드 Dockerfile
├── docker-compose.yml    # 전체 스택 오케스트레이션
└── .github/
    └── workflows/        # CI/CD 파이프라인
        ├── frontend-ci.yml
        ├── backend-ci.yml
        └── deploy.yml
```

## 🚀 CI/CD 파이프라인 설계

### 1. **독립적인 빌드 트리거**

각 컴포넌트는 변경사항이 있을 때만 빌드됩니다:

- **Frontend CI** (`frontend-ci.yml`)
  - 트리거: `frontend/**` 경로 변경
  - 작업: npm build → Docker 이미지 빌드 → Docker Hub 푸시

- **Backend CI** (`backend-ci.yml`)
  - 트리거: `src/**`, `build.gradle` 변경
  - 작업: Gradle build → 테스트 → Docker 이미지 빌드 → Docker Hub 푸시

- **Deploy** (`deploy.yml`)
  - 트리거: Frontend/Backend CI 성공 후
  - 작업: SSH로 서버 접속 → docker-compose pull → 무중단 배포

### 2. **Docker 이미지 전략**

#### Frontend 이미지
- **Base**: `node:20-alpine` (빌드) + `nginx:alpine` (런타임)
- **최적화**: Multi-stage build로 최종 이미지 크기 최소화
- **기능**: SPA 라우팅, API 프록시, 정적 파일 캐싱

#### Backend 이미지
- **Base**: `gradle:8.5-jdk17` (빌드) + `eclipse-temurin:17-jre-alpine` (런타임)
- **최적화**: Gradle 캐싱, JVM 메모리 설정
- **보안**: Non-root 사용자, Health check

#### Database
- **Image**: `postgres:16-alpine`
- **영속성**: Named volume (`postgres_data`)

## 📦 로컬 개발 환경 설정

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 비밀번호와 시크릿 키 수정
```

### 2. Docker Compose로 전체 스택 실행

```bash
# 전체 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 특정 서비스만 재시작
docker-compose restart backend

# 중지
docker-compose down

# 볼륨까지 삭제 (데이터베이스 초기화)
docker-compose down -v
```

### 3. 개별 개발 모드

#### Frontend 개발
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

#### Backend 개발
```bash
./gradlew bootRun
# http://localhost:8080
```

## 🔧 GitHub Actions 설정

### 필수 Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions에서 다음 설정:

```
DOCKER_USERNAME          # Docker Hub 사용자명
DOCKER_PASSWORD          # Docker Hub 액세스 토큰
DEPLOY_HOST             # 배포 서버 IP/도메인
DEPLOY_USER             # SSH 사용자명
DEPLOY_SSH_KEY          # SSH Private Key
DEPLOY_PATH             # 서버의 프로젝트 경로 (예: /home/user/bigProject)
SLACK_WEBHOOK           # (선택) Slack 알림 웹훅
```

### Docker Hub 토큰 생성

1. Docker Hub 로그인
2. Account Settings → Security → New Access Token
3. 생성된 토큰을 `DOCKER_PASSWORD`에 저장

### SSH 키 생성 (배포용)

```bash
# 로컬에서 SSH 키 생성
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# 공개키를 배포 서버에 복사
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-server.com

# Private Key를 GitHub Secret에 저장
cat ~/.ssh/github_actions  # 이 내용을 DEPLOY_SSH_KEY에 복사
```

## 🌐 배포 서버 설정

### 1. Docker 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 프로젝트 클론

```bash
git clone https://github.com/your-username/bigProject.git
cd bigProject
cp .env.example .env
# .env 파일 수정
```

### 3. 초기 배포

```bash
docker-compose up -d --build
```

## 📊 모니터링 및 헬스체크

### 헬스체크 엔드포인트

- **Backend**: `http://localhost:8080/actuator/health`
- **Frontend**: `http://localhost:80`
- **Database**: `docker-compose ps` (healthy 상태 확인)

### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## 🔄 CI/CD 워크플로우

### 개발 프로세스

1. **Feature 브랜치 생성**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **코드 작성 및 커밋**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Pull Request 생성**
   - PR 생성 시 자동으로 CI 실행
   - Frontend/Backend 변경사항에 따라 선택적 빌드

4. **Main 브랜치 병합**
   - 병합 시 Docker 이미지 빌드 및 푸시
   - 자동 배포 (deploy.yml)

### 배포 플로우

```
코드 푸시 (main)
    ↓
Frontend CI / Backend CI (병렬 실행)
    ↓
Docker 이미지 빌드 & 푸시
    ↓
Deploy 워크플로우 트리거
    ↓
SSH로 서버 접속
    ↓
docker-compose pull & up -d
    ↓
헬스체크
    ↓
Slack 알림 (선택)
```

## 🛠️ 트러블슈팅

### 빌드 실패 시

```bash
# 캐시 삭제 후 재빌드
docker-compose build --no-cache

# Gradle 캐시 삭제
./gradlew clean build --no-daemon
```

### 데이터베이스 연결 실패

```bash
# DB 컨테이너 상태 확인
docker-compose ps db

# DB 로그 확인
docker-compose logs db

# DB 재시작
docker-compose restart db
```

### 포트 충돌

`.env` 파일에서 포트 변경:
```
FRONTEND_PORT=3000
BACKEND_PORT=8081
DB_PORT=5433
```

## 📝 추가 개선 사항

### 1. Spring Boot Actuator 활성화

`build.gradle`에 추가:
```gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

`application.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

### 2. 프로덕션 환경 변수 분리

`application-prod.yml` 생성하여 프로덕션 설정 관리

### 3. 모니터링 추가

- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Sentry (에러 트래킹)

## 📄 라이선스

MIT License
