import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles as feedStyles } from '../../styles/feed.styles';
import { styles } from '../../styles/profile.styles';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  
  // Expo Router 쿼리 파라미터 (타인 프로필 조회 시 username 파라미터가 존재함)
  const { username } = useLocalSearchParams<{ username?: string }>();

  // 1. 내 프로필 실시간 조회
  const myConvexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip',
  );

  // 2. 만약 username 파라미터가 주어지면 타인 프로필을 조회
  const targetUser = useQuery(
    api.users.getUserProfile,
    username ? { username } : 'skip'
  );

  // 최종 노출할 프로필 유저 정보 결정
  const profileUser = username ? targetUser : (myConvexUser ? {
    userId: myConvexUser._id,
    username: myConvexUser.username,
    name: myConvexUser.fullname,
    bio: myConvexUser.bio || "",
    avatar: myConvexUser.image,
    postsCount: myConvexUser.posts || 0,
    followersCount: myConvexUser.followers || 0,
    followingCount: myConvexUser.following || 0,
    isFollowing: false
  } : null);

  // 해당 프로필 유저의 게시글 조회
  const myPosts = useQuery(
    api.posts.getUserPosts,
    profileUser?.userId ? { userId: profileUser.userId as any } : 'skip'
  ) || [];

  const toggleLikeMutation = useMutation(api.likes.toggleLike);
  const toggleBookmarkMutation = useMutation(api.bookmarks.toggleBookmark);
  const addCommentMutation = useMutation(api.comments.addComment);
  const toggleFollowMutation = useMutation(api.follows.toggleFollow);
  const deletePostMutation = useMutation(api.posts.deletePost);

  // 모달 상태
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const selectedPost = myPosts.find((p: any) => p.id === selectedPostId) || null;

  // 편집 폼 상태 (내 프로필 수정 전용)
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  const updateUserProfile = useMutation(api.users.updateProfile);

  // 내 정보가 로드되었을 때 폼 상태 동기화
  React.useEffect(() => {
    if (!username && myConvexUser) {
      setName(myConvexUser.fullname);
      setBio(myConvexUser.bio ?? '');
    }
  }, [myConvexUser, username]);

  const handleOpenEditModal = () => {
    if (myConvexUser) {
      setName(myConvexUser.fullname);
      setBio(myConvexUser.bio ?? '');
    }
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({ fullname: myConvexUser?.fullname || "", bio: bio });
      setEditModalVisible(false);
    } catch (error) {
      console.error('Failed to save profile changes:', error);
    }
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

  const handleFollow = async () => {
    if (!profileUser?.userId) return;
    try {
      await toggleFollowMutation({ followingId: profileUser.userId as any });
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
    const isMyPost = !username; // 파라미터 username이 없으면 무조건 내 프로필이므로 내 포스트

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
            text: profileUser?.isFollowing ? "Unfollow" : "Follow",
            onPress: handleFollow
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  const currentUser = {
    username: user?.username || user?.firstName || 'me_instagram',
    avatar: user?.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  };

  const renderPostItem = (post: any) => (
    <View key={post.id} style={localStyles.rowCard}>
      {/* Left: Post Image */}
      <Image
        source={{ uri: post.image }}
        style={localStyles.rowImage}
        resizeMode="cover"
      />

      {/* Right: Info and Actions */}
      <View style={localStyles.rowRightContent}>
        <View style={localStyles.rowTextContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={localStyles.rowUsername} numberOfLines={1}>
              {post.username}
            </Text>
            <TouchableOpacity onPress={() => handleOptionsPress(post)}>
              <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={localStyles.rowCaption} numberOfLines={2}>
            {post.caption}
          </Text>
        </View>

        <View style={localStyles.rowMetaContainer}>
          <Text style={localStyles.rowLikesText}>
            {post.likes.toLocaleString()} likes
          </Text>
          <View style={localStyles.rowActions}>
            <TouchableOpacity onPress={() => handleLike(post.id)}>
              <Ionicons
                name={post.isLiked ? "heart" : "heart-outline"}
                size={18}
                color={post.isLiked ? "#ff3040" : COLORS.white}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedPostId(post.id)}>
              <Ionicons
                name="chatbubble-outline"
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBookmark(post.id)}>
              <Ionicons
                name={post.isBookmarked ? "bookmark" : "bookmark-outline"}
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => setSelectedPostId(post.id)}>
          <Text style={localStyles.rowCommentsText}>Add or view comments...</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.username}>
            {profileUser?.username ?? ""}
          </Text>
        </View>
        {/* 본인 프로필일 때만 로그아웃 버튼 표시 */}
        {!username && (
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => signOut()} style={styles.headerIcon}>
              <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Profile Info */}
        {profileUser ? (
          <View style={styles.profileInfo}>
            <View style={styles.avatarAndStats}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: profileUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{myPosts.length}</Text>
                  <Text style={styles.statLabel}>posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {profileUser.followersCount}
                  </Text>
                  <Text style={styles.statLabel}>followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {profileUser.followingCount}
                  </Text>
                  <Text style={styles.statLabel}>following</Text>
                </View>
              </View>
            </View>

            <Text style={styles.name}>
              {profileUser.name ?? ""}
            </Text>
            <Text style={styles.bio}>{profileUser.bio ?? ""}</Text>

            <View style={styles.actionButtons}>
              {/* 타인 프로필일 때는 팔로우/언팔로우 버튼 노출, 본인 프로필이면 프로필 수정 버튼 노출 */}
              {username ? (
                <TouchableOpacity
                  style={[styles.editButton, profileUser.isFollowing && { backgroundColor: COLORS.surface }]}
                  onPress={handleFollow}
                >
                  <Text style={styles.editButtonText}>
                    {profileUser.isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleOpenEditModal}
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: COLORS.grey }}>Loading profile...</Text>
          </View>
        )}

        {/* Posts List */}
        <View style={{ paddingHorizontal: 12, marginTop: 16 }}>
          {myPosts.length === 0 ? (
            <View style={styles.noPostsContainer}>
              <Ionicons name="camera-outline" size={48} color={COLORS.grey} />
              <Text style={styles.noPostsText}>No posts yet</Text>
            </View>
          ) : (
            myPosts.map((post) => renderPostItem(post))
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal (내 프로필 수정 전용) */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: COLORS.grey, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>



            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Bio"
                placeholderTextColor={COLORS.grey}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.bioInput]}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
