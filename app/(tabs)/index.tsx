import { useRouter } from "expo-router";
import { Button, Text, View } from "react-native";
import { styles } from "../../styles/auth.styles";

export default function Index() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Hello World~~</Text>
      <Button
        title="프로필로 이동"
        onPress={() => router.push("/(tabs)/profile")}
      />
      <Button
        title="알림으로 이동"
        onPress={() => router.push("/(tabs)/notification")}
      />
    </View>
  );
}
