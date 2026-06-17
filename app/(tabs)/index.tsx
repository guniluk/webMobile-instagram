import { COLORS } from "@/constants/theme";
import { useUser, useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { styles } from "../../styles/feed.styles";

export default function Index() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const posts = useQuery(api.posts.getPosts) || [];
  
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

  const selectedPost = posts.find((p: any) => p.id === selectedPostId) || null;

  // 피드 게시글을 작성한 사용자들의 목록으로 스토리 라인을 자동 구성합니다.
  const stories = React.useMemo(() => {
    if (!posts) return [];
    const uniqueUsers = new Map();
    posts.forEach((post: any) => {
      if (!uniqueUsers.has(post.username)) {
        uniqueUsers.set(post.username, {
          id: post.id,
          authorId: post.authorId,
          username: post.username,
          avatar: post.userAvatar,
          hasStory: true,
          isFollowing: post.isFollowing,
        });
      }
    });
    return Array.from(uniqueUsers.values());
  }, [posts]);

  const currentUser = {
    username: user?.username || user?.firstName || "me_instagram",
    avatar:
      user?.imageUrl ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
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

  const handleStoryPress = (story: any) => {
    const isMe = convexUser && story.authorId === convexUser._id;
    if (isMe) {
      Alert.alert("My Story", "This is your story/post profile.");
      return;
    }

    Alert.alert(
      `@${story.username}`,
      "Manage follow relation with this user",
      [
        {
          text: story.isFollowing ? "Unfollow" : "Follow",
          onPress: () => handleFollow(story.authorId)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
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

  const renderStory = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.storyWrapper}
      onPress={() => handleStoryPress(item)}
    >
      <View style={[styles.storyRing, !item.hasStory && styles.noStory]}>
        <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.username}
      </Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.post}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
          <Text style={styles.postUsername}>{item.username}</Text>
        </View>
        <TouchableOpacity onPress={() => handleOptionsPress(item)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Post Image */}
      <Image
        source={{ uri: item.image }}
        style={styles.postImage}
        resizeMode="cover"
      />

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity onPress={() => handleLike(item.id)}>
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={24}
              color={item.isLiked ? "#ff3040" : COLORS.white}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
            <Ionicons
              name="chatbubble-outline"
              size={23}
              color={COLORS.white}
            />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons
              name="paper-plane-outline"
              size={23}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => handleBookmark(item.id)}>
          <Ionicons
            name={item.isBookmarked ? "bookmark" : "bookmark-outline"}
            size={23}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* Post Info */}
      <View style={styles.postInfo}>
        <Text style={styles.likesText}>
          {item.likes.toLocaleString()} likes
        </Text>
        <View style={item.caption?.trim() ? styles.captionContainer : { flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.captionUsername}>{item.username}</Text>
          <Text style={styles.captionText}>{item.caption}</Text>
        </View>

        {item.comments.length > 0 ? (
          <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
            <Text style={styles.commentsText}>
              View all {item.comments.length} comments
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSelectedPostId(item.id)}>
            <Text style={styles.commentsText}>Add a comment...</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BYH Instagram</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="paper-plane-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. 고정된 상단 스토리 라인 (세로 스크롤 영역에서 분리하여 스크롤 되지 않도록 함) */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stories.map((story: any) => (
            <View key={story.id}>{renderStory({ item: story })}</View>
          ))}
        </ScrollView>
      </View>

      {/* 2. 게시된 글들만 스크롤되도록 FlatList 별도 렌더링 */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Comment Modal */}
      {selectedPost && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedPostId(null)}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPostId(null)}>
                <Ionicons name="chevron-back" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Comments</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Comments List */}
            <FlatList
              data={selectedPost.comments}
              keyExtractor={(item) => item.id}
              style={styles.commentsList}
              renderItem={({ item }) => (
                <View style={styles.commentContainer}>
                  <Image
                    source={{ uri: item.avatar }}
                    style={styles.commentAvatar}
                  />
                  <View style={commentText.trim() ? styles.commentContent : { flex: 1, marginLeft: 12 }}>
                    <Text style={styles.commentUsername}>{item.username}</Text>
                    <Text style={{ color: COLORS.white, fontSize: 14, marginTop: 2 }}>{item.text}</Text>
                    <Text style={styles.commentTime}>{item.time}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={[styles.centered, { marginTop: 40 }]}>
                  <Text style={{ color: COLORS.grey }}>
                    No comments yet. Be the first!
                  </Text>
                </View>
              }
            />

            {/* Comment Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
              <View style={styles.commentInput}>
                <Image
                  source={{ uri: currentUser.avatar }}
                  style={styles.commentAvatar}
                />
                <TextInput
                  placeholder="Add a comment..."
                  placeholderTextColor={COLORS.grey}
                  value={commentText}
                  onChangeText={setCommentText}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={!commentText.trim()}
                  style={!commentText.trim() && styles.postButtonDisabled}
                >
                  <Text style={styles.postButton}>Post</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}
