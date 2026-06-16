import React from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/notifications.styles';
import { usePostsStore, Notification } from '../../store/postsStore';
import { COLORS } from '@/constants/theme';

export default function Notifications() {
  const { notifications } = usePostsStore();

  const getBadgeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={12} color="#ff3040" />;
      case 'comment':
        return <Ionicons name="chatbubble" size={11} color="#0095f6" />;
      case 'follow':
        return <Ionicons name="person-add" size={11} color={COLORS.primary} />;
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        {/* Avatar with Badge */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.iconBadge}>
            {getBadgeIcon(item.type)}
          </View>
        </View>

        {/* Info Text */}
        <View style={styles.notificationInfo}>
          <Text style={styles.username}>
            {item.username}{' '}
            <Text style={styles.action}>{item.action}</Text>
          </Text>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>
      </View>

      {/* Post Image Preview (if available) */}
      {item.postImage && (
        <Image source={{ uri: item.postImage }} style={styles.postImage} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={[styles.centered, { marginTop: 40 }]}>
            <Ionicons name="heart-dislike-outline" size={48} color={COLORS.grey} />
            <Text style={{ color: COLORS.grey, marginTop: 12 }}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
