import { Redirect, Tabs, usePathname } from "expo-router";
import { Menu } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { WindroseIcon } from "@/components/icons/WindroseIcon";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { FEATURE_MODULE_MAP } from "@/modules/featureModules";

const Colors = {
    bgSecondary: '#111113',
    bgTertiary: '#1A1A1D',
    borderSecondary: '#1F1F23',
    accent: '#FFD700',
    textMuted: '#6B6B70',
    textPrimary: '#FFFFFF',
    textOnDark: '#0A0A0B',
    bgPrimary: '#0A0A0B',
};

export default function TabLayout() {
    const { user, loading, isDemoMode } = useAuth();
    const { shortcuts, ready: moduleReady } = useFeatureModules();
    const pathname = usePathname();
    const isCompassActive = pathname?.includes("/compass");

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.accent} />
            </View>
        );
    }

    if (!moduleReady) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.accent} />
            </View>
        );
    }

    // If user is not logged in and not in demo mode, redirect to login
    if (!user && !isDemoMode) {
        return <Redirect href="/(auth)/login" />;
    }

    const slot1Module = FEATURE_MODULE_MAP[shortcuts.slot1];
    const slot2Module = FEATURE_MODULE_MAP[shortcuts.slot2];
    const slot4Module = FEATURE_MODULE_MAP[shortcuts.slot4];
    const Slot1Icon = slot1Module.icon;
    const Slot2Icon = slot2Module.icon;
    const Slot4Icon = slot4Module.icon;

    return (
        <Tabs
            initialRouteName="slot1"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.bgSecondary,
                    borderTopColor: Colors.borderSecondary,
                    borderTopWidth: 1,
                    height: 86,
                    paddingBottom: 12,
                    paddingTop: 12,
                },
                tabBarActiveTintColor: Colors.accent,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="slot1"
                options={{
                    title: slot1Module.tabLabel,
                    tabBarIcon: ({ color, size }) => <Slot1Icon color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="slot2"
                options={{
                    title: slot2Module.tabLabel,
                    tabBarIcon: ({ color, size }) => <Slot2Icon color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="compass"
                options={{
                    title: "컴파스",
                    tabBarButton: ({ onPress }) => {
                        return (
                            <Pressable style={styles.compassTabButtonWrap} onPress={onPress}>
                                <View style={[styles.compassTabButton, isCompassActive && styles.compassTabButtonActive]}>
                                    <WindroseIcon color={isCompassActive ? Colors.accent : Colors.textPrimary} size={30} />
                                </View>
                            </Pressable>
                        );
                    },
                }}
            />
            <Tabs.Screen
                name="slot4"
                options={{
                    title: slot4Module.tabLabel,
                    tabBarIcon: ({ color, size }) => <Slot4Icon color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "더보기",
                    tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
                }}
            />
            <Tabs.Screen name="index" options={{ href: null }} />
            <Tabs.Screen name="goals" options={{ href: null }} />
            <Tabs.Screen name="memo" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
    },
    compassTabButtonWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
    },
    compassTabButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.borderSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.35)',
        elevation: 8,
    },
    compassTabButtonActive: {
        backgroundColor: Colors.bgTertiary,
        borderColor: Colors.borderSecondary,
        borderWidth: 1,
    },
});
