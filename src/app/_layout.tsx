import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet, Platform, Text, TextInput } from "react-native";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { EntitlementsProvider } from "@/contexts/EntitlementsContext";
import { DemoNudgeProvider } from "@/contexts/DemoNudgeContext";
import { WebLayoutProvider, useWebLayout } from "@/contexts/WebLayoutContext";
import { FeatureModulesProvider } from "@/contexts/FeatureModulesContext";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 스플래시 화면 유지
SplashScreen.preventAutoHideAsync();

// 전역 기본 폰트 및 줄 간격 설정
const defaultFontFamily = "Pretendard";
const lineHeightMultiplier = 1.6;

// Text, TextInput 컴포넌트의 기본 폰트 및 줄 간격 설정
const setDefaultFont = () => {
    const oldTextRender = (Text as any).render;
    (Text as any).render = function (...args: any[]) {
        const origin = oldTextRender.call(this, ...args);
        const flatStyle = StyleSheet.flatten(origin.props.style) || {};
        const fontSize = flatStyle.fontSize || 12;
        const lineHeight = flatStyle.lineHeight || Math.round(fontSize * lineHeightMultiplier);

        return {
            ...origin,
            props: {
                ...origin.props,
                style: [{ fontFamily: defaultFontFamily, lineHeight }, origin.props.style],
            },
        };
    };

    const oldTextInputRender = (TextInput as any).render;
    (TextInput as any).render = function (...args: any[]) {
        const origin = oldTextInputRender.call(this, ...args);
        const flatStyle = StyleSheet.flatten(origin.props.style) || {};
        const fontSize = flatStyle.fontSize || 12;
        const lineHeight = flatStyle.lineHeight || Math.round(fontSize * lineHeightMultiplier);

        return {
            ...origin,
            props: {
                ...origin.props,
                style: [{ fontFamily: defaultFontFamily, lineHeight }, origin.props.style],
            },
        };
    };
};

setDefaultFont();

function AppContent() {
    const { isTodoBoardWide, isSettlementCalendarWide } = useWebLayout();
    const isWideFrame = isTodoBoardWide || isSettlementCalendarWide;

    const content = (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack>
        </GestureHandlerRootView>
    );

    if (Platform.OS === 'web') {
        return (
            <View style={styles.webContainer}>
                <View style={[styles.mobileFrame, isWideFrame && styles.mobileFrameWide]}>
                    {content}
                </View>
            </View>
        );
    }

    return content;
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        "Pretendard": require("../../assets/fonts/Pretendard-Regular.otf"),
        "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
        "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
        "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
        "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
        "HakgyoansimBareonbatang": require("../../assets/fonts/HakgyoansimBareonbatangR.ttf"),
        "HakgyoansimBareonbatang-Bold": require("../../assets/fonts/HakgyoansimBareonbatangB.ttf"),
    });

    useEffect(() => {
        if (fontsLoaded) {
            // 스플래시 화면 1.5초 유지 후 숨김
            const timer = setTimeout(() => {
                SplashScreen.hideAsync();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <AuthProvider>
            <NetworkProvider>
                <AnalyticsProvider>
                    <EntitlementsProvider>
                        <DemoNudgeProvider>
                            <FeatureModulesProvider>
                                <WebLayoutProvider>
                                    <AppContent />
                                </WebLayoutProvider>
                            </FeatureModulesProvider>
                        </DemoNudgeProvider>
                    </EntitlementsProvider>
                </AnalyticsProvider>
            </NetworkProvider>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    webContainer: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mobileFrame: {
        width: '100%',
        maxWidth: 430, // iPhone 14 Pro Max width
        height: '100%',
        maxHeight: 932, // iPhone 14 Pro Max height
        overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
        ...(Platform.OS === 'web' && {
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
        }),
    },
    mobileFrameWide: {
        maxWidth: '100%',
        maxHeight: '100%',
        ...(Platform.OS === 'web' && {
            boxShadow: 'none',
        }),
    },
});
