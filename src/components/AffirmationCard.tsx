import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors, Spacing, BorderRadius, FontSizes, FontFamily, LineHeights } from "@/constants/theme";

interface AffirmationCardProps {
  text: string;
  onShuffle?: () => void;
  canShuffle?: boolean;
}

export function AffirmationCard({ text, onShuffle, canShuffle = false }: AffirmationCardProps) {
  const handlePress = () => {
    if (canShuffle && onShuffle) {
      onShuffle();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        canShuffle && pressed && styles.pressed
      ]}
      onPress={handlePress}
      disabled={!canShuffle}
    >
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['2xl'],
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: FontSizes.lg,
    lineHeight: LineHeights.lg,
    fontFamily: FontFamily.handwriting,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
