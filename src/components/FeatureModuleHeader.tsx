import type { ReactNode } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Colors, Spacing, FontSizes } from "@/constants/theme";

interface FeatureModuleHeaderProps {
  title: string;
  rightAction?: ReactNode;
}

export function FeatureModuleHeader({ title, rightAction }: FeatureModuleHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleWrap}>
        <Image source={require("../../assets/sparkle-icon.png")} style={styles.icon} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightAction ? <View style={styles.rightActionWrap}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing.md,
    backgroundColor: Colors.bgPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  icon: {
    width: 23,
    height: 23,
  },
  title: {
    fontSize: FontSizes["3xl"],
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rightActionWrap: {
    marginLeft: Spacing.md,
  },
});
