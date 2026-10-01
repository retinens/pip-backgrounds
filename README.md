# PiP Backgrounds

Fonds animés en WebGL (Three.js), 100 % navigateur, pensés pour être placés **derrière les fenêtres PiP** (intervenants, slides) pendant les events corporate. Rendu live en plein écran, en source navigateur OBS / vMix, ou sur un second écran piloté depuis une fenêtre régie.

## Fonds disponibles

| Fond | Description |
| --- | --- |
| Mesh gradient | Dégradé fluide de 4 couleurs, façon Stripe |
| Aurore | Rubans lumineux ondulants |
| Soie / fumée | Plis soyeux par domain-warping |
| Lignes ondulantes | Paysage de lignes en perspective (option grille) |
| Réseau de particules | Constellation de points reliés |
| Bokeh | Disques lumineux flous qui dérivent |
| Formes géométriques | Polyèdres low-poly qui flottent (plein, filaire, verre) |
| Orbes minimalistes | Grosses taches de couleur très lentes |

Chaque fond a ses propres réglages, plus des réglages communs : palette (11 prédéfinies ou 4 couleurs + arrière-plan au choix), vitesse, intensité, échelle, grain, vignettage, luminosité, saturation. Le changement de fond se fait en fondu enchaîné (durée réglable).

## Démarrer

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build statique dans dist/
```

`dist/index.html` peut aussi être ouvert **directement depuis le disque** (double-clic, `file://`) : pratique en régie sans connexion.

## Utilisation en event

### Régie + second écran (recommandé)

1. Ouvrir l'outil sur la machine de régie.
2. Dossier **Sortie (2e écran)** → **Ouvrir la fenêtre de sortie**. Sous Chrome / Edge, la fenêtre s'ouvre directement sur l'autre écran (autoriser la gestion des fenêtres si le navigateur le demande) ; sinon, la glisser sur l'écran voulu.
3. Cliquer dans la fenêtre de sortie pour la passer en plein écran.
4. Tout réglage fait dans la régie est appliqué en direct à la sortie. Décocher **Aperçu dans cette fenêtre** pour laisser toute la puissance GPU à la sortie.

La synchro fonctionne entre fenêtres du même navigateur sur la même machine.

### Source navigateur OBS / vMix

1. Régler le fond, puis **Presets → Copier l'URL live**.
2. Coller l'URL dans une source navigateur en 1920×1080 (ou la résolution de la régie).

L'URL contient toute la configuration (`#cfg=…`) et masque le panneau (`?ui=0`). Un logo importé depuis le disque n'y est **pas** inclus (trop lourd) : dans ce cas, renseigner plutôt une **URL de logo**.

### Raccourcis

| Touche | Action |
| --- | --- |
| `H` | Masquer / afficher le panneau |
| `F` | Plein écran |
| `Espace` | Pause |
| `←` / `→` | Fond précédent / suivant |
| `R` | Mélanger l'ordre des couleurs |
| `?` | Aide |

## Logo client et presets

- **Logo** : import PNG / SVG / JPG / WebP ou URL, 9 positions, largeur, marge, opacité. Le logo importé est gardé dans le navigateur.
- **Presets** : enregistrés dans le navigateur (logo compris si la place le permet), exportables / importables en JSON pour les passer d'une machine à l'autre.
- La dernière configuration est restaurée automatiquement à la réouverture.

## Conseils

- Sur une palette claire, éviter les modes additifs (Aurore, Bokeh « mode lumière ») qui saturent vers le blanc, et baisser le vignettage.
- Les fonds shader (mesh, soie, aurore, orbes) sont les plus légers ; en 4K sur une petite machine, préférer 30 i/s (dossier **Rendu**).
- Un peu de grain évite les effets d'escalier dans les dégradés sur les projecteurs / murs LED.

## Ajouter un fond

Créer un fichier dans `src/scenes/` puis l'ajouter à `src/scenes/index.js`.

- **Fond shader** : étendre `ShaderScene` et fournir `static fragment`. Les uniforms communs (`uTime`, `uRes`, `uColors[4]`, `uBg`, `uIntensity`, `uScale`), le bruit simplex (`snoise`, `fbm`) et `palette(t)` viennent de `fragHeader()` (`src/shaders/common.js`).
- **Fond Three.js** : étendre `BaseScene`, construire la scène dans `init()`, animer dans `onUpdate(time, dt)`, synchroniser les couleurs dans `onCommon()`.
- **Réglages** : `static params = { foo: { label, value, min, max, step } }`. Un réglage numérique `foo` est envoyé automatiquement à l'uniform `uFoo` s'il existe ; `rebuild: true` reconstruit la géométrie (appelle `rebuild()`) quand il change.

## Licence

MIT
