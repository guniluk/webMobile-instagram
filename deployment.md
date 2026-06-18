# 🚀 Expo + Convex + Clerk 상용 배포 가이드 (Deployment Guide)

이 문서는 로컬 개발 환경(`npx convex dev`, `npm run start`)에서 개발된 Expo 앱을 실제 사용자가 사용할 수 있도록 상용(Production) 환경으로 안전하게 배포하는 전체 프로세스를 일의 순서대로 정리한 가이드라인입니다.

---

## 🗺️ 전체 배포 프로세스 요약 (파이프라인)

```
[1단계: Clerk]          [2단계: Convex]           [3단계: Expo EAS]         [4단계: 스토어]
상용 인스턴스 활성화  ➡️  Production 서버 배포  ➡️  환경 변수 주입 & 빌드  ➡️  App Store / Play 스토어
& 도메인/앱 식별자 설정    & Clerk 환경 변수 등록      (`eas.json` 설정)          최종 심사 및 출시
```

---

## 🛠️ 단계별 상세 절차 및 방법

### 1단계: Clerk (인증 시스템) 상용 환경 구축
가장 먼저 사용자의 회원가입 및 로그인을 담당하는 Clerk을 상용 모드로 전환해야 합니다.

1. **Clerk 대시보드 접속 및 환경 전환**
   * Clerk 대시보드에 로그인한 후, 좌측 상단 환경 셀렉터에서 **Development**에서 **Production** 모드로 전환합니다. (처음이라면 Production 인스턴스를 활성화합니다.)
2. **프로덕션 도메인 연결 (Production Domain)**
   * 상용 환경에서는 서비스의 실제 도메인(예: `auth.myapp.com` 또는 `myapp.com`)이 필요합니다. Clerk 지침에 따라 DNS 레코드(CNAME)를 본인의 도메인 관리 사이트(가비아, AWS Route53 등)에 등록합니다.
3. **네이티브 앱 식별자 등록 (Native Applications 설정)**
   * 모바일 앱에서 로그인이 끝난 후 다시 우리 앱으로 안전하게 돌아올 수 있도록(Deep Linking), 앱의 고유 식별자를 등록해야 합니다.
   * **iOS:** Bundle Identifier (예: `com.username.myapp`)
   * **Android:** Package Name (예: `com.username.myapp`)
   * 대시보드 내 `Paths` 또는 `Redirect URLs` 설정에서 앱의 스키마(`myapp://redirect`)를 Allowlist에 추가합니다.
4. **상용 키(Production Keys) 복사**
   * Production 환경 전용으로 발급된 `Publishable Key`와 `Secret Key`를 안전한 곳에 복사해 둡니다.

---

### 2단계: Convex (백엔드 & 데이터베이스) 상용 배포
내 컴퓨터가 꺼져도 데이터베이스와 백엔드 함수(API)가 작동하도록 Convex의 상용 클라우드에 코드를 배포합니다.

1. **Convex 프로덕션 배포 명령어 실행**
   * 터미널을 열고 프로젝트 루트 폴더에서 아래 명령어를 입력합니다.
     ```bash
     npx convex deploy
     ```
   * 이 명령은 로컬의 `convex/` 폴더에 있는 모든 스키마와 함수 코드를 Convex의 정식 상용 서버로 업로드합니다.
   * 성공적으로 완료되면 상용 전용 **Convex Deployment URL**(`https://happy-animal-123.convex.cloud`)이 새로 발급됩니다.
2. **Convex 상용 대시보드에 Clerk 연동 설정**
   * Convex 대시보드(`dashboard.convex.dev`)로 이동하여 방금 만든 상용 프로젝트를 선택합니다.
   * **Project Settings(프로젝트 설정) -> Environment Variables(환경 변수)** 메뉴로 이동합니다.
   * 1단계에서 복사한 **Clerk Production용 환경 변수**들을 입력합니다. (예: `CLERK_JWT_ISSUER_URL` 등 JWKS 검증에 필요한 값)
   * 💡 *이 작업을 해주어야 상용 Convex 서버가 앱에서 넘어오는 Clerk 로그인 토큰이 진짜인지 가짜인지 판별할 수 있습니다.*

---

### 3단계: Expo 앱 환경 변수 설정 및 EAS 빌드 준비
클라이언트(앱) 코드가 상용 Convex 서버와 상용 Clerk 서버를 바라보도록 설정하고 빌드 프로세스를 가동합니다.

1. **EAS CLI 설치 및 로그인 확인**
   * Expo의 클라우드 빌드 시스템인 EAS가 설치되어 있는지 확인합니다.
     ```bash
     npm install -g eas-cli
     eas login
     eas build:configure
     ```
2. **`eas.json` 파일에 상용 환경 변수 주입**
   * 프로젝트 루트에 있는 `eas.json` 파일을 열고, `build.production.env` 섹션에 상용 환경 변수들을 명시합니다. 로컬에서 쓰던 `.env.local` 주소들을 적으면 안 됩니다.
   * 예시 설정:
     ```json
     {
       "build": {
         "development": { ... },
         "production": {
           "env": {
             "EXPO_PUBLIC_CONVEX_URL": "https://your-production-convex-url.convex.cloud",
             "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_your_clerk_production_key"
           }
         }
       }
     }
     ```
   * *주의: `EXPO_PUBLIC_`으로 시작하는 변수들은 빌드 시 자바스크립트 코드 번들에 포함되어 앱에 내장됩니다.*

---

### 4단계: 최종 네이티브 빌드 및 스토어 제출
이제 실제 스마트폰에 설치할 수 있는 정식 앱 파일(`.ipa` 또는 `.aab`)을 만듭니다.

1. **상용 빌드 명령어 실행**
   * 터미널에서 iOS와 Android용 상용 버전을 동시에 빌드하는 명령어를 실행합니다.
     ```bash
     eas build --platform all --profile production
     ```
   * Expo의 원격 클라우드 서버에서 빌드가 진행되며, 몇 분 후 완료되면 최종 앱 파일을 다운로드할 수 있는 대시보드 링크를 제공합니다.
2. **스토어 제출 (Submission)**
   * 빌드가 완료된 파일은 **Apple App Store Connect** 및 **Google Play Console**에 업로드합니다.
   * 명령어 뒤에 `--auto-submit` 옵션을 붙이거나 `eas submit` 명령어를 사용하면 Expo가 스토어에 자동으로 파일을 업로드해 주기도 합니다.
3. **앱스토어 심사 및 출시**
   * 각 스토어 대시보드에서 앱 정보, 스크린샷, 개인정보처리방침 등을 입력한 후 **심사 제출**을 진행합니다. 심사가 통과되면 전 세계 사용자가 사용할 수 있게 됩니다.

---

## 🔄 유지보수 및 업데이트 (OTA: Over-The-Air)

앱이 이미 스토어에 출시된 이후, 간단한 자바스크립트 버그 수정이나 UI 색상 변경, Convex API 호출 로직 변경 등이 발생했을 때는 번거로운 **스토어 심사를 다시 거치지 않고 즉시 업데이트**할 수 있습니다.

```bash
eas update --branch production
```
이 명령어를 실행하면 사용자가 앱을 완전히 종료했다가 다시 켤 때 새로운 코드가 백그라운드에서 다운로드되어 즉시 적용됩니다. (단, Native 모듈 변경이나 `app.json` 구조 변경 시에는 4단계의 `eas build`를 다시 해야 합니다.)

---
✍️ *본 문서는 개발 프로세스 체크리스트로 활용하시기 바랍니다.*
