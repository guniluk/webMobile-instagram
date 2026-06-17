# 📸 WebMobile-Instagram (인스타그램 클론 앱)

Expo SDK 54를 기반으로 구축된 인스타그램 클론 코딩 모바일 어플리케이션 프로젝트입니다. Clerk을 이용한 소셜 사용자 인증과 Zustand를 통한 상태 관리가 세팅되어 있으며, 백엔드로 **Convex 실시간 반응형 데이터베이스**를 연동하여 가입자 정보 동기화 및 API 서버 환경이 완비되어 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **프레임워크**: [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) (React Native)
* **라우팅 및 내비게이션**: Expo Router v6 (파일 시스템 기반 라우팅)
* **인증 (Authentication)**: [Clerk](https://clerk.com/) (`@clerk/expo` 및 `expo-secure-store` 자동 로그인 연동)
* **백엔드 및 데이터베이스**: [Convex](https://www.convex.dev/) (실시간 반응형 백엔드 함수, 스키마, HTTP API 내장)
* **상태 관리**: [Zustand](https://github.com/pmndrs/zustand)
* **스타일링**: 컴포넌트 전용 TypeScript 스타일 객체 기반 디자인 시스템

---

## 📂 프로젝트 폴더 구조 (Project Structure)

```text
webMobile-instagram/
 ├── app/                  # Expo Router 기반의 라우팅 폴더 (화면 정의)
 │    ├── (auth)/          # 비로그인 사용자 전용 화면 (인증 레이아웃)
 │    │    ├── _layout.tsx # 인증 레이아웃 설정
 │    │    └── sign-in.tsx # Clerk 소셜 로그인 화면 (버튼 여백 보완 완료 🎨)
 │    ├── (tabs)/          # 로그인 완료 후의 하단 탭 메인 화면군
 │    │    ├── _layout.tsx # 메인 탭 내비게이션 바 레이아웃
 │    │    ├── index.tsx   # 홈 피드 화면
 │    │    ├── bookmarks.tsx # 북마크(저장됨) 목록 화면
 │    │    ├── create.tsx  # 피드 포스트 업로드 화면
 │    │    ├── notification.tsx # 알림 확인 화면
 │    │    └── profile.tsx # 유저 프로필 및 내 게시물 화면
 │    └── _layout.tsx      # 최상위 루트 레이아웃 (Clerk + Convex Provider 통합 및 자동 가입 저장 연동 🔄)
 ├── assets/               # 이미지, 폰트 등 정적 에셋
 ├── clerk-expo/           # Clerk의 인증 토큰 보관을 위한 유틸 폴더
 │    └── tokenCache.ts    # SecureStore 기반 Clerk Token 캐시 설정
 ├── constants/            # 테마 정보 등 공통 상수 폴더
 │    └── theme.ts         # 색상, 마진 등 공통 스타일 테마 변수 정의
 ├── convex/               # Convex 백엔드 서버리스 코드 폴더
 │    ├── _generated/      # 자동 생성된 API 타입 및 바인딩 폴더
 │    ├── auth.config.ts   # Clerk JWT 인증 연동 설정 파일
 │    ├── http.ts          # Clerk Webhook 수신 및 서명 검증(Svix) API 파일
 │    ├── schema.ts        # 데이터베이스 테이블 통합 스키마 정의 파일
 │    └── users.ts         # 유저 데이터 저장, 조회, 동기화 처리 함수 파일
 ├── store/                # Zustand 상태 스토어 폴더
 └── styles/               # 화면별 스타일 코드를 분리 관리하는 스타일 폴더
```

---

## 🔄 현재까지 구현된 기능 및 진행 프로세스

### 1. Clerk 소셜(Google) 로그인 및 자동 세션 관리
* [sign-in.tsx](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/app/(auth)/sign-in.tsx)에 `@clerk/expo`의 `useSSO` 훅을 사용해 모바일 구글 로그인을 연동했습니다.
* [tokenCache.ts](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/clerk-expo/tokenCache.ts)를 통해 모바일 기기 저장소(`SecureStore`)에 토큰을 안전하게 캐싱하여 자동 로그인을 구현했습니다.
* **디자인 개선:** 브랜드 로고/설명 영역과 구글 로그인 버튼 사이의 스페이싱 마진을 조정하여 UI 완성도를 높였습니다.

### 2. Convex 실시간 반응형 백엔드 세팅
* **데이터베이스 스키마 설계 완료:** [schema.ts](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/convex/schema.ts)에 인스타그램 핵심 모델인 `users`, `posts`, `comments`, `likes`, `follows`, `notifications`, `bookmarks` 테이블 구조를 설계하고 인덱스를 생성했습니다.
* **Clerk JWT 인증 게이트웨이 개설:** [auth.config.ts](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/convex/auth.config.ts)를 통해 Clerk에서 발행한 로그인 토큰을 Convex 백엔드가 직접 검증하고 식별할 수 있도록 다리를 놓았습니다.

### 3. 로그인 성공 시 Convex DB 사용자 자동 동기화
* [app/_layout.tsx](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/app/_layout.tsx)에서 사용자가 Google 로그인을 통과하여 세션이 활성화되면, 백엔드의 `storeUser` Mutation을 호출하여 **Convex 데이터베이스 `users` 테이블에 자동으로 유저 정보가 저장/동기화**되도록 보완했습니다. (이미 있는 사용자의 경우 최신 프로필 자동 반영)

### 4. Clerk Webhook 연동용 수신 엔드포인트 구축
* Svix 서명 검증이 내장된 [http.ts](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/convex/http.ts) HTTP Action 엔드포인트를 구현하여 Clerk 대시보드에서 전송되는 `user.created`, `user.updated` 이벤트를 실시간 수신 및 DB 동기화할 수 있도록 고급 연동 백본을 구축했습니다.

---

## 🚀 시작 가이드 (Quick Start)

### 1. 의존성 패키지 설치
```bash
npm install
```

### 2. 환경 변수(Env) 설정
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 Clerk 및 Convex 키값을 등록합니다.
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
EXPO_PUBLIC_CONVEX_URL=your_convex_endpoint_url
```

### 3. Convex 개발 및 타입 코드 생성 (필수 🌟)
다른 PC에서 최초 실행하거나 새로운 셋업 시, generated 폴더의 API 타입을 활성화하기 위해 아래 명령어를 먼저 한 번 실행합니다.
```bash
# 개발 실시간 동기화 실행 (자동으로 타입 코드가 로컬에 생성됨)
npx convex dev
```

### 4. 모바일 에뮬레이터/Expo Go 구동
```bash
npx expo start
```

---

## 📋 향후 진행해야 할 일들 (To-Do List)

현재 인증 및 백엔드 데이터베이스 토대가 완전하게 구축되었으므로, 앞으로는 로컬 목데이터(Mock Data) 기반의 각 기능 화면들을 **Convex 실시간 데이터베이스 API**로 완전히 교체 및 실기능 구현을 진행해야 합니다.

### 1. Zustand Mock Data ➡️ Convex 실시간 쿼리로 마이그레이션
- [x] 사용자 인증 시 DB 자동 동기화 (`storeUser` 연동 완료)
- [ ] **피드 화면 (`(tabs)/index.tsx`):** Zustand 전역 포스트 데이터를 Convex `posts` 및 `users` 테이블 조인 쿼리(`useQuery`)로 마이그레이션하여 실시간 포스트 목록 수신.
- [ ] **프로필 화면 (`(tabs)/profile.tsx`):** 로그인된 사용자의 실제 포스트 카운트, 팔로워/팔로잉 카운트 및 작성글 리스트를 Convex DB 조회 데이터로 연동.

### 2. 피드 포스트 생성 및 이미지 스토리지 업로드 구현
- [ ] **게시글 업로드 (`(tabs)/create.tsx`):** 모바일에서 선택한 이미지를 **Convex File Storage**에 업로드하고, 스토리지 ID(`storageId`) 및 이미지 URL을 받아 `posts` 테이블에 새 문서 생성(`useMutation`) 기능 구현.

### 3. 인스타그램 상세 핵심 소셜 기능 실구현
- [ ] **좋아요(Likes) 시스템:** 피드 카드에서 하트를 누르면 `likes` 테이블에 추가/삭제되며 포스트 좋아요 카운트가 실시간 업데이트되는 인터랙티브 UI 구현.
- [ ] **댓글(Comments) 시스템:** 각 포스트 상세 페이지에서 댓글 목록 조회 및 작성 기능.
- [ ] **팔로우(Follows) 관계:** 프로필 화면에서 타 사용자를 팔로우/언팔로우 처리하고 관계를 반영하는 기능.
- [ ] **실시간 알림(Notifications):** 누군가 내 포스트에 좋아요/댓글을 남기거나 나를 팔로우하면 알림 정보가 발생하고 목록 화면에 즉시 적재되는 기능.
