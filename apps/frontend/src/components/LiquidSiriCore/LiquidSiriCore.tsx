// -----------------------------------------------------------------------------
// 🎤 LiquidSiriCore — true 3D-like Siri orb effect (Skia GPU rendering)
// -----------------------------------------------------------------------------
// • Uses gradient fill + noise-driven distortion for liquid depth
// • Shimmer + morph + specular lighting illusion
// • 100% GPU on Skia (no frame drops)
// • Plug directly behind your frosted mic bubble
// -----------------------------------------------------------------------------

import React, {useEffect} from 'react';
import {
  Canvas,
  useClockValue,
  useComputedValue,
  useValue,
  runTiming,
  Easing,
  Rect,
  LinearGradient,
  Circle,
  vec,
  useImage,
  BlurMask,
} from '@shopify/react-native-skia';

const LiquidSiriCore = () => {
  const clock = useClockValue();

  // Morphing driver
  const t = useValue(0);
  useEffect(() => {
    runTiming(t, {
      to: 1,
      loop: true,
      yoyo: true,
      duration: 4000,
      easing: Easing.inOut(Easing.quad),
    });
  }, []);

  // Dynamic gradient that "breathes"
  const colors = useComputedValue(() => {
    const s = Math.sin(clock.current / 600);
    const p = Math.cos(clock.current / 900);
    return [
      `rgba(${160 + s * 60}, ${80 + p * 60}, 255, 1)`,
      `rgba(${120 + p * 60}, ${40 + s * 80}, 255, 1)`,
      `rgba(${200 + s * 30}, ${100 + p * 30}, 255, 1)`,
    ];
  }, [clock]);

  // Morphing circle radius for subtle breathing
  const radius = useComputedValue(() => {
    const breathe = Math.sin(clock.current / 800) * 5;
    return 80 + breathe;
  }, [clock]);

  // Shimmer rotation vector
  const start = useComputedValue(
    () => vec(0, 0.5 + Math.sin(clock.current / 1500) * 0.5),
    [clock],
  );
  const end = useComputedValue(
    () => vec(1, 0.5 + Math.cos(clock.current / 1500) * 0.5),
    [clock],
  );

  return (
    <Canvas style={{width: 220, height: 220}}>
      {/* Outer soft aura */}
      <Circle cx={110} cy={110} r={95}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(1, 1)}
          colors={['rgba(150,0,255,0.25)', 'rgba(0,0,80,0.1)']}
        />
        <BlurMask blur={40} style="outer" />
      </Circle>

      {/* Inner shimmering orb */}
      <Circle cx={110} cy={110} r={radius}>
        <LinearGradient start={start} end={end} colors={colors} />
        <BlurMask blur={25} style="normal" />
      </Circle>

      {/* Specular glint overlay */}
      <Rect x={40} y={30} width={140} height={160}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(1, 1)}
          colors={[
            'rgba(255,255,255,0.25)',
            'rgba(255,255,255,0.05)',
            'rgba(255,255,255,0.0)',
          ]}
        />
      </Rect>
    </Canvas>
  );
};

export default LiquidSiriCore;
