import { Redirect, Tabs } from "expo-router";
import { ListChecks, Target, Calendar, StickyNote, Settings } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

const Colors = {
    bgSecondary: '#111113',
    borderSecondary: '#1F1F23',
    accent: '#FFD700',
    textMuted: '#6B6B70',
    bgPrimary: '#0A0A0B',
};

export default function TabLayout() {
    const { user, loading, isDemoMode } = useAuth();

    if (loading) {
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

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.bgSecondary,
                    borderTopColor: Colors.borderSecondary,
                    borderTopWidth: 1,
                    height: 80,
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
                name="index"
                options={{
                    title: "할일",
                    tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    title: "일정",
                    tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="goals"
                options={{
                    title: "목표",
                    tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="memo"
                options={{
                    title: "메모",
                    tabBarIcon: ({ color, size }) => <StickyNote color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "설정",
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
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
});
