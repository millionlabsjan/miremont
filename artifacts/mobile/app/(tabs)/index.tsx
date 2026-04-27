import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, world</Text>
      <Text style={styles.text}>
        Mobile artifact placeholder. Replace with the real app from GitHub.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  text: { fontSize: 16, textAlign: "center" },
});
