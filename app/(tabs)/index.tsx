import { COLORS } from "@/constants/theme";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
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
import { Post, usePostsStore } from "../../store/postsStore";
import { styles } from "../../styles/feed.styles";

export default function Index() {
  const { user } = useUser();
  const { posts, stories, toggleLike, toggleBookmark, addComment } =
    usePostsStore();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");

  const currentUser = {
    username: user?.username || user?.firstName || "me_instagram",
    avatar:
      user?.imageUrl ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  };

  const handleLike = (postId: string) => {
    toggleLike(postId, currentUser);
  };

  const handleBookmark = (postId: string) => {
    toggleBookmark(postId);
  };

  const handleAddComment = () => {
    if (!selectedPost || !commentText.trim()) return;
    addComment(selectedPost.id, commentText, currentUser);

    // 모달 내 실시간 업데이트를 위해 selectedPost 로컬 상태도 갱신해줌
    const updatedPost = usePostsStore
      .getState()
      .posts.find((p) => p.id === selectedPost.id);
    if (updatedPost) {
      setSelectedPost(updatedPost);
    }

    setCommentText("");
  };

  const renderStory = ({ item }: { item: (typeof stories)[0] }) => (
    <View style={styles.storyWrapper}>
      <View style={[styles.storyRing, !item.hasStory && styles.noStory]}>
        <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.username}
      </Text>
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.post}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
          <Text style={styles.postUsername}>{item.username}</Text>
        </View>
        <TouchableOpacity>
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
          <TouchableOpacity onPress={() => setSelectedPost(item)}>
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
        <View style={styles.captionContainer}>
          <Text style={styles.captionUsername}>{item.username}</Text>
          <Text style={styles.captionText}>{item.caption}</Text>
        </View>

        {item.comments.length > 0 ? (
          <TouchableOpacity onPress={() => setSelectedPost(item)}>
            <Text style={styles.commentsText}>
              View all {item.comments.length} comments
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSelectedPost(item)}>
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
        <TouchableOpacity>
          <Ionicons name="paper-plane-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.storiesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stories.map((story) => (
                <View key={story.id}>{renderStory({ item: story })}</View>
              ))}
            </ScrollView>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Comment Modal */}
      {selectedPost && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedPost(null)}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPost(null)}>
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
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUsername}>{item.username}</Text>
                    <Text style={styles.commentText}>{item.text}</Text>
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
