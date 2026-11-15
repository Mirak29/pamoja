# Vitrine : l'aperçu vidéo du README

La vidéo de [`README.md`](../../README.md) est du code : chaque image est une
fonction du temps, rendue image par image. Elle se refait en trois commandes à
chaque nouvelle version de l'app, et sert de modèle pour les prochaines vidéos.

| Fichier | Rôle |
| --- | --- |
| [`capture.ts`](capture.ts) | capture les écrans d'un Pamoja qui tourne, en thème clair, pages entières, dans `screens/` |
| [`scene.html`](scene.html) | la scène : les plans, les textes, les mouvements ; `renderAt(t)` dessine n'importe quel instant |
| [`render.ts`](render.ts) | rend la scène en MP4 (1920×1080, 30 i/s) et en GIF pour le README |
| `screens/` | les captures utilisées par la scène |
| `pamoja-apercu.mp4`, `pamoja-apercu.gif` | le résultat |

## Refaire la vidéo

Il faut Deno, ffmpeg et Chrome (ou Edge ; `CHROME=<chemin>` pour un autre).

1. Lancer Pamoja avec les données de démo, par exemple la méthode 1 du
   [README](../../README.md#lancer-lapp) (port 8000).
2. Capturer les écrans :

   ```bash
   deno run -A docs/vitrine/capture.ts http://localhost:8000
   ```

3. Relire avant de rendre : une image par seconde, en mosaïque, dans
   `docs/vitrine/sheet.png` (ignoré par Git).

   ```bash
   deno run -A docs/vitrine/render.ts --sheet
   ```

   Ouvrir `scene.html` dans un navigateur la joue aussi en boucle.
4. Rendre :

   ```bash
   deno run -A docs/vitrine/render.ts
   ```

   `--draft` rend une version à mi-résolution (`draft.mp4`, ignoré par Git).

## Le style

- **Plans** : un écran par plan, environ 3 s, la page inclinée (44° vers
  l'arrière, 8° de rotation) qui défile vers le bas ; fondu de 0,45 s entre deux
  plans. Puis tous les écrans côte à côte, la caméra recule, et le carton final
  tient 2,5 s.
- **Textes** : un sur-titre en IBM Plex Mono (`01 · Le fil`), un titre en
  Bricolage Grotesque, une partie en Instrument Serif italique, en indigo. Assez
  court pour être lu pendant le plan (environ 0,3 s par mot).
- **Couleurs** : celles du thème clair ([`docs/identite/tokens.json`](../identite/tokens.json)) :
  fond `#F6F6F8`, encre `#1D1D25`, indigo `#3340B8`.
- **Mouvement** : `cubic-bezier(0.22, 1, 0.36, 1)` pour les entrées,
  `(0.65, 0, 0.35, 1)` pour les défilements. Pas de particules, de lueurs ni de
  rebonds.

Pour changer les plans, modifier `SHOTS` en haut du script de `scene.html` ;
pour ajouter un écran, l'ajouter aussi à `screens` dans `capture.ts`.
