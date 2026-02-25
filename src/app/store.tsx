import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { getModuleCatalogByCategory } from "@/modules/moduleCatalog";

const grouped = getModuleCatalogByCategory();

function showAlert(title: string, message: string) {
    if (Platform.OS === "web") {
        window.alert(`${title}\n${message}`);
        return;
    }
    Alert.alert(title, message);
}

export default function StoreScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>스토어</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={styles.description}>
                    모든 기능을 무료로 사용할 수 있어요. 준비중인 기능은 출시 후 자동으로 활성화됩니다.
                </Text>

                {grouped.map((group) => (
                    <View key={group.category} style={styles.section}>
                        <Text style={styles.sectionTitle}>{group.category}</Text>
                        <View style={styles.card}>
                            {group.items.map((item, index) => {
                                const Icon = item.icon;
                                const isComingSoon = item.status === "comingSoon";
                                const iconColor = isComingSoon ? Colors.textMuted : Colors.accent;
                                return (
                                    <Pressable
                                        key={item.key}
                                        style={[styles.row, index < group.items.length - 1 && styles.rowDivider]}
                                        onPress={() => {
                                            if (isComingSoon || !item.moduleId) {
                                                showAlert("준비중", "아직 준비중인 기능입니다.");
                                                return;
                                            }
                                            router.push(`/module/${item.moduleId}`);
                                        }}
                                    >
                                        <View style={[styles.iconWrap, isComingSoon && styles.iconWrapComingSoon]}>
                                            <Icon size={16} color={iconColor} />
                                        </View>
                                        <View style={styles.rowMeta}>
                                            <View style={styles.rowTop}>
                                                <Text style={[styles.rowTitle, isComingSoon && styles.rowTitleComingSoon]}>
                                                    {item.title}
                                                </Text>
                                                {isComingSoon ? (
                                                    <Text style={styles.badgeComingSoon}>준비중</Text>
                                                ) : (
                                                    <Text style={styles.badgeFree}>무료</Text>
                                                )}
                                            </View>
                                            <Text style={styles.rowDescription} numberOfLines={1}>
                                                {item.description}
                                            </Text>
                                        </View>
                                        <ChevronRight size={16} color={Colors.textMuted} />
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSecondary,
    },
    backButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    headerPlaceholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing['4xl'],
        gap: Spacing['3xl'],
    },
    description: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    section: {
        gap: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    card: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: Colors.borderSecondary,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing['2xl'],
    },
    rowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSecondary,
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.bgCard,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapComingSoon: {
        backgroundColor: Colors.bgMuted,
    },
    rowMeta: {
        flex: 1,
        gap: 2,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    rowTitle: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    rowTitleComingSoon: {
        color: Colors.textSecondary,
    },
    badgeFree: {
        fontSize: FontSizes.xs,
        color: Colors.accent,
        borderWidth: 1,
        borderColor: Colors.accent,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 1,
        overflow: 'hidden',
    },
    badgeComingSoon: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        borderWidth: 1,
        borderColor: Colors.borderSecondary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 1,
        overflow: 'hidden',
    },
    rowDescription: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
});
