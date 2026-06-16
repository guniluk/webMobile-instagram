# 📸 WebMobile-Instagram (인스타그램 클론 앱)

Expo SDK 54를 기반으로 구축된 인스타그램 클론 코딩 모바일 어플리케이션 프로젝트입니다. Clerk을 이용한 사용자 인증과 Zustand를 통한 전역 상태 관리가 구현되어 있으며, 향후 Convex 데이터베이스와의 실시간 연동을 예정하고 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **프레임워크**: [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) (React Native)
* **라우팅 및 내비게이션**: Expo Router v6 (파일 시스템 기반 라우팅)
* **인증 (Authentication)**: [Clerk](https://clerk.com/) (`@clerk/expo` 및 `expo-secure-store`를 활용한 보안 캐싱)
* **상태 관리**: [Zustand](https://github.com/pmndrs/zustand) (포스트 및 사용자 상태 관리)
* **스타일링**: 컴포넌트 전용 TypeScript 스타일 객체 기반 디자인 시스템
* **데이터베이스 (예정)**: [Convex](https://www.convex.dev/) (실시간 반응형 백엔드/데이터베이스 연동 예정)

---

## 📂 프로젝트 폴더 구조 (Project Structure)

```text
webMobile-instagram/
 ├── app/                  # Expo Router 기반의 라우팅 폴더 (화면 정의)
 │    ├── (auth)/          # 비로그인 사용자 전용 화면 (인증 레이아웃)
 │    │    ├── _layout.tsx # 인증 레이아웃 설정
 │    │    └── sign-in.tsx # Clerk 소셜 로그인 화면
 │    ├── (tabs)/          # 로그인 완료 후의 하단 탭 메인 화면군
 │    │    ├── _layout.tsx # 메인 탭 내비게이션 바 레이아웃
 │    │    ├── index.tsx   # 홈 피드 화면
 │    │    ├── bookmarks.tsx # 북마크(저장됨) 목록 화면
 │    │    ├── create.tsx  # 피드 포스트 업로드 화면
 │    │    ├── notification.tsx # 알림 확인 화면
 │    │    └── profile.tsx # 유저 프로필 및 내 게시물 화면
 │    ├── _layout.tsx      # 최상위 루트 레이아웃 (ClerkProvider 주입 등)
 │    └── index.tsx        # 앱 진입점 및 로그인 여부 분기점
 ├── assets/               # 이미지, 폰트 등 정적 에셋
 ├── clerk-expo/           # Clerk의 인증 토큰 보관을 위한 유틸 폴더
 │    └── tokenCache.ts    # SecureStore 기반 Clerk Token 캐시 설정
 ├── constants/            # 테마 정보 등 공통 상수 폴더
 │    └── theme.ts         # 색상, 마진 등 공통 스타일 테마 변수 정의
 ├── store/                # Zustand 상태 스토어 폴더
 │    └── postsStore.ts    # 게시글 데이터 및 피드 동작 제어 전역 상태
 ├── styles/               # 화면별 스타일 코드를 분리 관리하는 스타일 폴더
 │    ├── auth.styles.ts   # 로그인 화면 스타일
 │    ├── create.styles.ts # 글 작성 화면 스타일
 │    ├── feed.styles.ts   # 홈 피드 화면 스타일
 │    ├── notifications.styles.ts # 알림 화면 스타일
 │    └── profile.styles.ts # 프로필 화면 스타일
 ├── app.json              # Expo 앱 메타데이터 및 플러그인 설정 파일
 ├── package.json          # 프로젝트 의존성 라이브러리 및 스크립트 관리 파일
 └── convex.md             # Convex 데이터베이스 연동 및 관리 가이드
```

---

## 📱 주요 화면 및 기능

1. **로그인 (`app/(auth)/sign-in.tsx`)**
   * Clerk 소셜 인증 제공.
   * 안전하게 인증 토큰을 모바일 스토리지(`SecureStore`)에 저장 및 캐싱.
2. **홈 피드 (`app/(tabs)/index.tsx`)**
   * 팔로우하는 사용자들의 인스타그램 스타일 게시물 카드 목록 실시간 제공.
   * 좋아요 누르기, 북마크 토글 등 반응형 UI 처리.
3. **게시물 작성 (`app/(tabs)/create.tsx`)**
   * 텍스트 입력 및 이미지 에셋 추가를 통한 인스타그램 포스트 생성 화면.
4. **북마크 (`app/(tabs)/bookmarks.tsx`)**
   * 사용자가 저장해 둔 포스트들을 모아서 보여주는 전용 화면.
5. **알림 (`app/(tabs)/notification.tsx`)**
   * 내 포스트에 대한 좋아요, 댓글 등의 활동 이력을 확인하는 화면.
6. **프로필 (`app/(tabs)/profile.tsx`)**
   * 현재 사용자의 정보, 프로필 사진, 개인 피드(그리드 형태) 확인 가능.

---

## 🚀 시작 가이드 (Quick Start)

### 1. 패키지 설치
로컬 디렉토리에서 프로젝트에 필요한 의존성 패키지를 설치합니다.
```bash
npm install
```

### 2. 환경 변수(Env) 설정
프로젝트 루트에 `.env` 또는 `.env.local` 파일을 생성하고 Clerk와 Convex 주소를 구성합니다.
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
EXPO_PUBLIC_CONVEX_URL=your_convex_endpoint_url
```

### 3. 로컬 서버 실행
```bash
# 개발 서버 시작
npx expo start

# iOS 시뮬레이터에서 실행 (ios 폴더가 없을 경우 자동 재생성)
npm run ios

# Android 에뮬레이터에서 실행
npm run android
```

---

## 🔄 추후 DB 연동 계획: Convex (Convex Integration)

향후 로컬 목데이터(Mock Data) 또는 Zustand 로컬 데이터를 대체하여 **실시간 반응형 백엔드인 Convex**로 이전할 계획입니다.
* **사용자 및 포스트 연동**: Clerk의 유저 데이터와 포스트 등록 정보를 Convex 서버리스 함수를 통해 `users` 및 `tasks(posts)` 테이블에 실시간 저장 및 조회합니다.
* **실시간 좋아요/북마크 기능**: 유저가 좋아요를 누르거나 북마크하면 Convex의 `mutation`이 호출되고, `useQuery`가 컴포넌트의 화면을 실시간으로 다시 렌더링하도록 전환합니다.
* **세부 연동 방법 및 절차**: 데이터베이스 스키마 설계 및 백엔드 쿼리 연동 절차에 대한 자세한 내용은 프로젝트에 첨부된 [convex.md](file:///Users/guniluk/Desktop/CLI/webMobile-instagram/convex.md) 파일을 참고하시기 바랍니다.
