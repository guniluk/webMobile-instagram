import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/notifications.styles";

const Notification = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>notification page</Text>
      <Link href="/(tabs)" style={{ color: "yellow", fontSize: 20 }}>
        move to Home Page
      </Link>
    </View>
  );
};

export default Notification;
