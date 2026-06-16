import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePostsStore, Post } from '../../store/postsStore';
import { styles as profileStyles } from '../../styles/profile.styles';
import { COLORS } from '@/constants/theme';

export default function Bookmarks() {
  const { posts } = usePostsStore();
  const bookmarkedPosts = posts.filter((post) => post.isBookmarked);
  
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const renderGridItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={profileStyles.gridItem}
      onPress={() => setSelectedPost(item)}
    >
      <Image source={{ uri: item.image }} style={profileStyles.gridImage} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Posts</Text>
      </View>

      {bookmarkedPosts.length === 0 ? (
        <View style={profileStyles.noPostsContainer}>
          <Ionicons name="bookmark-outline" size={48} color={COLORS.grey} />
          <Text style={profileStyles.noPostsText}>No saved posts yet</Text>
        </View>
      ) : (
        <FlatList
          data={bookmarkedPosts}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: 1 }}
        />
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={profileStyles.modalBackdrop}>
            <View style={profileStyles.postDetailContainer}>
              {/* Close Header */}
              <View style={profileStyles.postDetailHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Post Details (Mock Feed Card inside modal) */}
              <View style={{ backgroundColor: COLORS.background }}>
                <View style={styles.detailPostHeader}>
                  <Image source={{ uri: selectedPost.userAvatar }} style={styles.detailAvatar} />
                  <Text style={styles.detailUsername}>{selectedPost.username}</Text>
                </View>

                <Image source={{ uri: selectedPost.image }} style={profileStyles.postDetailImage} />

                <View style={styles.detailInfo}>
                  <Text style={styles.detailLikes}>{selectedPost.likes} likes</Text>
                  <Text style={styles.detailCaption}>
                    <Text style={styles.detailUsernameText}>{selectedPost.username} </Text>
                    {selectedPost.caption}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.surface,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  detailPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  detailAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  detailUsername: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  detailInfo: {
    padding: 12,
  },
  detailLikes: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  detailCaption: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 18,
  },
  detailUsernameText: {
    fontWeight: '600',
  }
});
