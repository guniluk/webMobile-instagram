import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/profile.styles';
import { usePostsStore, Post } from '../../store/postsStore';
import { COLORS } from '@/constants/theme';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  
  const { posts, userProfile, updateProfile } = usePostsStore();
  const myPosts = posts.filter((post) => post.username === userProfile.username);

  // 모달 상태
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // 편집 폼 상태
  const [name, setName] = useState(userProfile.name);
  const [bio, setBio] = useState(userProfile.bio);

  const handleSaveProfile = () => {
    updateProfile(name, bio);
    setEditModalVisible(false);
  };

  const renderGridItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.gridItem} 
      onPress={() => setSelectedPost(item)}
    >
      <Image source={{ uri: item.image }} style={styles.gridImage} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.username}>{userProfile.username}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => signOut()} style={styles.headerIcon}>
            <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarAndStats}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myPosts.length}</Text>
                <Text style={styles.statLabel}>posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProfile.followersCount}</Text>
                <Text style={styles.statLabel}>followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProfile.followingCount}</Text>
                <Text style={styles.statLabel}>following</Text>
              </View>
            </View>
          </View>

          <Text style={styles.name}>{userProfile.name}</Text>
          <Text style={styles.bio}>{userProfile.bio}</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts Grid */}
        {myPosts.length === 0 ? (
          <View style={styles.noPostsContainer}>
            <Ionicons name="camera-outline" size={48} color={COLORS.grey} />
            <Text style={styles.noPostsText}>No posts yet</Text>
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {myPosts.map((post) => (
              <View key={post.id} style={styles.gridItem}>
                {renderGridItem({ item: post })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: COLORS.grey, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={COLORS.grey}
                style={styles.input}
              />
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

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post Detail Modal */}
      {selectedPost && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.postDetailContainer}>
              {/* Close Header */}
              <View style={styles.postDetailHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Post Details */}
              <View style={{ backgroundColor: COLORS.background }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
                  <Image source={{ uri: selectedPost.userAvatar }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
                  <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>{selectedPost.username}</Text>
                </View>

                <Image source={{ uri: selectedPost.image }} style={styles.postDetailImage} />

                <View style={{ padding: 12 }}>
                  <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14, marginBottom: 4 }}>
                    {selectedPost.likes} likes
                  </Text>
                  <Text style={{ color: COLORS.white, fontSize: 14, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '600' }}>{selectedPost.username} </Text>
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

