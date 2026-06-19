import { COLORS } from '@/constants/theme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { styles } from '../../styles/create.styles';

export default function Create() {
  const { user } = useUser();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSubscription = Keyboard.addListener(showEvent, scrollToBottom);
    return () => {
      showSubscription.remove();
    };
  }, []);

  const currentUser = {
    username: user?.username || user?.firstName || 'me_instagram',
    avatar:
      user?.imageUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  };

  const selectImage = async () => {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleShare = async () => {
    if (!image) return;
    try {
      setIsSubmitting(true);

      // 1. 업로드용 URL 발급
      const uploadUrl = await generateUploadUrl();

      // 2. 이미지 바이너리를 URL로 POST 전송
      const response = await fetch(image);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'image/jpeg',
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const { storageId } = await uploadResponse.json();

      // 3. Convex DB에 포스트 생성
      await createPost({
        storageId,
        caption: caption.trim() || undefined,
      });

      // 상태 초기화
      setImage(null);
      setCaption('');

      // 홈 탭으로 이동
      router.push('/(tabs)');
    } catch (error) {
      console.error('Share post error:', error);
      alert('공유 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handleShare}
          disabled={!image || isSubmitting}
          style={[
            styles.shareButton,
            (!image || isSubmitting) && styles.shareButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.shareText,
              (!image || isSubmitting) && styles.shareTextDisabled,
            ]}
          >
            {isSubmitting ? 'Sharing...' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[styles.content, isSubmitting && styles.contentDisabled]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {image ? (
            <View style={styles.imageSection}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.deleteImageButton}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close" size={20} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={selectImage}
              >
                <Ionicons
                  name="camera-reverse"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyImageContainer}
              onPress={selectImage}
            >
              <Ionicons name="images-outline" size={48} color={COLORS.grey} />
              <Text style={styles.emptyImageText}>
                Select an image to share
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputSection}>
            <View style={styles.captionContainer}>
              <Image
                source={{ uri: currentUser.avatar }}
                style={styles.userAvatar}
              />
              <TextInput
                placeholder="Write a caption..."
                placeholderTextColor={COLORS.grey}
                multiline
                value={caption}
                onChangeText={setCaption}
                style={styles.captionInput}
                onFocus={scrollToBottom}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
