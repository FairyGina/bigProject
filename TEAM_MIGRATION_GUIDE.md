# 팀 레포지토리로 CI/CD 이전 가이드

## 📋 개요

현재 개인 레포지토리(`kimchiman123/actions_test`)에서 구축한 GitHub Actions CI/CD를 팀 레포지토리로 이전하는 방법을 안내합니다.

---

## 🚀 이전 단계

### 1단계: 코드 이전

#### 방법 A: 새 레포지토리에 Push (권장)

```bash
# 현재 프로젝트 디렉토리에서
cd c:\Users\sksg2\Desktop\cicd\actions_test

# 기존 원격 저장소 확인
git remote -v

# 팀 레포지토리를 새 원격으로 추가
git remote add team https://github.com/TEAM_ORG/TEAM_REPO.git

# 또는 기존 origin을 팀 레포로 변경
git remote set-url origin https://github.com/TEAM_ORG/TEAM_REPO.git

# main 브랜치 푸시
git push team main
# 또는
git push origin main
```

#### 방법 B: Fork 또는 Transfer

- **Fork**: 개인 레포를 팀원이 Fork하여 팀 Organization으로 이동
- **Transfer**: GitHub Settings → Transfer ownership (레포지토리 소유권 이전)

---

### 2단계: GitHub Secrets 설정

팀 레포지토리에서 다음 Secrets를 설정해야 합니다:

**경로**: `팀 레포지토리` → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

#### 필수 Secrets

| Secret 이름 | 설명 | 예시/생성 방법 |
|------------|------|--------------|
| `DOCKER_USERNAME` | Docker Hub 사용자명 | 팀 Docker Hub 계정 또는 개인 계정 |
| `DOCKER_PASSWORD` | Docker Hub 액세스 토큰 | Docker Hub → Account Settings → Security → New Access Token |
| `DEPLOY_HOST` | 배포 서버 IP/도메인 | `123.456.789.0` 또는 `server.example.com` |
| `DEPLOY_USER` | SSH 사용자명 | `ubuntu`, `deploy`, `ec2-user` 등 |
| `DEPLOY_SSH_KEY` | SSH Private Key | 아래 "SSH 키 생성" 참조 |
| `DEPLOY_PATH` | 서버의 프로젝트 경로 | `/home/ubuntu/bigproject` |
| `DEPLOY_PORT` | SSH 포트 (선택) | 기본값: `22` |

#### 선택 Secrets (나중에 추가 가능)

| Secret 이름 | 설명 |
|------------|------|
| `SLACK_WEBHOOK_URL` | Slack 알림용 웹훅 URL |

---

### 3단계: Docker Hub 설정

#### 옵션 1: 팀 Docker Hub 계정 사용 (권장)

```bash
# 팀 Docker Hub Organization 생성
# https://hub.docker.com/orgs 에서 생성

# Secrets 설정
DOCKER_USERNAME: team-organization
DOCKER_PASSWORD: <팀 계정의 액세스 토큰>
```

#### 옵션 2: 개인 Docker Hub 계정 사용

```bash
# 현재 설정 그대로 사용
# 단, 팀원들과 Docker Hub 계정 공유 필요
```

#### Docker Hub 액세스 토큰 생성

