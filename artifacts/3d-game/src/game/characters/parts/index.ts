import type React from 'react';
import type { PartProps, HeadwearKey, BackKey, NeckKey, FaceGearKey } from '../types';
import {
  MushroomCap, Beanie, AntennaDome, VisorHelmet, Hood, ConeHat, LeafCrown, Hair, HornHelmet,
} from './heads';
import {
  Backpack, Wings, Jetpack, Cape, Shell, Scarf, Turtleneck, GlowNecklace,
} from './accessories';
import { RoundGlasses, TintedVisor, Mask } from './faces';

// Typed part registries. Adding an accessory = adding a component + one
// entry here, without touching ToonHumanoid.

export const headwearRegistry = {
  mushroom: MushroomCap,
  beanie: Beanie,
  antennaDome: AntennaDome,
  visorHelmet: VisorHelmet,
  hood: Hood,
  coneHat: ConeHat,
  leafCrown: LeafCrown,
  hair: Hair,
  hornHelmet: HornHelmet,
} satisfies Record<HeadwearKey, React.FC<PartProps>>;

export const backRegistry = {
  backpack: Backpack,
  wings: Wings,
  jetpack: Jetpack,
  cape: Cape,
  shell: Shell,
} satisfies Record<BackKey, React.FC<PartProps>>;

export const neckRegistry = {
  scarf: Scarf,
  turtleneck: Turtleneck,
  glowNecklace: GlowNecklace,
} satisfies Record<NeckKey, React.FC<PartProps>>;

export const faceGearRegistry = {
  roundGlasses: RoundGlasses,
  tintedVisor: TintedVisor,
  mask: Mask,
} satisfies Record<FaceGearKey, React.FC<PartProps>>;
