import { useRouter } from "expo-router";
import React from "react";
import { Button, Text, View } from "react-native";

const Profile = () => {
  const router = useRouter();
  return (
    <View>
      <Text style={{ fontSize: 30 }}>profile page</Text>
      <Button title="메인으로 이동" onPress={() => router.push("/(tabs)")} />
      <Button
        title="알림으로 이동"
        onPress={() => router.push("/(tabs)/notification")}
      />
    </View>
  );
};

export default Profile;
