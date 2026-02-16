import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export function DemoBanner() {
    const { isDemoMode } = useAuth();

    if (!isDemoMode) return null;

    const handlePress = () => {
        router.push('/(tabs)/profile');
    };

    return (
        <Pressable style={styles.container} onPress={handlePress}>
            <View style={styles.content}>
                <Sparkles size={14} color={Colors.textOnDark} />
                <Text style={styles.text}>
                    체험 모드입니다. 회원가입하면 데이터가 저장돼요!
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.accent,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['2xl'],
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    text: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
