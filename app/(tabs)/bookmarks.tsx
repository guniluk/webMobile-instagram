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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { styles as feedStyles } from '../../styles/feed.styles';
import { styles as profileStyles } from '../../styles/profile.styles';

export default function Bookmarks() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
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
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [prevDetailPostId, setPrevDetailPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const selectedPost = bookmarkedPosts.find((p: any) => p.id === selectedPostId) || null;
  const detailPost = bookmarkedPosts.find((p: any) => p.id === detailPostId) || null;

  // 상세조회 중인 포스트가 북마크 해제되어 목록에서 사라지면 자동으로 상세 화면 닫기
  React.useEffect(() => {
    if (detailPostId && !detailPost) {
      setDetailPostId(null);
    }
  }, [detailPost, detailPostId]);

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

  const closeCommentModal = () => {
    setSelectedPostId(null);
    if (prevDetailPostId) {
      setDetailPostId(prevDetailPostId);
      setPrevDetailPostId(null);
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
      <TouchableOpacity onPress={() => setDetailPostId(item.id)}>
        <Image
          source={{ uri: item.image }}
          style={localStyles.rowImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Right: Info and Actions */}
      <View style={localStyles.rowRightContent}>
        {/* Top: Username & Caption */}
        <View style={localStyles.rowTextContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setDetailPostId(item.id)}>
              <Text style={localStyles.rowUsername} numberOfLines={1}>
                {item.username}
              </Text>
            </TouchableOpacity>
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
        {item.comments && item.comments.length > 0 ? (
          <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
            <Text style={localStyles.rowCommentsText}>
              View all {item.comments.length} comments
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
            <Text style={localStyles.rowCommentsText}>Add a comment...</Text>
          </TouchableOpacity>
        )}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.white}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      {/* Comment Modal */}
      {selectedPost && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={closeCommentModal}
        >
          <SafeAreaView style={feedStyles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
            >
              {/* Modal Header */}
              <View style={feedStyles.modalHeader}>
                <TouchableOpacity onPress={closeCommentModal}>
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

      {/* Post Detail Modal */}
      {detailPost && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setDetailPostId(null)}
        >
          <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* Detail Header */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingTop: insets.top > 0 ? insets.top : 20,
              height: insets.top > 0 ? 56 + insets.top : 56,
              borderBottomWidth: 0.5,
              borderBottomColor: COLORS.surface,
            }}>
              <TouchableOpacity onPress={() => setDetailPostId(null)} style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>Post</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Post Header */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image source={{ uri: detailPost.userAvatar }} style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    marginRight: 8,
                  }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: COLORS.white,
                  }}>{detailPost.username}</Text>
                </View>
              </View>

              {/* Post Image */}
              <Image
                source={{ uri: detailPost.image }}
                style={{
                  width: "100%",
                  aspectRatio: 1,
                }}
                resizeMode="cover"
              />

              {/* Post Actions */}
              <View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}>
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}>
                  <TouchableOpacity onPress={() => handleLike(detailPost.id)}>
                    <Ionicons
                      name={detailPost.isLiked ? "heart" : "heart-outline"}
                      size={24}
                      color={detailPost.isLiked ? "#ff3040" : COLORS.white}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setPrevDetailPostId(detailPost.id);
                    setDetailPostId(null);
                    setSelectedPostId(detailPost.id);
                  }}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={23}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => handleBookmark(detailPost.id)}>
                  <Ionicons
                    name={detailPost.isBookmarked ? "bookmark" : "bookmark-outline"}
                    size={23}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </View>

              {/* Post Info */}
              <View style={{ paddingHorizontal: 12 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: COLORS.white,
                  marginBottom: 6,
                }}>
                  {detailPost.likes.toLocaleString()} likes
                </Text>
                <View style={detailPost.caption?.trim() ? { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 } : { flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{
                    color: "#FACC15",
                    fontSize: 16,
                    fontWeight: "bold",
                  }}>{detailPost.caption}</Text>
                </View>

                {detailPost.comments && detailPost.comments.length > 0 ? (
                  <TouchableOpacity onPress={() => {
                    setPrevDetailPostId(detailPost.id);
                    setDetailPostId(null);
                    setSelectedPostId(detailPost.id);
                  }}>
                    <Text style={{ color: COLORS.grey, fontSize: 13, marginTop: 4, marginBottom: 4 }}>
                      View all {detailPost.comments.length} comments
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => {
                    setPrevDetailPostId(detailPost.id);
                    setDetailPostId(null);
                    setSelectedPostId(detailPost.id);
                  }}>
                    <Text style={{ color: COLORS.grey, fontSize: 13, marginTop: 4, marginBottom: 4 }}>Add a comment...</Text>
                  </TouchableOpacity>
                )}

                <Text style={{
                  fontSize: 12,
                  color: COLORS.grey,
                  marginBottom: 8,
                  marginTop: 4,
                }}>{detailPost.timeAgo || "방금 전"}</Text>
              </View>
            </ScrollView>
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
