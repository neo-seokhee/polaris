import Svg, { Path } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

export function KakaoIcon({ size = 18, color = '#191919' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.651 1.719 4.98 4.318 6.32-.134.47-.866 3.028-.897 3.24 0 0-.018.146.078.203.095.057.207.014.207.014.273-.038 3.163-2.068 3.662-2.424.867.126 1.762.193 2.632.193 5.523 0 10-3.463 10-7.546C22 6.463 17.523 3 12 3z" />
        </Svg>
    );
}

export function AppleIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </Svg>
    );
}
