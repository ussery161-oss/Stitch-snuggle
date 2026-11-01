import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Stitch & Snuggle</Text>
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4E6' },
  title: { fontSize: 40, color: '#4A3A3A' },
});
