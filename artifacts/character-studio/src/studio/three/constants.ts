/**
 * Constantes de rendu recopiées à l'identique du jeu
 * (`Game-Visual-Revamp/artifacts/3d-game/src/game/GameCanvas.tsx`).
 *
 * Elles vivent dans leur propre module, sans importer React ni three, pour
 * deux raisons : l'interface les consomme via `Stage.tsx`, et la CLI en a
 * besoin pour ses contrôles de palette — un `glow` trop sombre ne déclenchera
 * pas le bloom, et c'est le seuil ci-dessous qui le décide.
 *
 * **Si le jeu change son rendu, c'est ici qu'il faut le répercuter, et
 * nulle part ailleurs.**
 */

export const LIGHTING = {
  background: '#0d1117',
  ambient: { intensity: 0.45, color: '#b8c4ff' },
  key: { intensity: 1.4, color: '#fff2dd', position: [10, 20, 10] as const },
  point: { intensity: 0.3, color: '#ffebc8', position: [0, 5, 0] as const },
  shadowMapSize: [1024, 1024] as [number, number],
};

export const POST = {
  bloom: { luminanceThreshold: 0.45, intensity: 1.6 },
  vignette: { offset: 0.1, darkness: 1.1 },
};

/**
 * Hauteur de monde visible par la caméra du jeu, en unités.
 *
 * `scene/Camera.tsx` place la caméra à `héros + (0, 14, 10)`, soit une distance
 * de √(14² + 10²) ≈ 17,2 ; le `<Canvas>` du jeu ne passe pas de `camera`, donc
 * le fov est celui par défaut de R3F, 75°. D'où 2 × 17,2 × tan(37,5°) ≈ 26,4.
 *
 * Un personnage d'1,5 unité n'occupe donc que ~6 % de la hauteur de l'écran en
 * jeu : le bloom et la vignette étant des effets *écran*, leur force apparente
 * dépend de cette taille.
 */
export const GAME_VIEW_HEIGHT = 26.4;
