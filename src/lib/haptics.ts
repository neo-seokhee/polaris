import { Platform } from 'react-native';

let Haptics: typeof import('expo-haptics') | null = null;

if (Platform.OS !== 'web') {
  Haptics = require('expo-haptics');
}

export function lightImpact() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function mediumImpact() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function successNotification() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function selectionChanged() {
  Haptics?.selectionAsync();
}
