<!-- cspell:words guniluk webmobileinstagram clerkexpoquickstart authsession tokenCache userSSO pressable Pressable -->
# Expo에서 Clerk으로 사용자 인증(Google 로그인) 구현하기 가이드

이 가이드는 **Expo (React Native)** 환경에서 **Clerk**을 사용하여 사용자 인증(특히 소셜 Google 로그인)을 구현하는 모든 과정을 초보자의 눈높이에 맞춰 세세하게 설명합니다.

---

## 📌 목차
1. [Clerk 대시보드 설정](#1-clerk-대시보드-설정)
2. [필수 패키지 설치](#2-필수-패키지-설치)
3. [환경 변수(.env) 설정](#3-환경-변수env-설정)
4. [토큰 캐시(Token Cache) 설정 (자동 로그인 구현)](#4-토큰-캐시token-cache-설정-자동-로그인-구현)
5. [App Root에 ClerkProvider 적용하기](#5-app-root에-clerkprovider-적용하기)
6. [Google 로그인 화면 구현하기 (useSSO 훅 사용)](#6-google-로그인-화면-구현하기-usesso-훅-사용)
7. [Clerk 대시보드에 리디렉션 URI 등록하기 (매우 중요 ⚠️)](#7-clerk-대시보드에-리디렉션-uri-등록하기-매우-중요-️)
8. [로그인 상태 유지 및 로그아웃 구현](#8-로그인-상태-유지-및-로그아웃-구현)

---

## 1. Clerk 대시보드 설정

앱에 코드를 작성하기 전에, 먼저 Clerk 서비스에 회원가입을 하고 프로젝트를 만들어야 합니다.

1. **Clerk 가입 및 로그인:** [Clerk 공식 홈페이지(clerk.com)](https://clerk.com)에 접속하여 가입 후 대시보드로 이동합니다.
2. **애플리케이션 생성 (Create Application):**
   * **Application name**에 프로젝트 이름(예: `webMobile-instagram`)을 입력합니다.
   * **How will users sign in?**에서 **Google** 항목에 체크합니다. (추후 Apple이나 이메일 로그인도 추가할 수 있습니다.)
   * **Create Application** 버튼을 누릅니다.
3. **API Key 복사:**
   * 대시보드 메인 화면에 표시되는 `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (Publishable Key) 값을 복사해 둡니다.

---

## 2. 필수 패키지 설치

Expo React Native 앱에서 Clerk과 OAuth(구글 로그인 등) 브라우저 팝업을 안정적으로 동작시키기 위해 터미널에서 다음 패키지들을 설치합니다.

```bash
npx expo install @clerk/expo expo-secure-store expo-auth-session expo-web-browser
```

* **`@clerk/expo`**: Expo용 Clerk SDK 핵심 라이브러리
* **`expo-secure-store`**: 사용자 로그인 세션 토큰을 기기에 안전하게 암호화하여 저장(자동 로그인 유지 목적)
* **`expo-auth-session`**: 외부 브라우저를 통한 OAuth(Google, Apple 등) 인증 후 앱으로 돌아오는 딥링크 처리 담당
* **`expo-web-browser`**: 모바일 앱 내에서 인앱 브라우저 창을 띄워주는 역할

---

## 3. 환경 변수(.env) 설정

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고, 1단계에서 복사해 둔 Clerk API 키를 저장합니다.

```env
# 프로젝트 루트폴더/.env.local
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (자신의 Clerk Publishable Key 입력)
```

> 💡 **주의:** Clerk Publishable Key는 클라이언트 측에 노출되어도 안전하게 설계된 키입니다. 변수명 앞에 반드시 `EXPO_PUBLIC_` 접두사가 붙어야 Expo 앱이 이 변수를 인식합니다.

---

## 4. 토큰 캐시(Token Cache) 설정 (자동 로그인 구현)

사용자가 앱을 껐다 켜도 로그인 상태가 유지되도록 모바일 기기의 보안 저장소(`expo-secure-store`)를 세션 캐시로 사용하도록 도우미 코드를 작성합니다.

프로젝트 내에 캐시 헬퍼 파일을 하나 생성합니다. (예: `store/tokenCache.ts` 또는 임의의 공통 폴더)

```typescript
// store/tokenCache.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenCache {
  getToken: (key: string) => Promise<string | null | undefined>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => Promise<void>;
}

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('SecureStore set item error: ', err);
    }
  },
  async clearToken(key: string) {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error('SecureStore delete item error: ', err);
    }
  }
};
```

---

## 5. App Root에 ClerkProvider 적용하기

앱 전체가 Clerk의 로그인/로그아웃 상태 및 사용자 정보를 공유할 수 있도록 루트 레이아웃 파일에 `ClerkProvider`를 씌워줍니다.

보통 Expo Router 구조의 `app/_layout.tsx` 파일에 이를 적용합니다.

```tsx
// app/_layout.tsx
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import { tokenCache } from '@/store/tokenCache'; // 방금 만든 토큰 캐시 임포트
import { Slot } from 'expo-router';

// 환경 변수에서 Publishable Key 로드
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <Slot />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

---

## 6. Google 로그인 화면 구현하기 (useSSO 훅 사용)

Clerk의 최신 가이드라인에 맞춰, 소셜 인증 및 다양한 싱글 사인온(SSO) 환경을 지원하는 `useSSO` 훅을 이용하여 Google 로그인 컴포넌트를 작성합니다.

로그인 버튼이 위치할 스크린 파일에 아래 로직을 작성합니다.

```tsx
// app/(auth)/sign-in.tsx (또는 원하는 로그인 화면 파일)
import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// 모바일 웹브라우저 세션 완료 처리 (인증 완료 후 앱 복귀 리디렉션 감지용)
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  // 안드로이드 환경의 경우 브라우저 웜업 기능을 사용하여 웹브라우저 구동 속도 향상
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      void WebBrowser.warmUpAsync();
      return () => {
        void WebBrowser.coolDownAsync();
      };
    }
  }, []);

  const onGoogleSignIn = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. 앱의 scheme에 맞는 리디렉션 URI 생성
      // app.json에 설정된 scheme(예: 'webmobileinstagram')을 바탕으로 딥링크 주소를 만들어냅니다.
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'webmobileinstagram',
        path: '/(tabs)', // 로그인 성공 후 리디렉션 될 앱 내의 스크린 경로
      });

      // 2. SSO(Google OAuth) 로그인 흐름 시작
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      // 3. 로그인이 성공하여 세션이 정상 생성되었다면 활성화 처리
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // 로그인 후 메인화면 등으로 이동
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.googleButton} 
        onPress={onGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="logo-google" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>Continue with Google</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  googleButton: {
    backgroundColor: '#0095f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '80%',
  },
  buttonContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  icon: { marginRight: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
```

---

## 7. Clerk 대시보드에 리디렉션 URI 등록하기 (매우 중요 ⚠️)

모바일 앱에서의 소셜 로그인은 브라우저 창에서 진행된 후, 인증 토큰을 딥링크 주소(`scheme://`)를 통해 다시 앱으로 던져주어야 합니다. Clerk은 보안을 위해 허용되지 않은 딥링크 주소로의 리디렉션을 철저히 차단하므로, **반드시 대시보드에 이 주소를 화이트리스트로 추가해주어야 합니다.**

1. **딥링크 URI 확인하기:**
   * 위의 예제 코드에서 `redirectUrl`로 생성되는 주소는 다음과 같습니다:
     * `webmobileinstagram://(tabs)`
2. **Clerk 대시보드에 등록:**
   * [Clerk 대시보드](https://dashboard.clerk.com)로 접속합니다.
   * 왼쪽 메뉴의 **Configure** > **Paths** 로 이동합니다.
   * **Redirect URLs** 섹션을 찾고, **Add Redirect URL** 버튼을 누릅니다.
   * 여기에 `webmobileinstagram://(tabs)`를 입력하고 추가(Add)합니다.
   
> 💡 **Tip:** 만약 Expo Go 앱에서 먼저 개발 중이라면 Expo Go의 기본 리디렉션 스키마(`exp://...`)가 추가로 등록되어야 정상 동작할 수 있습니다. 로컬 개발 빌드(`npx expo run:ios/android`)를 사용하는 경우에는 위와 같이 `app.json`에 정의된 고유의 `scheme://` 주소를 추가하면 됩니다.

---

## 8. 로그인 상태 유지 및 로그아웃 구현

사용자가 로그인되어 있는지 판단하고, 기기에 저장된 사용자 정보를 가져오거나 로그아웃을 처리하는 기능은 Clerk이 제공하는 Hooks를 사용해 매우 간단하게 구현할 수 있습니다.

### 로그인 여부 확인 및 분기 (`useAuth` 및 `useUser` 사용)

```tsx
import { useAuth, useUser } from '@clerk/expo';
import { View, Text, Button } from 'react-native';

export default function ProfileScreen() {
  const { isSignedIn, signOut } = useAuth(); // 로그인 상태와 로그아웃 함수 가져오기
  const { user } = useUser(); // 현재 로그인한 사용자 정보 가져오기

  if (!isSignedIn) {
    return (
      <View>
        <Text>로그인이 필요합니다.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <Text>환영합니다, {user?.fullName || user?.emailAddresses[0].emailAddress}님!</Text>
      <Button title="로그아웃" onPress={() => signOut()} />
    </View>
  );
}
```

* **`useAuth()`**: 사용자의 현재 인증 상태(`isSignedIn`), 로그인 토큰 관리, 그리고 로그아웃(`signOut`) 등 전반적인 인증 메커니즘을 제어할 때 사용합니다.
* **`useUser()`**: 현재 로그인한 유저 객체(`user`)를 반환하며, 이름, 이메일, 프로필 이미지 URL(`user.imageUrl`) 등의 상세 정보를 제공합니다.

---

### 🎉 축하합니다!
위의 단계들을 모두 완료하셨다면, 보안이 완벽하게 처리된 무제한의 소셜 로그인 시스템을 구축하신 것입니다!
가이드를 하나씩 차근차근 따라 해 보며 예외 처리 및 추가 사용자 정보를 비즈니스 로직에 적용해 보세요.
