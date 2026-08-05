import React from 'react';
import { PartProps, HeadwearKey, BackKey, NeckKey, FaceGearKey } from '../types';
import {
  MushroomCap,
  Beanie,
  AntennaDome,
  VisorHelmet,
  Hood,
  ConeHat,
  LeafCrown,
  Hair,
  HornHelmet,
} from './heads';
import {
  Satchel,
  Wings,
  Jetpack,
  Cape,
  Shell,
  Scarf,
  Turtleneck,
  GlowNecklace,
} from './accessories';
import { RoundGlasses, TintedVisor, Mask } from './faces';

// Adding an accessory = add a component + one registry entry.
// ToonHumanoid never needs to change.

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
  satchel: Satchel,
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
