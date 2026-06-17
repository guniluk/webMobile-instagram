import { COLORS } from "@/constants/theme";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { ConvexReactClient, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { api } from "@/convex/_generated/api";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { tokenCache } from "../clerk-expo/tokenCache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env.local file.",
  );
}

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL. Please set it in your .env.local file.",
  );
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

  // 로그인 상태에 따른 라우팅 제어 및 Convex DB 유저 저장/동기화
  React.useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      // 로그인되어 있지 않은데 auth 그룹이 아닌 곳에 있다면 로그인 화면으로 리다이렉트
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn) {
      // 로그인되어 있는 경우 Convex DB에 사용자 정보 자동 동기화
      const syncUser = async () => {
        try {
          await storeUser();
        } catch (error) {
          console.error("Failed to sync user to Convex DB:", error);
        }
      };
      void syncUser();

      if (inAuthGroup) {
        // auth 그룹에 있다면 메인 화면으로 리다이렉트
        router.replace("/(tabs)");
      }
    }
  }, [isLoaded, isSignedIn, segments, router, storeUser]);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* 상태바 영역의 배경을 어둡게(dark) 설정 */}
      <View
        style={{ height: insets.top, backgroundColor: COLORS.background }}
      />
      {/* 글씨는 light mode(흰색)로 설정하고 안드로이드 상태바 배경색도 지정 */}
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "HOME",
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
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
