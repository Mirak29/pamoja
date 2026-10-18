# Trophées mats du profil — PAM-317

Direction validée : petits objets isométriques en résine mate ivoire et indigo,
présentés sur une étagère commune. Les six rendus ont été générés avec **ImageGen
intégré**, à partir de la maquette d'étagère validée dans la conversation. Les WebP
512 × 512 conservent le canal alpha des PNG générés. Ils ne représentent pas des
modèles 3D interactifs : la profondeur est dans le rendu, le survol est en CSS.

## Fichiers

| Fichier | Badge | Objet | PNG source ImageGen |
| --- | --- | --- | --- |
| `review.webp` | Reviewer de confiance | Presse qui valide une plaque de code | `exec-487fcfba-8ee8-4ad7-97a8-14e852e6911f.png` |
| `build.webp` | Bâtisseur | Construction modulaire avec escalier et chevrons de code | `exec-87273122-525b-4a6f-8915-5034bc6e746b.png` |
| `border.webp` | Bâtisseur sans frontières | Pont entre deux îlots | `exec-1cbe46ad-5fb1-4b19-acda-874c9d7f1763.png` |
| `help.webp` | Premier à répondre | Balise avec un éclair | `exec-b91f60a4-c708-4635-8c87-95bd42c98532.png` |
| `mentor.webp` | Mentor | Deux constructions reliées par des marches | `exec-4b46cbd3-fe8c-4b64-ae31-c2ff6e2d3e29.png` |
| `oss.webp` | Contributeur open source | Sculpture de branches qui se rejoignent | `exec-09bcb4d8-a28a-496e-b2c1-245bd144ea20.png` |

Les PNG originaux restent dans le dossier des images générées de la conversation.
Les fichiers consommés par l'application sont tous versionnés ici. Le helper
`task-copy-assets.ts` copie les WebP dans `dist/badges/` en développement et au build
de production. Après remplacement d'un asset, relancer le serveur de dev ou le build.

## Prompts de génération

Prompt commun utilisé pour les six appels, avec la maquette d'étagère comme image
référence et `transparent_background: true` :

> Use case: stylized-concept. Asset type: production website achievement trophy,
> isolated transparent PNG. The supplied image is a STYLE AND SUBJECT REFERENCE
> for the approved Pamoja trophy collection. Extract/recreate the requested ONE
> trophy as a standalone clean cutout, not the surrounding interface. Match the
> reference's premium matte ivory and indigo #3340B8 soft-touch resin/ceramic
> texture, rounded bevels, sculptural volume and soft upper-left studio light.
> Orthographic three-quarter isometric view looking down at 30 degrees; front and
> right faces visible. A small desirable designer desk toy, sophisticated and
> friendly. Square canvas, whole object fully visible occupying around 80% of the
> frame with consistent 10% transparent margins; base at about 88% canvas height.
> Real alpha transparency everywhere outside the object, including any gap under
> arches or between parts; NO background, NO floor, NO display shelf, NO rectangular
> shadow or gradient background. Very subtle small contact shadow directly beneath
> the object is acceptable with transparent falloff. No words, letters, rank label,
> badge container, UI, watermark, decorative sparkles, chrome or gold. Keep strong
> clear silhouette readable at 120px.

Déclinaisons de sujet ajoutées au prompt commun :

- **Review** : recréer la presse de la maquette, châssis en C ivoire, levier et
  tampon indigo, coche et trois lignes gravées sur une plaque de code, socle gris.
- **Build** : recréer la construction de la maquette, blocs ivoire et indigo,
  petit escalier et chevrons de code en relief sur le bloc avant.
- **Border** : recréer le pont indigo à arches entre deux îlots ivoire surélevés,
  connecteurs ronds indigo ; conserver la transparence entre les îlots et les arches.
- **Help** : petite balise ivoire sur un socle carré à deux couches, dôme indigo
  mat et grand éclair ivoire en relief, sans rayons lumineux ni clignotement.
- **Mentor** : deux constructions distinctes à bords doux, une grande et une
  petite, ivoire et indigo avec chevrons de code, reliées par des marches indigo.
- **OSS** : sculpture de branches Git en rails cylindriques indigo qui se
  rejoignent, trois disques terminaux ivoire, debout sur un socle carré ivoire/gris.

## Intégration

Les labels, niveaux et actions sont du vrai texte HTML, indépendants des images.
Les trophées acquis apparaissent sur l'étagère ; les badges avant le Bronze
restent dans « En cours de construction ». Aucun seuil ni calcul n'a été modifié.
La silhouette identifie le type de badge ; son niveau actuel est indiqué par son
libellé et les quatre paliers du panneau de détail, pas par une variante d'image.
