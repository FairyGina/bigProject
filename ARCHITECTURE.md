# CI/CD 아키텍처 다이어그램

## 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   frontend/  │  │     src/     │  │  .github/    │          │
│  │  (React)     │  │ (Spring Boot)│  │  workflows/  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    git push origin main
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions CI/CD                        │
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │   Frontend CI        │      │    Backend CI        │        │
│  │  ─────────────       │      │  ─────────────       │        │
│  │  • npm install       │      │  • gradle build      │        │
│  │  • npm build         │      │  • run tests         │        │
│  │  • Docker build      │      │  • Docker build      │        │
│  │  • Push to Hub       │      │  • Push to Hub       │        │
│  └──────────────────────┘      └──────────────────────┘        │
│              │                            │                      │
│              └────────────┬───────────────┘                      │
│                           ▼                                      │
│              ┌─────────────────────────┐                        │
│              │   Deploy Workflow       │                        │
│              │  ──────────────────     │                        │
│              │  • SSH to server        │                        │
│              │  • docker-compose pull  │                        │
│              │  • docker-compose up    │                        │
│              │  • Health check         │                        │
│              └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Docker Hub Registry                        │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  bigproject-frontend │      │  bigproject-backend  │        │
│  │  (nginx:alpine)      │      │  (temurin:17-jre)    │        │
│  └──────────────────────┘      └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Production Server                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Docker Compose Network                       │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │  Frontend   │  │   Backend   │  │  PostgreSQL │      │  │
│  │  │  (Nginx)    │  │ (Spring)    │  │     DB      │      │  │
│  │  │  :80        │  │  :8080      │  │   :5432     │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  │        │                 │                 │              │  │
│  │        └────────┬────────┴────────┬────────┘              │  │
│  │                 │                 │                       │  │
│  │          API Proxy         DB Connection                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   End Users      │
                    │  http://server   │
                    └──────────────────┘
```

## CI/CD 워크플로우 상세

### 1. 코드 변경 감지

```
frontend/** 변경
    ↓
frontend-ci.yml 트리거
    ↓
Frontend 빌드만 실행

src/** 또는 build.gradle 변경
    ↓
backend-ci.yml 트리거
    ↓
Backend 빌드만 실행
```

### 2. 빌드 프로세스

#### Frontend
```
1. Checkout code
2. Setup Node.js 20
3. npm ci (의존성 설치)
4. npm run build
5. Docker multi-stage build
   ├─ Stage 1: node:20-alpine (빌드)
   └─ Stage 2: nginx:alpine (런타임)
6. Push to Docker Hub
```

#### Backend
```
1. Checkout code
2. Setup JDK 17
3. Start PostgreSQL service
4. ./gradlew build
5. ./gradlew test
6. Docker multi-stage build
   ├─ Stage 1: gradle:8.5-jdk17 (빌드)
   └─ Stage 2: temurin:17-jre-alpine (런타임)
7. Push to Docker Hub
```

### 3. 배포 프로세스

```
Frontend CI 성공 + Backend CI 성공
    ↓
deploy.yml 트리거
    ↓
SSH 연결 (DEPLOY_HOST)
    ↓
cd $DEPLOY_PATH
    ↓
git pull origin main
    ↓
docker-compose pull
    ↓
docker-compose up -d --no-deps --build
    ↓
Health Check
    ├─ Backend: /actuator/health
    └─ Frontend: /
    ↓
Slack 알림 (선택)
```

## Docker Compose 네트워크 구조

```
┌─────────────────────────────────────────────────────────────┐
│                  bigproject-network (bridge)                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Frontend Container (bigproject-frontend)            │  │
│  │  ────────────────────────────────────────            │  │
│  │  • Image: nginx:alpine                               │  │
│  │  • Port: 80:80                                       │  │
│  │  • Config: nginx.conf                                │  │
│  │  • Features:                                         │  │
│  │    - SPA routing (try_files)                         │  │
│  │    - API proxy to backend:8080                       │  │
│  │    - Static file caching                             │  │
│  │    - Gzip compression                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ HTTP Proxy                       │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend Container (bigproject-backend)              │  │
│  │  ──────────────────────────────────────              │  │
│  │  • Image: eclipse-temurin:17-jre-alpine             │  │
│  │  • Port: 8080:8080                                   │  │
│  │  • User: spring (non-root)                           │  │
│  │  • JVM: -XX:MaxRAMPercentage=75.0                   │  │
│  │  • Health: /actuator/health                          │  │
│  │  • Depends: db (healthy)                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ JDBC                             │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database Container (bigproject-db)                  │  │
│  │  ──────────────────────────────────────              │  │
│  │  • Image: postgres:16-alpine                         │  │
│  │  • Port: 5432:5432                                   │  │
│  │  • Volume: postgres_data:/var/lib/postgresql/data   │  │
│  │  • Health: pg_isready                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 환경 변수 흐름

```
.env 파일
    ↓
docker-compose.yml
    ↓
컨테이너 환경 변수
    ↓
application.properties (${VAR:default})
    ↓
Spring Boot Application
```

## 보안 계층

```
1. GitHub Secrets
   ├─ DOCKER_PASSWORD (Docker Hub 토큰)
   ├─ DEPLOY_SSH_KEY (SSH Private Key)
   └─ JWT_SECRET (런타임 주입)

2. Docker
   ├─ Non-root user (spring:spring)
   ├─ Multi-stage build (최소 공격 표면)
   └─ Alpine Linux (경량 이미지)

3. Network
   ├─ Bridge network (컨테이너 간 격리)
   ├─ Internal communication only
   └─ 외부 노출: 80, 8080만

4. Application
   ├─ JWT 인증
   ├─ Spring Security
   └─ Environment variable injection
```
