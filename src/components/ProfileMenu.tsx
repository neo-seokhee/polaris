import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Settings, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface ProfileMenuProps {
  onLogout: () => Promise<void>;
}

export function ProfileMenu({ onLogout }: ProfileMenuProps) {
  const handleLogout = () => {
    Alert.alert(
      "로그아웃",
      "정말 로그아웃 하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { text: "로그아웃", style: "destructive", onPress: onLogout },
      ]
    );
  };

  const menuItems = [
    { icon: Settings, label: "설정", color: Colors.textMuted, onPress: () => { } },
    { icon: Bell, label: "알림", color: Colors.textMuted, onPress: () => { } },
    { icon: HelpCircle, label: "도움말", color: Colors.textMuted, onPress: () => { } },
    { icon: LogOut, label: "로그아웃", color: Colors.error, onPress: handleLogout },
  ];

  return (
    <View style={styles.container}>
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Pressable key={index} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <Icon size={20} color={item.color} />
              <Text style={[styles.menuItemText, { color: item.color }]}>
                {item.label}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.bgSecondary,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
  },
  menuItemText: {
    fontSize: FontSizes.base,
    fontWeight: '500',
  },
});

