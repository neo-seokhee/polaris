import { View, Text, StyleSheet } from "react-native";
import { User } from "@supabase/supabase-js";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface ProfileHeaderProps {
  user: User | null;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user?.user_metadata?.name || '사용자'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
  },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  email: {
    fontSize: FontSizes.sm,
    fontWeight: '400',
    color: Colors.textMuted,
  },
});

