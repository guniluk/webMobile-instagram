import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';
import { useOAuth } from '@clerk/expo';
import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

// 웹브라우저 웜업 (안드로이드 UX 향상)
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      void WebBrowser.warmUpAsync();
      return () => {
        void WebBrowser.coolDownAsync();
      };
    }
  }, []);

  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' });
  const [isLoading, setIsLoading] = React.useState(false);

  const onGoogleSignIn = React.useCallback(async () => {
    try {
      setIsLoading(true);
      // Expo Go와 Development Build 모두 호환되는 Redirect URL 생성
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'webmobileinstagram',
        path: '(tabs)',
      });
      const { createdSessionId, setActive } = await startGoogleFlow({ redirectUrl });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleFlow]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* 인스타그램 스타일의 로고 텍스트 대체 */}
        <Text style={styles.logoText}>Instagram</Text>
        <Text style={styles.subtitle}>Sign in to see photos and videos from your friends.</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.googleButton]} 
          onPress={onGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={styles.footerText}>
        By signing up, you agree to our Terms, Data Policy and Cookies Policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#000',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    letterSpacing: 1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8a8a8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#0095f6', // 인스타그램 메인 블루 톤
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 16,
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
});
