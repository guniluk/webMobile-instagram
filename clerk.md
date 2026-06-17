<!-- cspell:words guniluk webmobileinstagram clerkexpoquickstart authsession tokenCache userSSO pressable Pressable -->
# Expo 환경에서 Clerk을 이용한 사용자 인증(Google 소셜 로그인) 가이드

이 문서는 **Expo(React Native)** 환경에서 **Clerk** 서비스를 이용해 소셜 로그인을 구축하고 자동 로그인을 세팅하는 과정을 초보자도 쉽게 따라 할 수 있도록 순서대로 정리한 가이드입니다.

---

## 📌 전체 일처리 순서 요약
1. [Step 1: Clerk 대시보드(웹사이트) 프로젝트 생성](#step-1-clerk-대시보드웹사이트-프로젝트-생성)
2. [Step 2: 모바일 개발 패키지 설치](#step-2-모바일-개발-패키지-설치)
3. [Step 3: 환경 변수(.env.local) 파일 작성](#step-3-환경-변수envlocal-파일-작성)
4. [Step 4: 자동 로그인 유지용 토큰 캐시 작성](#step-4-자동-로그인-유지용-토큰-캐시-작성)
5. [Step 5: App Root Layout에 Clerk & Convex 연동 래핑](#step-5-app-root-layout에-clerk--convex-연동-래핑)
6. [Step 6: Google 로그인 버튼 화면 구현](#step-6-google-로그인-버튼-화면-구현)
7. [Step 7: Clerk 웹 대시보드에 딥링크 리디렉션 URI 등록 (필수)](#step-7-clerk-웹-대시보드에-딥링크-리디렉션-uri-등록-필수)
8. [Step 8: 로그인 상태 유지 및 로그아웃 처리](#step-8-로그인-상태-유지-및-로그아웃-처리)

---

### Step 1: Clerk 대시보드(웹사이트) 프로젝트 생성
앱 내에 코드를 작성하기에 앞서 Clerk 웹 서비스에서 프로젝트를 생성해야 합니다.
1. [Clerk 공식 홈페이지(clerk.com)](https://clerk.com)에 로그인한 뒤 대시보드로 이동합니다.
2. **Create Application**을 클릭합니다.
3. **Application name**에 프로젝트 이름(예: `webMobile-instagram`)을 입력합니다.
4. **How will users sign in?** 옵션에서 **Google**에 체크합니다.
5. **Create Application** 버튼을 클릭하여 프로젝트를 개설합니다.
6. 대시보드 메인 화면에 생성된 `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (Publishable Key) 값을 복사해 둡니다.

---

### Step 2: 모바일 개발 패키지 설치
터미널을 열고 프로젝트 루트 경로에서 Clerk 연동과 소셜 로그인을 구동하기 위한 모바일 라이브러리를 설치합니다.
```bash
npx expo install @clerk/expo expo-secure-store expo-auth-session expo-web-browser
```
* **`@clerk/expo`**: Expo용 Clerk SDK 핵심 라이브러리
* **`expo-secure-store`**: 로그인 토큰을 모바일 기기에 안전하게 암호화 저장해 자동 로그인 유지
* **`expo-auth-session`**: 구글 간편 로그인 브라우저를 열어주고 다시 앱으로 돌아오도록 중개
* **`expo-web-browser`**: 로그인용 인앱 웹브라우저 구동

---

### Step 3: 환경 변수(.env.local) 파일 작성
프로젝트 루트 디렉토리에 위치한 `.env.local` 파일에 Step 1에서 복사한 Clerk API 키를 저장합니다.
```env
# 프로젝트 루트폴더/.env.local
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (자신의 Clerk Publishable Key 붙여넣기)
```
> ⚠️ **주의:** 변수명 앞에 반드시 `EXPO_PUBLIC_` 접두사가 붙어있어야 Expo 클라이언트 코드가 이 환경변수를 성공적으로 불러올 수 있습니다.

---

### Step 4: 자동 로그인 유지용 토큰 캐시 작성
유저가 앱을 종료하고 다시 켰을 때 로그인 상태가 끊기지 않도록 기기 보안 저장소(`SecureStore`)를 세션 캐시로 사용하도록 돕는 헬퍼 파일을 작성합니다.

* **파일 경로:** `clerk-expo/tokenCache.ts`
```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const createTokenCache = () => {
  return {
    async getToken(key: string) {
      try {
        if (Platform.OS === 'web') {
          return localStorage.getItem(key);
        }
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('Clerk tokenCache.getToken error:', error);
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem(key, value);
          return;
        }
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.error('Clerk tokenCache.saveToken error:', error);
      }
    },
    async clearToken(key: string) {
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem(key);
          return;
        }
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('Clerk tokenCache.clearToken error:', error);
      }
    }
  };
};

export const tokenCache = createTokenCache();
```

---

### Step 5: App Root Layout에 Clerk & Convex 연동 래핑
사용자 로그인 세션 정보가 앱 전체 화면과 Convex 백엔드 데이터베이스에 실시간으로 공유될 수 있도록 루트 레이아웃을 구성합니다.

* **파일 경로:** `app/_layout.tsx`
```tsx
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '../clerk-expo/tokenCache';
import { COLORS } from '@/constants/theme';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!publishableKey || !convexUrl) {
  throw new Error('Required environment variables are missing. Check .env.local');
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

function MainLayout() {
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const storeUser = useMutation(api.users.storeUser);

  // 로그인 상태에 따른 화면 리다이렉트 및 Convex DB 사용자 자동 동기화
  React.useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      // 1. 로그인이 안 되어있다면 sign-in 화면으로
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn) {
      // 2. 로그인에 성공한 경우 Convex 데이터베이스에 사용자 동기화(저장/업데이트)
      const syncUser = async () => {
        try {
          await storeUser();
        } catch (error) {
          console.error('Failed to sync user to Convex DB:', error);
        }
      };
      void syncUser();

      if (inAuthGroup) {
        // 3. 로그인 상태인데 로그인창에 머무르고 있다면 메인 탭 화면으로 리다이렉트
        router.replace('/(tabs)');
      }
    }
  }, [isLoaded, isSignedIn, segments, router, storeUser]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ height: insets.top, backgroundColor: COLORS.background }} />
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'HOME' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SafeAreaProvider>
          <MainLayout />
        </SafeAreaProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

---

### Step 6: Google 로그인 버튼 화면 구현
Clerk의 `useSSO` 훅을 이용하여 인앱 브라우저 팝업을 띄우고 Google 로그인을 시도하는 화면입니다.

* **파일 경로:** `app/(auth)/sign-in.tsx`
```tsx
import { COLORS } from "@/constants/theme";
import { styles as authStyles } from "@/styles/auth.styles";
import { useSSO } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  React.useEffect(() => {
    if (Platform.OS === "android") {
      void WebBrowser.warmUpAsync();
      return () => {
        void WebBrowser.coolDownAsync();
      };
    }
  }, []);

  const { startSSOFlow } = useSSO();
  const [isLoading, setIsLoading] = React.useState(false);

  const onGoogleSignIn = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 고유 딥링크 리디렉션 URI 생성
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "webmobileinstagram",
        path: "(tabs)",
      });
      
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <View style={authStyles.container}>
      <View style={authStyles.brandSection}>
        <View style={authStyles.logoContainer}>
          <Ionicons name="logo-instagram" size={32} color={COLORS.primary} />
        </View>
        <Text style={authStyles.appName}>Instagram</Text>
        <Text style={authStyles.tagline}>
          Sign in to see photos and videos from your friends.
        </Text>
      </View>

      {/* 로그인 영역과 위 설명 텍스트 간의 간격(Margin)이 넓게 디자인되어 있습니다 */}
      <View style={authStyles.loginSection}>
        <Pressable
          style={authStyles.googleButton}
          onPress={onGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <View style={authStyles.googleIconContainer}>
                <Ionicons name="logo-google" size={20} color={COLORS.surface} />
              </View>
              <Text style={authStyles.googleButtonText}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={[authStyles.termsText, localStyles.footerPosition]}>
        By signing up, you agree to our Terms, Data Policy and Cookies Policy.
      </Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  footerPosition: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    alignItems: "center",
  },
});
```

---

### Step 7: Clerk 웹 대시보드에 딥링크 리디렉션 URI 등록 (필수)
모바일 브라우저에서 Google 소셜 인증이 끝난 뒤에 사용자를 다시 우리 앱으로 돌려보내기 위해 대시보드에 허용 리디렉션 딥링크 주소를 무조건 화이트리스트로 추가해야 합니다.
1. [Clerk Dashboard](https://dashboard.clerk.com)에 로그인하고 해당 프로젝트를 선택합니다.
2. 왼쪽 사이드바에서 **Configure** > **Paths** 메뉴로 이동합니다.
3. **Redirect URLs** 섹션을 찾고 **Add Redirect URL**을 누릅니다.
4. 아래 주소를 입력하고 추가합니다:
   * **로컬 실기기/에뮬레이터용 고유 스키마:** `webmobileinstagram://(tabs)`
   * *(Expo Go를 기본으로 사용하는 경우, Expo의 기본 개발 딥링크 주소인 `exp://...` 형태의 주소를 Clerk 대시보드 요청 오류 로그에서 확인하여 함께 추가해 주는 것이 작동 안정성에 좋습니다.)*

---

### Step 8: 로그인 상태 유지 및 로그아웃 처리
앱의 특정 화면(예: 프로필)에서 로그인한 유저 정보를 노출하거나 로그아웃 버튼을 처리할 때 Clerk 훅을 활용합니다.

```tsx
import { useAuth, useUser } from '@clerk/expo';
import { View, Text, Button, Image } from 'react-native';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser(); // Clerk 세션 유저 정보

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {user?.imageUrl && (
        <Image source={{ uri: user.imageUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
      )}
      <Text>안녕하세요, {user?.fullName}님!</Text>
      <Text>이메일: {user?.primaryEmailAddress?.emailAddress}</Text>
      <Button title="로그아웃" onPress={() => signOut()} />
    </View>
  );
}
```
