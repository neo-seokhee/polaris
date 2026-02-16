import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export interface AppleCredential {
    user: string;
    email: string | null;
    fullName: AppleAuthentication.AppleAuthenticationFullName | null;
    identityToken: string | null;
    authorizationCode: string | null;
    nonce?: string;
}

export async function signInWithApple(): Promise<AppleCredential> {
    const rawNonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const requestedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: requestedNonce,
    });

    return {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        nonce: rawNonce,
    };
}

export async function isAppleAuthAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
        return false;
    }
    return await AppleAuthentication.isAvailableAsync();
}
