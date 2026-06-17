import { COLORS } from '@/constants/theme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { styles as feedStyles } from '../../styles/feed.styles';
import { styles as profileStyles } from '../../styles/profile.styles';

export default function Bookmarks() {
  const { user } = useUser();
  const bookmarkedPosts = useQuery(api.bookmarks.getBookmarkedPosts) || [];
  
  // 로그인한 사용자 정보 조회
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const toggleLikeMutation = useMutation(api.likes.toggleLike);
  const toggleBookmarkMutation = useMutation(api.bookmarks.toggleBookmark);
  const addCommentMutation = useMutation(api.comments.addComment);
  const toggleFollowMutation = useMutation(api.follows.toggleFollow);
  const deletePostMutation = useMutation(api.posts.deletePost);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const selectedPost = bookmarkedPosts.find((p: any) => p.id === selectedPostId) || null;

  const currentUser = {
    username: user?.username || user?.firstName || 'me_instagram',
    avatar: user?.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  };

  const handleLike = async (postId: string) => {
    try {
      await toggleLikeMutation({ postId: postId as any });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      await toggleBookmarkMutation({ postId: postId as any });
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPostId || !commentText.trim()) return;
    try {
      await addCommentMutation({ postId: selectedPostId as any, content: commentText });
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleFollow = async (authorId: string) => {
    try {
      await toggleFollowMutation({ followingId: authorId as any });
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    }
  };

  const confirmDeletePost = (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This will permanently delete the post, image, likes, comments, and bookmarks.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deletePostMutation({ postId: postId as any });
            } catch (err) {
              console.error("Failed to delete post:", err);
            }
          } 
        }
      ]
    );
  };

  const handleOptionsPress = (post: any) => {
    const isMyPost = convexUser && post.authorId === convexUser._id;

    if (isMyPost) {
      Alert.alert(
        "Post Options",
        "Choose an action for this post",
        [
          {
            text: "Delete Post",
            style: "destructive",
            onPress: () => confirmDeletePost(post.id)
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } else {
      Alert.alert(
        "Post Options",
        "Choose an action for this post",
        [
          {
            text: post.isFollowing ? "Unfollow" : "Follow",
            onPress: () => handleFollow(post.authorId)
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <View key={item.id} style={localStyles.rowCard}>
      {/* Left: Post Image */}
      <Image
        source={{ uri: item.image }}
        style={localStyles.rowImage}
        resizeMode="cover"
      />

      {/* Right: Info and Actions */}
      <View style={localStyles.rowRightContent}>
        {/* Top: Username & Caption */}
        <View style={localStyles.rowTextContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={localStyles.rowUsername} numberOfLines={1}>
              {item.username}
            </Text>
            <TouchableOpacity onPress={() => handleOptionsPress(item)}>
              <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={localStyles.rowCaption} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>

        {/* Middle: Stats & Actions */}
        <View style={localStyles.rowMetaContainer}>
          <Text style={localStyles.rowLikesText}>
            {item.likes.toLocaleString()} likes
          </Text>
          <View style={localStyles.rowActions}>
            <TouchableOpacity onPress={() => handleLike(item.id)}>
              <Ionicons
                name={item.isLiked ? "heart" : "heart-outline"}
                size={18}
                color={item.isLiked ? "#ff3040" : COLORS.white}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
              <Ionicons
                name="chatbubble-outline"
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBookmark(item.id)}>
              <Ionicons
                name={item.isBookmarked ? "bookmark" : "bookmark-outline"}
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom: View comments link */}
        <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
          <Text style={localStyles.rowCommentsText}>Add or view comments...</Text>
        </TouchableOpacity>
      </View>
    </View>
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
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80, paddingTop: 12 }}
        />
      )}

      {/* Comment Modal */}
      {selectedPost && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedPostId(null)}
        >
          <SafeAreaView style={feedStyles.modalContainer}>
            {/* Modal Header */}
            <View style={feedStyles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPostId(null)}>
                <Ionicons name="chevron-back" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={feedStyles.modalTitle}>Comments</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Comments List */}
            <FlatList
              data={selectedPost.comments}
              keyExtractor={(item: any) => item.id}
              style={feedStyles.commentsList}
              renderItem={({ item }) => (
                <View style={feedStyles.commentContainer}>
                  <Image
                    source={{ uri: item.avatar }}
                    style={feedStyles.commentAvatar}
                  />
                  <View style={feedStyles.commentContent}>
                    <Text style={feedStyles.commentUsername}>{item.username}</Text>
                    <Text style={commentText.trim() ? feedStyles.commentText : { color: COLORS.white }}>{item.text}</Text>
                    <Text style={feedStyles.commentTime}>{item.time}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={[feedStyles.centered, { marginTop: 40 }]}>
                  <Text style={{ color: COLORS.grey }}>
                    No comments yet. Be the first!
                  </Text>
                </View>
              }
            />

            {/* Comment Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={feedStyles.commentInput}>
                <Image
                  source={{ uri: currentUser.avatar }}
                  style={feedStyles.commentAvatar}
                />
                <TextInput
                  placeholder="Add a comment..."
                  placeholderTextColor={COLORS.grey}
                  value={commentText}
                  onChangeText={setCommentText}
                  style={feedStyles.input}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={!commentText.trim()}
                  style={!commentText.trim() && feedStyles.postButtonDisabled}
                >
                  <Text style={feedStyles.postButton}>Post</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
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
});

const localStyles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.surface,
    overflow: 'hidden',
    marginBottom: 12,
    padding: 10,
    alignItems: 'center',
  },
  rowImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  rowRightContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    height: 80,
  },
  rowTextContainer: {
    flexDirection: 'column',
  },
  rowUsername: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 1,
  },
  rowCaption: {
    color: COLORS.grey,
    fontSize: 12,
    lineHeight: 15,
  },
  rowMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLikesText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 11,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCommentsText: {
    color: COLORS.primary,
    fontSize: 11,
  },
});
