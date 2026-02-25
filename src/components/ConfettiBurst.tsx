import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

const PARTICLE_COUNT = 8;
const COLORS = ['#FFD700', '#FFA000', '#FF6B6B', '#4CAF50', '#42A5F5', '#E040FB'];

interface ParticleData {
  anim: Animated.Value;
  dx: number;
  dy: number;
  gravity: number;
  color: string;
  size: number;
  isRect: boolean;
  rotationEnd: string;
}

function createParticles(): ParticleData[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    const distance = 18 + Math.random() * 28;
    return {
      anim: new Animated.Value(0),
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      gravity: 10 + Math.random() * 10,
      color: COLORS[i % COLORS.length],
      size: 3 + Math.random() * 2.5,
      isRect: Math.random() > 0.5,
      rotationEnd: `${(Math.random() - 0.5) * 300}deg`,
    };
  });
}

interface ConfettiBurstProps {
  onComplete?: () => void;
}

export function ConfettiBurst({ onComplete }: ConfettiBurstProps) {
  const particles = useRef(createParticles()).current;

  useEffect(() => {
    const anims = particles.map((p, i) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 550 + Math.random() * 200,
        delay: i * 10,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    const composite = Animated.parallel(anims);
    composite.start(() => onComplete?.());
    return () => composite.stop();
  }, []);

  return (
    <View style={styles.container}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.isRect ? p.size * 1.6 : p.size,
            backgroundColor: p.color,
            borderRadius: p.isRect ? 1 : p.size / 2,
            opacity: p.anim.interpolate({
              inputRange: [0, 0.1, 0.55, 1],
              outputRange: [0, 1, 0.8, 0],
            }),
            transform: [
              {
                translateX: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.dx],
                }),
              },
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, p.dy, p.dy + p.gravity],
                }),
              },
              {
                scale: p.anim.interpolate({
                  inputRange: [0, 0.08, 0.35, 1],
                  outputRange: [0, 1.4, 1, 0.3],
                }),
              },
              {
                rotate: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', p.rotationEnd],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 0,
    height: 0,
    pointerEvents: 'none',
  },
});
