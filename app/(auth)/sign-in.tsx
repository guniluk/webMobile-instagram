import { COLORS } from '@/constants/theme';
import { styles as authStyles } from '@/styles/auth.styles';
import { useSSO } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// 모바일 웹브라우저 세션 완료 처리 (인증 완료 후 앱 복귀 리디렉션 감지용)
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  // 웹브라우저 웜업 (안드로이드 UX 향상)
  React.useEffect(() => {
    if (Platform.OS === 'android') {
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
      // Expo Go와 Development Build 모두 호환되는 Redirect URL 생성
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'webmobileinstagram',
        path: '(tabs)',
      });
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
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
        {/* 인스타그램 스타일의 로고 텍스트 대체 */}
        <Text style={authStyles.appName}>Instagram</Text>
        <Text style={authStyles.tagline}>
          Sign in to see photos and videos from your friends.
        </Text>
      </View>

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
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
});
