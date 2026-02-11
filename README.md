# AI 기반 레시피 및 트렌드 분석 플랫폼 (BigProject)

[![Frontend CI](https://github.com/kimchiman123/actions_test/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kimchiman123/actions_test/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/kimchiman123/actions_test/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kimchiman123/actions_test/actions/workflows/backend-ci.yml)

## 📖 프로젝트 개요

"오늘 뭐 먹지?"라는 현대인의 고민을 **AI 기술**과 **데이터 기반 트렌드 분석**으로 해결하는 플랫폼입니다.
사용자는 개인 맞춤형 레시피를 추천받을 뿐만 아니라, 현재 식품 시장에서 어떤 재료가 뜨고 있는지 실시간 트렌드 정보를 통해 파악할 수 있습니다.
이 프로젝트는 **Microservices Architecture (MSA)** 를 지향하며, 각 서비스는 Azure 클라우드 환경에서 유기적으로 연결되어 동작합니다.

---

## 🏗️ 시스템 아키텍처

![System Architecture](./assets/architecture.png)

### 1. **Client & Frontend (사용자 경험 중심)**
- **Tech Stack**: React 18, Vite, TailwindCSS
- **Role**: 직관적이고 반응성 높은 UI를 제공합니다. 사용자는 채팅 인터페이스를 통해 AI와 자연스럽게 소통하며, 대시보드에서 복잡한 데이터를 시각적으로 쉽게 이해할 수 있습니다.
- **Micro-animations**: 버튼 클릭, 페이지 전환 등에 미세한 애니메이션을 적용하여 사용성을 강화했습니다.

### 2. **Backend Core (안정적인 데이터 처리)**
- **Tech Stack**: Spring Boot 3.x, Java 17, Spring Security
- **Role**: 시스템의 중추로서 사용자 인증, 데이터 저장, 그리고 각 마이크로서비스 간의 통신을 조율합니다.
- **API Gateway**: 프론트엔드로부터의 요청을 적절한 서비스(Chatbot, Analysis)로 라우팅합니다.

### 3. **AI Chatbot Service (대화형 지능)**
- **Tech Stack**: Python, LangGraph, OpenAI GPT-4o, Gradio
- **Advanced Logic**: 단순한 텍스트 생성을 넘어, RAG(검색 증강 생성) 기술을 활용하여 최신 트렌드 정보를 반영한 레시피를 창작합니다.

### 4. **Analysis Engine (데이터 인사이트)**
- **Tech Stack**: Python, Pandas, Scikit-learn
- **Automation**: 주기적으로 웹상의 식품 데이터를 수집, 정제, 분석하여 트렌드 변화를 감지합니다.

### 5. **Infrastructure (클라우드 네이티브)**
- **Azure Container Apps (ACA)**: 서버리스 환경에서 각 컨테이너를 효율적으로 오케스트레이션합니다.
- **Data Persistence**: PostgreSQL은 정형 데이터를, Azure Files는 대용량 분석 데이터 모델을 공유하는 데 사용됩니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 🥑 AI 레시피 생성 및 챗봇
**"냉장고 속 재료로 만드는 최고의 요리"**
- **대화형 레시피 생성**: 사용자가 보유한 재료나 현재 기분("매운게 땡겨")을 입력하면, AI가 즉석에서 창의적인 레시피를 제안합니다.
- **수요 예측 기반 추천 (Trend-Driven RAG)**: 단순히 맛있는 요리가 아니라, 현재 소셜 미디어와 검색 데이터에서 급상승 중인 '핫한' 식재료를 반영하여 트렌디한 메뉴를 추천합니다.
- **헬퍼 챗봇**: 사이트 이용 방법이 궁금하거나, 요리 용어가 낯설 때 언제든 물어볼 수 있는 도우미 챗봇이 상시 대기 중입니다.

### 2. 📊 데이터 분석 및 인사이트
**"데이터로 보는 맛의 흐름"**
- **트렌드 대시보드**: "김치", "비빔밥" 등 핵심 K-Food 키워드에 대한 글로벌/로컬 관심도 변화를 그래프로 시각화하여 매일 업데이트합니다.
- **소비자 반응 분석**: 긍정/부정 리뷰 비율, 연관 키워드(예: "매운맛", "건강", "비건") 분석을 통해 소비자가 무엇을 원하는지 파악합니다.
- **비즈니스 인사이트**: 단순 통계 수치를 넘어, 매출 성장을 견인하는 **'구매 결정 요인'** 과 주의해야 할 **'잠재적 리스크 요인'** 을 도출하여 비즈니스 의사 결정을 돕습니다.

### 3. 📑 자동 보고서 생성 (PDF Automation)
**"복잡한 분석 결과를 파일 하나로"**
- **원클릭 리포트**: 생성한 레시피를 바탕으로 Agent 심사위원과 
각종 요소를 고려한 평가를 거쳐 깔끔하게 정리된 PDF 문서로 자동 변환합니다.
- **자동화된 문서화**: 별도의 편집 과정 없이, 생성된 레시피를 공유용 자료로 활용할 수 있도록 최적화된 레이아웃을 제공합니다.

### 4. 🔐 강력한 보안 구성
**"보이지 않는 곳까지 안전하게"**
- **Naver OAuth2 로그인**: 복잡한 가입 절차 없이, 기존 네이버 아이디로 빠르고 안전하게 서비스를 이용할 수 있습니다.
- **CSRF & CORS 정책**:
    - 브라우저 요청에 대해서는 철저한 **CSRF 토큰 검증**을 수행하여 보안 위협을 차단합니다.
    - 반면, 내부 서비스(Chatbot ↔ Backend) 간의 통신은 예외 처리를 적용하여 보안과 운영 효율성의 균형을 맞췄습니다.
- **보안 쿠키 설정**: `SameSite=None`, `Secure` 속성을 적용하여 서로 다른 도메인 간의 인증 흐름에서도 세션이 끊기지 않고 안전하게 유지되도록 설계했습니다.
- **데이터 암호화**: 사용자 비밀번호 및 민감 정보는 업계 표준인 **BCrypt** 알고리즘으로 강력하게 암호화되어 저장됩니다.

---

## 🔄 CI/CD 파이프라인 (Automated Deployment)

개발자가 코드를 작성하고 배포하기까지의 모든 과정을 자동화하여, **안정성**과 **배포 속도**를 동시에 확보했습니다.

![CI/CD Pipeline](https://mermaid.ink/img/pako:eNpVkM1qw0AMhF9F7LUK8gI-FAppSzcU2uRQ2EvaqzWytbK-sGRJ2Rjy7pWd_Cm0l4FvRjOjweRSMxz4XfG94f1mC8bvQ_OE7Xq9T_i4P-zQPCdcb_f4SDe0X-8TPhJ-nO7wS_vH9gE_L7f4c_uI39q_t0_4r_b77Qv-aP_avmA63eGf9u_tC_5q_9q-YDzf4Z_27-0L_mr_2r5gOt_hn_bv7QuGaYd_2s82-KP9a4M_2r82-KP9a4M_2r82-KP9a4M_2r82-KP9a4M_2r82-KP9a4M_2r82-KP9a4M_2rnBH-2c4Y92zvBHO2f4o50z_NHOGf5o5wx_tHOGP9o5wx_tnOGPds7wRztn-KOdM_zRzhn-aOcMf7Rzhj_aOcMf7Zzhj3bO8Ec7Z_ijnTP80c4Z_mjnDH-0c4Y_2jnDH-2c4Y92zvBHO2f4o50z_NHOGf5o5wx_tHOGP9o5wx_tnOGPds7wRztn-KOdM_zRzhn-aOcMf7Rzhj_aOcMf7Zzhj3bO8Ec7Z_ijnTP80c4Z_mjnDH-0c4Y_2jnDM_L5B-W2q0E)

### 1. Code Commit & Trigger
- 개발자가 `cloud` 또는 `main` 브랜치에 코드를 푸시하면 GitHub Actions가 즉시 실행됩니다.
- 변경된 경로(Frontend, Backend 등)를 감지하여 필요한 워크플로우만 효율적으로 수행합니다.

### 2. Build & Test (품질 보증)
- **Frontend**: Node.js 환경에서 의존성을 설치하고 프로덕션용 정적 파일을 빌드합니다.
- **Backend (Spring Boot)**: Gradle을 통해 컴파일 및 단위 테스트를 수행하여 코드 무결성을 검증합니다.
- **AI Services (Python)**: Dockerfile 기반으로 최적화된 컨테이너 이미지를 빌드합니다.

### 3. Container Registry (이미지 관리)
- 빌드된 모든 서비스의 이미지는 **Azure Container Registry (ACR)** 에 태그(버전)별로 안전하게 저장됩니다.

### 4. Continuous Deployment (무중단 배포)
- **Azure Container Apps (ACA)** 가 새로운 이미지 버전을 감지하고 자동으로 업데이트를 시작합니다.
- 트래픽 분할(Traffic Splitting) 기능을 활용하여, 새로운 버전이 안정적인지 확인 후 트래픽을 완전히 전환하는 **Blue/Green 배포** 전략을 지원합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React 18, Vite 5
- **Style**: TailwindCSS
- **State**: Context API, React Query

### Backend
- **Framework**: Spring Boot 3.2, Spring Security 6
- **Language**: Java 17
- **Build**: Gradle

### Data & AI
- **Language**: Python 3.11
- **Libraries**: Pandas, Scikit-learn, LangChain
- **AI Model**: OpenAI GPT-4o
- **Framework**: FastAPI, Gradio

### DevOps & Infrastructure
- **Container**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Cloud**: Azure Container Apps (Serverless Containers)
- **Database**: PostgreSQL 16 (Managed Service)

---

## 🏃‍♂️ 시작하기 (Getting Started)

### 로컬 개발 환경 설정

1. **저장소 클론**
   ```bash
   git clone https://github.com/kimchiman123/actions_test.git
   cd actions_test
   ```

2. **환경 변수 설정**
   `.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 필요한 API 키(OpenAI, Naver Client ID 등)를 입력합니다.
   ```bash
   cp .env.example .env
   ```

3. **서비스 실행 (Docker Compose)**
   한 번의 명령어로 모든 서비스를 로컬에서 실행할 수 있습니다.
   ```bash
   docker-compose up -d --build
   ```

4. **접속 주소**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:8080
   - **AI Chatbot**: http://localhost:7860
