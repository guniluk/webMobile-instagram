# 📸 BYH Instagram (실시간 반응형 인스타그램 클론 앱)

이 프로젝트는 **Expo SDK 54 (React Native)**를 기반으로 구축된 모바일 인스타그램 클론 애플리케이션입니다. **Clerk**을 통한 강력한 소셜 인증과 **Convex 서버리스 실시간 데이터베이스 및 스토리지**를 유기적으로 연동하여, 로컬 목데이터(Mock Data) 없이 **100% 실제 데이터로 구동되는 완벽한 모바일 풀스택 서비스**를 구현했습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

### **Frontend (Mobile)**
* **Core Framework**: [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) (React Native)
* **Routing**: Expo Router v6 (파일 시스템 기반 파일 라우팅 구조)
* **Authentication**: [Clerk Expo SDK](https://clerk.com/) (`@clerk/expo` 및 `expo-secure-store` 자동 로그인 세션 캐싱)
* **Database Binding**: Convex React Client (실시간 WebSocket 기반 반응형 훅 `useQuery`, `useMutation`)

### **Backend & Database**
* **Realtime Backend**: [Convex](https://www.convex.dev/) (WebSocket 기반 실시간 데이터 바인딩, 서버리스 Mutation/Query/Action)
* **File Storage**: Convex File Storage (업로드용 퍼블릭 CDN URL 자동 생성 및 스토리지 관리)
* **Webhook Verification**: [Svix](https://www.svix.com/) (Clerk 회원 이벤트를 실시간 백그라운드로 안전하게 검증 및 수신)

---

## 📂 프로젝트 폴더 구조 및 파일 역할

```text
webMobile-instagram/
 ├── app/                      # Expo Router 기반 화면 라우팅 디렉토리
 │    ├── (auth)/              # 비로그인 사용자 전용 화면 (인증 게이트)
 │    │    ├── _layout.tsx     # 인증 페이지 레이아웃
 │    │    └── sign-in.tsx     # Clerk 구글 소셜 로그인 화면
 │    ├── (tabs)/              # 로그인 성공 후 하단 탭 내비게이션 화면군
 │    │    ├── _layout.tsx     # 하단 탭바 레이아웃 및 내비게이션 바
 │    │    ├── index.tsx       # 홈 피드 화면 (상단 유저 목록 고정, 게시글 실시간 뷰, 로그아웃)
 │    │    ├── bookmarks.tsx   # 북마크(저장됨) 목록 화면 (소형 가로 카드식 레이아웃)
 │    │    ├── create.tsx      # 새 게시글 작성 및 Convex 이미지 실제 업로드 화면
 │    │    ├── notification.tsx# 실시간 알림 센터 (좋아요, 댓글, 팔로우 알림 확인 및 개별 지우기)
 │    │    └── profile.tsx     # 프로필 화면 (내 게시글 소형 가로 카드 뷰, 타인 프로필 조회 및 팔로우 토글, Bio 편집)
 │    └── _layout.tsx          # 최상위 루트 레이아웃 (Clerk + Convex Providers 연동 및 초기 유저 동기화)
 ├── assets/                   # 이미지, 아이콘 등 정적 자원
 ├── clerk-expo/               # Clerk 자동 로그인을 위한 유틸 폴더
 │    └── tokenCache.ts        # SecureStore 기반 Clerk Token 암호화 저장 세션 캐시 설정
 ├── constants/                # 테마 색상 등 디자인 상수 정의
 ├── convex/                   # Convex 실시간 백엔드 소스코드 폴더 (핵심 비즈니스 로직)
 │    ├── _generated/          # 자동 생성되는 API 타입 및 바인딩 폴더
 │    ├── auth.config.ts       # Clerk JWT 로그인 토큰 복호화 및 검증용 설정
 │    ├── http.ts              # Clerk Webhook 수신용 엔드포인트 및 Svix 검증 API
 │    ├── schema.ts            # DB 테이블(users, posts, likes, comments, follows, bookmarks, notifications) 스키마 정의
 │    ├── posts.ts             # 게시물 조회, 생성, 삭제 및 업로드 URL 발급 로직
 │    ├── likes.ts             # 좋아요 토글 및 관련 알림 실시간 자동 생성
 │    ├── comments.ts          # 특정 포스트 댓글 목록 조회 및 추가
 │    ├── bookmarks.ts         # 북마크 저장/해제 및 북마크 목록 조회
 │    ├── follows.ts           # 사용자 간 팔로우/언팔로우 토글 및 상태 조회
 │    ├── notifications.ts     # 사용자별 알림 목록 조회 및 개별 삭제
 │    └── users.ts             # Clerk 세션 기준 유저 생성/동기화 및 프로필 변경 쿼리
 ├── store/                    # 기존 Zustand 스토어 흔적 (Convex 실시간 훅 대체로 정리 완료 🧹)
 └── styles/                   # 화면별 디자인/스타일 객체 폴더
```

---

## 🔄 핵심 아키텍처 및 데이터 흐름 (Data Flow)

### **1. 유저 정보 동기화 및 Clerk Webhook**
1. 사용자가 모바일 앱에서 **구글 소셜 로그인**을 진행하면 Clerk 토큰 세션이 발급됩니다.
2. [app/_layout.tsx](file:///Users/guniluk/Desktop/CLI/webMobile-instagram/app/_layout.tsx)에서 로그인 세션 수립을 감지하면 Convex 백엔드의 `storeUser` Mutation을 호출하여 **Convex 데이터베이스 `users` 테이블에 자동으로 유저가 동기화**됩니다.
3. 백그라운드에서는 Clerk에서 사용자 프로필 정보가 변경되거나 계정이 삭제될 경우, [convex/http.ts](file:///Users/guniluk/Desktop/CLI/webMobile-instagram/convex/http.ts)로 웹훅을 안전하게 송출해 실시간으로 유저 데이터를 보정합니다.

### **2. 실시간 반응형 데이터 바인딩**
* 이 프로젝트는 로컬 상태 관리 라이브러리 대신, **Convex의 WebSocket 실시간 구독 기능**을 직접 씁니다.
* 컴포넌트가 `useQuery(api.posts.getPosts)`를 호출하고 있으면, 다른 사용자가 새로운 피드를 올리거나 좋아요를 누르는 순간 **DB 변경 사항이 모바일 화면에 즉시 재렌더링**됩니다. 별도의 Pull-to-refresh 나 API 새로고침 호출이 불필요합니다.

### **3. 실제 이미지 업로드 프로세스 (Convex File Storage)**
1. `expo-image-picker`를 통해 디바이스 사진 앨범에서 이미지를 가져옵니다.
2. Convex의 `api.posts.generateUploadUrl`을 호출하여 백엔드로부터 안전한 **임시 업로드 CDN URL**을 발급받습니다.
3. 발급받은 URL로 이미지 바이너리 파일을 직접 `POST` 전송합니다.
4. 업로드 완료 시 반환된 `storageId`를 가지고 `api.posts.createPost` Mutation을 실행하여 피드 글을 완전히 게시합니다.

### **4. Cascade Delete (연관 데이터 일괄 영구 삭제)**
* 내가 작성한 포스트의 `...` (더보기) 버튼을 눌러 삭제를 시도할 경우, 백엔드의 `deletePost` Mutation이 실행됩니다.
* 이때 **단 한 번의 요청**으로 다음 연관 데이터들이 완전히 영구 삭제됩니다:
  1. Convex File Storage 내의 **실제 사진 이미지 파일** 삭제.
  2. 해당 포스트에 달린 **모든 댓글(comments)** 삭제.
  3. 해당 포스트의 **모든 좋아요(likes)** 삭제.
  4. 다른 사용자들이 해당 포스트를 저장해 둔 **모든 북마크(bookmarks)** 삭제.
  5. 해당 포스트로 인해 타인에게 수신되었던 **모든 실시간 활동 알림(notifications)** 삭제.
  6. 포스트 테이블에서 해당 포스트 삭제 및 작성 유저의 포스트 카운트 1 감소.

---

## 💻 화면 기능 및 주요 UI 명세

### 1. 홈 피드 화면 (`index.tsx`)
* **상단 유저 목록 고정 (Header Fixed)**: 세로 스크롤 시에도 상단의 스토리 라인(유저들의 아바타 링 목록)은 상단에 스태틱하게 고정되어 스크롤되지 않고, 하단의 피드 카드 목록들만 독립적으로 부드럽게 세로 스크롤됩니다.
* **스토리 팔로우 연동**: 상단 스토리 목록에서 나 이외의 다른 유저 아바타를 터치하면 팝업창이 등장하여 즉석에서 팔로우/언팔로우를 토글할 수 있습니다.
* **더보기(`...`) 메뉴 분기**: 
  * 내 글일 경우: `Delete Post` (글 및 연관 데이터 전체 완전 삭제) 버튼이 나타납니다.
  * 타인의 글일 경우: `Follow` 또는 `Unfollow` 버튼이 나타납니다.
* **로그아웃**: 브랜드 타이틀 옆에 로그아웃 아이콘(`log-out-outline`)이 노출되며, 클릭 시 Clerk 세션을 완전히 파기하고 로그인 화면으로 돌아갑니다.

### 2. 프로필 화면 (`profile.tsx`)
* **본인/타인 통합 뷰**: `username` 파라미터 유무에 따라 내 프로필 편집과 타인의 프로필(팔로우/언팔로우 버튼 제공 및 상대 통계) 조회를 동적으로 한 화면에서 매끄럽게 처리합니다.
* **가로형 소형 카드 나열**: 내가 올린 글 목록은 거대한 피드 카드와 달리 **왼쪽에 80x80 크기의 소형 둥근 이미지, 오른쪽에 작성글 본문, 좋아요 수, 액션 아이콘들**이 집약된 세련된 미니 행 카드로 조밀하게 표현됩니다.
* **소개글(Bio) 단독 수정**: 프로필 수정 모달에서 Name 입력 필드를 걷어내고, 오직 Bio(소개글)만 편집하여 안전하게 저장하도록 폼을 제한했습니다.

### 3. 북마크 화면 (`bookmarks.tsx`)
* **북마크 피드 뷰**: 내가 북마크한 저장된 포스트들을 프로필 하단과 동일한 가로형 소형 카드 리스트로 렌더링합니다.
* **실시간 저장 해제**: 카드 내 북마크 아이콘을 눌러 저장을 해제하면 실시간 DB 반응형 동작에 의해 목록에서 즉각 제거됩니다.

### 4. 실시간 알림 화면 (`notification.tsx`)
* 좋아요, 댓글 작성, 팔로우 발생 시 송신자의 프로필 아바타와 관련 포스트 썸네일(있을 시)이 노출되는 알림 카드 목록입니다.
* 알림 목록 우측 끝에 개별 **삭제(X) 버튼**을 추가하여, 읽지 않거나 필요 없는 알림 내역을 데이터베이스에서 즉각 제거할 수 있습니다.

---

## 🚀 초보자를 위한 설치 및 시작 가이드

### **Step 1: 패키지 의존성 설치**
터미널을 열고 프로젝트 루트 경로로 이동하여 아래 명령어로 필요한 라이브러리들을 설치합니다:
```bash
npm install
```

### **Step 2: 환경 변수 파일 생성**
프로젝트 루트 디렉토리에 `.env.local` 이라는 이름의 파일을 만들고 아래 두 개의 환경변수 값을 기입합니다:
```env
# Clerk Publishable Key (Clerk Dashboard에서 복사)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex Endpoint URL (Convex Dev 실행 시 자동 기입 또는 Convex Dashboard에서 복사)
EXPO_PUBLIC_CONVEX_URL=https://...
```

### **Step 3: Convex 개발 모드 및 스키마/타입 생성 (최초 1회 필수 🌟)**
Convex 백엔드 함수를 클라우드에 배포하고, 로컬 프론트엔드 코드에 필요한 API 바인딩 타입 파일들을 자동 생성하기 위해 백엔드 빌드 엔진을 켭니다:
```bash
npx convex dev
```
* 최초 실행 시 웹 브라우저 창이 열리며 Convex 로그인 페이지가 뜹니다. 로그인을 완료해주시면 자동으로 클라우드 인스턴스가 배포되고 동기화 상태가 켜집니다.
* 소스코드가 수정되거나 저장될 때마다 백엔드가 즉시 빌드 및 리로드 배포됩니다.

### **Step 4: 모바일 앱 구동**
개발 서버가 준비되었으므로 Expo 모바일 번들러를 기동합니다:
```bash
npx expo start
```
* **리로드 팁**: 코드 변경 후 화면에 변경 사항이 즉각 갱신되지 않는 등 캐시 꼬임이 의심된다면 터미널 창에서 **`r` 키**를 입력해 앱을 새로고침하거나, 개발 서버를 종료하고 `npx expo start -c` 명령어로 캐시를 비우고 재시작해 주세요.

---

## 🔒 보안 및 주의 사항
1. **`.env.local` 파일은 절대로 Git 저장소(Github 등)에 업로드(Commit)하지 마세요.** 개인 API 인증 정보 키 유출의 위험이 있습니다.
2. Clerk 대시보드의 **Redirect URLs** 섹션에 모바일 딥링크 리디렉션 주소(`webmobileinstagram://(tabs)`)를 정확하게 추가해주어야 소셜 로그인이 정상 기동됩니다.
