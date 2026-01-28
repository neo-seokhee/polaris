import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Plus, Search } from "lucide-react-native";
import { Colors, FontSizes, Spacing } from "@/constants/theme";

export function MemoHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Image source={require('../../assets/sparkle-icon.png')} style={styles.icon} />
        <Text style={styles.title}>메모</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity>
          <Search size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Plus size={18} color={Colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 23,
    height: 23,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
  },
});
