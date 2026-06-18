import React, { useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/notifications.styles';
import { COLORS } from '@/constants/theme';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Notifications() {
  const notifications = useQuery(api.notifications.getNotifications) || [];
  const deleteNotificationMutation = useMutation(api.notifications.deleteNotification);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation({ notificationId: notificationId as any });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={12} color="#ff3040" />;
      case 'comment':
        return <Ionicons name="chatbubble" size={11} color="#0095f6" />;
      case 'follow':
        return <Ionicons name="person-add" size={11} color={COLORS.primary} />;
      default:
        return <Ionicons name="notifications" size={11} color={COLORS.grey} />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
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

      {/* Right Column: Post Image Preview & Delete Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {item.postImage && (
          <Image source={{ uri: item.postImage }} style={styles.postImage} />
        )}
        
        {/* Delete Button */}
        <TouchableOpacity 
          onPress={() => handleDeleteNotification(item.id)}
          style={{ padding: 4 }}
        >
          <Ionicons name="close" size={20} color={COLORS.grey} />
        </TouchableOpacity>
      </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.white}
            colors={[COLORS.primary]}
          />
        }
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