1. [Docker Hub](https://hub.docker.com) 로그인
2. `Account Settings` → `Security` → `New Access Token`
3. Token Description: `GitHub Actions - Team Project`
4. Access permissions: `Read, Write, Delete`
5. 생성된 토큰을 복사하여 `DOCKER_PASSWORD`에 저장

---

### 4단계: SSH 키 생성 및 설정

배포 서버에 접근하기 위한 SSH 키를 생성합니다.

#### SSH 키 생성 (로컬 또는 팀 관리자 PC에서)

```bash
# ED25519 키 생성 (권장)
ssh-keygen -t ed25519 -C "github-actions-team" -f ~/.ssh/github_actions_team

# 또는 RSA 키 생성
ssh-keygen -t rsa -b 4096 -C "github-actions-team" -f ~/.ssh/github_actions_team

# 결과:
# ~/.ssh/github_actions_team      (Private Key - GitHub Secret에 저장)
# ~/.ssh/github_actions_team.pub  (Public Key - 서버에 등록)
```

#### 공개키를 배포 서버에 등록

```bash
# 방법 1: ssh-copy-id 사용
ssh-copy-id -i ~/.ssh/github_actions_team.pub ubuntu@YOUR_SERVER_IP

# 방법 2: 수동 등록
cat ~/.ssh/github_actions_team.pub
# 출력된 내용을 복사하여 서버의 ~/.ssh/authorized_keys에 추가
```

#### Private Key를 GitHub Secret에 저장

```bash
# Windows (Git Bash)
cat ~/.ssh/github_actions_team

# 출력된 전체 내용을 복사 (-----BEGIN ... END----- 포함)
# GitHub Secrets의 DEPLOY_SSH_KEY에 붙여넣기
```

---

### 5단계: Workflow 파일 수정 (필요시)

현재 워크플로우 파일들은 대부분 그대로 사용 가능하지만, 팀 환경에 맞게 일부 수정이 필요할 수 있습니다.

#### 수정이 필요한 부분

##### `.github/workflows/backend-ci.yml`

```yaml
# Line 131: Docker 이미지 이름 변경
images: ${{ secrets.DOCKER_USERNAME }}/bigproject-backend

# 팀 이름으로 변경 예시:
images: ${{ secrets.DOCKER_USERNAME }}/team-project-backend
```

##### `.github/workflows/frontend-ci.yml`

```yaml
# Line 95: Docker 이미지 이름 변경
images: ${{ secrets.DOCKER_USERNAME }}/bigproject-frontend

# 팀 이름으로 변경 예시:
images: ${{ secrets.DOCKER_USERNAME }}/team-project-frontend
```

##### `docker-compose.yml` (배포 서버용)

```yaml
# 배포 서버의 docker-compose.yml에서 이미지 이름 변경
services:
  backend:
    image: ${DOCKER_USERNAME}/team-project-backend:latest
  
  frontend:
    image: ${DOCKER_USERNAME}/team-project-frontend:latest
```

---

### 6단계: 배포 서버 설정

팀의 배포 서버에서 다음 작업을 수행합니다.

#### 서버 초기 설정

```bash
# 1. Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. 프로젝트 디렉토리 생성
mkdir -p /home/ubuntu/bigproject
cd /home/ubuntu/bigproject

# 4. Git 설치 및 레포 클론
sudo apt update
sudo apt install -y git
git clone https://github.com/TEAM_ORG/TEAM_REPO.git .

# 5. 환경 변수 설정
cp .env.example .env
nano .env  # 환경 변수 수정
```

#### `.env` 파일 설정 예시

```bash
# Database
POSTGRES_DB=bigproject_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
DB_PORT=5432

# Backend
BACKEND_PORT=8080
JWT_SECRET=VERY_LONG_RANDOM_SECRET_KEY_HERE

# Frontend
FRONTEND_PORT=80

# Docker Hub (배포 서버용)
DOCKER_USERNAME=team-organization
```

#### 초기 배포

```bash
# Docker 이미지 Pull 및 실행
docker-compose pull
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 헬스체크
curl http://localhost:8080/actuator/health
curl http://localhost:80
```

---

### 7단계: 브랜치 보호 규칙 설정 (권장)

팀 협업을 위해 브랜치 보호 규칙을 설정합니다.

**경로**: `팀 레포지토리` → `Settings` → `Branches` → `Add rule`

#### 권장 설정

- **Branch name pattern**: `main`
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1명 이상
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks: `build-and-test (Backend CI)`, `build-and-test (Frontend CI)`
- ✅ **Do not allow bypassing the above settings**

---

## 🔍 테스트 및 검증

### 1. CI 파이프라인 테스트

```bash
# 테스트용 브랜치 생성
git checkout -b test/ci-setup

# 간단한 변경사항 추가
echo "# CI Test" >> README.md
git add README.md
git commit -m "test: CI pipeline test"
git push origin test/ci-setup

# GitHub에서 Pull Request 생성
# Actions 탭에서 워크플로우 실행 확인
```

### 2. Docker 이미지 빌드 테스트

```bash
# main 브랜치에 병합 후
# Actions 탭에서 다음 확인:
# ✅ Backend CI - build-and-test
# ✅ Backend CI - docker-build
# ✅ Frontend CI - build-and-test
# ✅ Frontend CI - docker-build

# Docker Hub에서 이미지 확인
# https://hub.docker.com/r/DOCKER_USERNAME/team-project-backend
# https://hub.docker.com/r/DOCKER_USERNAME/team-project-frontend
```

### 3. 배포 테스트

```bash
# main 브랜치에 푸시 후
# Actions 탭에서 Deploy 워크플로우 확인

# 배포 서버에서 확인
ssh ubuntu@YOUR_SERVER_IP
docker-compose ps
docker-compose logs -f
```

---

## 📊 팀원 온보딩 가이드

팀원들이 로컬에서 개발할 때 필요한 설정입니다.

### 로컬 개발 환경 설정

```bash
# 1. 레포지토리 클론
git clone https://github.com/TEAM_ORG/TEAM_REPO.git
cd TEAM_REPO

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 수정 (로컬 개발용)

# 3. Docker Compose로 전체 스택 실행
docker-compose up -d --build

# 4. 또는 개별 개발 모드
# Backend
./gradlew bootRun

# Frontend
cd frontend
npm install
npm run dev
```

### 개발 워크플로우

```bash
# 1. 최신 코드 받기
git checkout main
git pull origin main

# 2. Feature 브랜치 생성
git checkout -b feature/your-feature-name

# 3. 개발 및 커밋
git add .
git commit -m "feat: add new feature"

# 4. Push 및 PR 생성
git push origin feature/your-feature-name
# GitHub에서 Pull Request 생성

# 5. CI 통과 확인 후 팀원 리뷰 요청

# 6. 승인 후 main 브랜치에 병합
```

---

## 🛠️ 트러블슈팅

### Secrets 관련 오류

```
Error: Docker login failed
```

**해결방법**:
1. GitHub Secrets에 `DOCKER_USERNAME`, `DOCKER_PASSWORD` 확인
2. Docker Hub 토큰이 유효한지 확인
3. 토큰 권한이 Read, Write, Delete인지 확인

### SSH 연결 실패

```
Error: SSH connection failed
```

**해결방법**:
1. `DEPLOY_SSH_KEY`가 올바르게 설정되었는지 확인
2. 서버의 `~/.ssh/authorized_keys`에 공개키가 등록되었는지 확인
3. 서버 방화벽에서 SSH 포트(22)가 열려있는지 확인

### Docker 이미지 Pull 실패

```
Error: pull access denied
```

**해결방법**:
1. Docker Hub에서 이미지가 Public인지 확인
2. Private인 경우 배포 서버에서 `docker login` 실행
3. `docker-compose.yml`의 이미지 이름이 올바른지 확인

---

## 📝 체크리스트

이전 작업 완료 여부를 확인하세요:

### 코드 이전
- [ ] 팀 레포지토리에 코드 Push 완료
- [ ] `.github/workflows/` 폴더 포함 확인
- [ ] `docker-compose.yml`, `Dockerfile` 포함 확인

### GitHub Secrets 설정
- [ ] `DOCKER_USERNAME` 설정
- [ ] `DOCKER_PASSWORD` 설정
- [ ] `DEPLOY_HOST` 설정
- [ ] `DEPLOY_USER` 설정
- [ ] `DEPLOY_SSH_KEY` 설정
- [ ] `DEPLOY_PATH` 설정

### Docker Hub 설정
- [ ] 팀 Docker Hub 계정 생성 (또는 개인 계정 사용)
- [ ] 액세스 토큰 생성
- [ ] 이미지 이름 변경 (필요시)

### 배포 서버 설정
- [ ] Docker 설치
- [ ] Docker Compose 설치
- [ ] SSH 공개키 등록
- [ ] 프로젝트 디렉토리 생성
- [ ] `.env` 파일 설정
- [ ] 초기 배포 완료

### 테스트
- [ ] CI 파이프라인 테스트 완료
- [ ] Docker 이미지 빌드 확인
- [ ] 배포 테스트 완료
- [ ] 헬스체크 통과

### 팀 설정
- [ ] 브랜치 보호 규칙 설정
- [ ] 팀원 권한 부여
- [ ] 팀원 온보딩 문서 공유

---

## 🔗 참고 문서

- [CI-CD-README.md](./CI-CD-README.md) - 전체 CI/CD 아키텍처 문서
- [QUICKSTART.md](./QUICKSTART.md) - 빠른 시작 가이드
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 프로젝트 아키텍처

---

## 💡 추가 권장사항

### 1. 환경 분리

```yaml
# .github/workflows/backend-ci.yml
# develop 브랜치용 스테이징 환경 추가
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  # 스테이징 서버 배포 로직
```

### 2. 알림 설정

```yaml
# Slack 알림 활성화 (.github/workflows/deploy.yml)
- name: Notify deployment status
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 3. 보안 강화

- [ ] Dependabot 활성화 (보안 업데이트 자동화)
- [ ] Code scanning 활성화 (취약점 스캔)
- [ ] Secret scanning 활성화 (시크릿 유출 방지)

**경로**: `팀 레포지토리` → `Settings` → `Security` → `Code security and analysis`

---

## 📞 문의

CI/CD 이전 과정에서 문제가 발생하면 다음을 확인하세요:

1. GitHub Actions 로그 확인
2. Docker 로그 확인: `docker-compose logs -f`
3. 서버 로그 확인: `journalctl -u docker`
4. 이 문서의 트러블슈팅 섹션 참조

---

**작성일**: 2026-01-20  
**버전**: 1.0  
**작성자**: CI/CD 담당자
