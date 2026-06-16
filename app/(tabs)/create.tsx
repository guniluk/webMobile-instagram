import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/create.styles';
import { usePostsStore } from '../../store/postsStore';
import { COLORS } from '@/constants/theme';

export default function Create() {
  const { user } = useUser();
  const router = useRouter();
  const { addPost } = usePostsStore();

  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = {
    username: user?.username || user?.firstName || 'me_instagram',
    avatar: user?.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
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
      // 포스트 추가
      addPost(image, caption, currentUser);
      
      // 상태 초기화
      setImage(null);
      setCaption('');
      
      // 홈 탭으로 이동
      router.push('/(tabs)');
    } catch (error) {
      console.error('Share post error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            onPress={handleShare}
            disabled={!image || isSubmitting}
            style={[styles.shareButton, (!image || isSubmitting) && styles.shareButtonDisabled]}
          >
            <Text style={[styles.shareText, (!image || isSubmitting) && styles.shareTextDisabled]}>
              {isSubmitting ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[styles.content, isSubmitting && styles.contentDisabled]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {image ? (
            <View style={styles.imageSection}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity style={styles.changeImageButton} onPress={selectImage}>
                <Ionicons name="camera-reverse" size={20} color={COLORS.white} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyImageContainer} onPress={selectImage}>
              <Ionicons name="images-outline" size={48} color={COLORS.grey} />
              <Text style={styles.emptyImageText}>Select an image to share</Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputSection}>
            <View style={styles.captionContainer}>
              <Image source={{ uri: currentUser.avatar }} style={styles.userAvatar} />
              <TextInput
                placeholder="Write a caption..."
                placeholderTextColor={COLORS.grey}
                multiline
                value={caption}
                onChangeText={setCaption}
                style={styles.captionInput}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
