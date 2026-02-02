# BigProject - CI/CD Test Repository

[![Frontend CI](https://github.com/kimchiman123/actions_test/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kimchiman123/actions_test/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/kimchiman123/actions_test/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kimchiman123/actions_test/actions/workflows/backend-ci.yml)

모놀리식 구조에서 **프론트엔드(React)와 백엔드(Spring Boot)를 독립적으로 빌드**하고 **Docker Compose로 배포**하는 CI/CD 파이프라인 테스트 프로젝트입니다.

## 🏗️ 프로젝트 구조

```
actions_test/
├── frontend/              # React + Vite 프론트엔드
│   ├── src/
│   ├── Dockerfile         # Frontend Docker 이미지
│   └── nginx.conf         # Nginx 설정
├── src/                   # Spring Boot 백엔드
├── Dockerfile            # Backend Docker 이미지
├── docker-compose.yml    # 전체 스택 오케스트레이션
└── .github/workflows/    # GitHub Actions CI/CD
    ├── frontend-ci.yml   # Frontend 독립 빌드
    ├── backend-ci.yml    # Backend 독립 빌드
    └── deploy.yml        # 자동 배포
```

## 🚀 빠른 시작

#### 로컬 실행 (Docker Compose)

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일에서 비밀번호 수정

# 2. 전체 스택 실행
docker-compose up -d --build

# 3. 접속 확인
# Frontend: http://localhost:80
# Backend: http://localhost:8080/actuator/health
```

### 개별 개발 모드

**Frontend**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

**Backend**
```bash
./gradlew bootRun  # http://localhost:8080
```

## 🔧 CI/CD 설정

### GitHub Secrets 설정 필요

Repository → Settings → Secrets and variables → Actions

```
DOCKER_USERNAME       # Docker Hub 사용자명
DOCKER_PASSWORD       # Docker Hub 액세스 토큰
```

### CI/CD 워크플로우

- **Frontend CI**: `frontend/**` 경로 변경 시 자동 빌드
- **Backend CI**: `src/**`, `build.gradle` 변경 시 자동 빌드
- **Deploy**: CI 성공 후 자동 배포 (서버 설정 필요)

## 📚 상세 문서

- **[빠른 시작 가이드](QUICKSTART.md)** - 로컬 개발 및 배포 방법
- **[CI/CD 상세 가이드](CI-CD-README.md)** - GitHub Actions 설정 및 운영
- **[아키텍처 다이어그램](ARCHITECTURE.md)** - 시스템 구조 및 워크플로우

## 🛠️ 기술 스택

### Frontend
- React 18
- Vite 5
- TailwindCSS
- React Router
- Nginx (프로덕션)

### Backend
- Spring Boot 4.0.1
- Java 17
- PostgreSQL 16
- Spring Security
- JWT Authentication

### DevOps
- Docker & Docker Compose
- GitHub Actions
- Multi-stage Builds
- Health Checks

## 📊 주요 기능

✅ **독립적 CI 파이프라인** - Frontend/Backend 변경 시 선택적 빌드  
✅ **Multi-stage Docker Build** - 최적화된 프로덕션 이미지  
✅ **Health Checks** - 모든 서비스 헬스체크 구성  
✅ **환경 변수 관리** - .env 파일로 설정 분리  
✅ **무중단 배포** - docker-compose 기반 배포  

## 🔍 테스트 방법

### 1. Frontend CI 테스트
```bash
# frontend 폴더 수정 후
git add frontend/
git commit -m "feat: update frontend"
git push
# → frontend-ci.yml만 실행됨
```

### 2. Backend CI 테스트
```bash
# src 폴더 수정 후
git add src/
git commit -m "feat: update backend"
git push
# → backend-ci.yml만 실행됨
```

### 3. 전체 빌드 테스트
```bash
# 둘 다 수정 후
git add .
git commit -m "feat: update both frontend and backend"
git push
# → 두 워크플로우 모두 실행됨
```

## 📝 다음 단계

- [ ] Docker Hub Secrets 설정
- [ ] 첫 CI/CD 파이프라인 실행
- [ ] 프로덕션 서버 설정 (선택)
- [ ] 모니터링 추가 (Prometheus, Grafana)

## 📄 라이선스

MIT License

---

**Made with ❤️ for CI/CD Testing**
