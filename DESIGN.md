# Charte graphique et règles de travail — Ultimate Dashboard

À lire **avant toute modification** du dashboard (`index.html`).
Tout nouvel élément doit ressembler à ce qui existe déjà : on réutilise les mêmes
composants, couleurs et tailles. Si quelque chose manque ici, on copie le composant
le plus proche dans l'app plutôt que d'inventer.

---

## 1. Règles de travail (non négociables)

1. **Ne jamais changer ce qui existe de sa propre initiative** : icônes, mise en page,
   libellés, comportement restent identiques sauf demande explicite. Vaut pour les
   maquettes et pour le code.
2. **Éléments de maquette validés** = repris tels quels dans le code.
3. **Gros changement visuel → maquettes d'abord** (2-3 propositions), on code après validation.
   Petit ajout fonctionnel qui suit cette charte → on peut coder directement.
4. **Jamais de contrôle natif du navigateur** pour ce que l'app sait déjà faire :
   pas de `<input type="date">`, `type="time"`, `alert()`, `confirm()`, `prompt()` visibles.
   On utilise le calendrier, la roue des heures, les menus et les confirmations de l'app.
5. **Pas d'emojis dans l'interface** : uniquement des icônes SVG plates (trait).
6. **Ordi et téléphone** : vérifier les deux. Sur téléphone, rien ne doit glisser sur le
   côté, pas de zoom, filtres visibles sans défilement horizontal.
7. « Mon planning » = ce dashboard, jamais Rappels/Calendrier Apple.
8. Langue de l'interface : **français** (exceptions conservées : onglets « Overdue », « Today »,
   et « Today » sur téléphone pour la date du jour).

---

## 2. Couleurs (thème clair, `#v2` / `#v2m`)

| Rôle | Valeur |
|---|---|
| Fond de l'app | `#F3F1EC` (`--v-bg`) |
| Cartes, fenêtres, menus | `#FFFFFF` (`--v-card`) |
| Texte principal | `#1F1F1F` (`--v-ink`) |
| Texte secondaire | `#6B6B6B` (`--v-muted`) |
| Texte discret, icônes au repos | `#8B8B8B` (`--v-faint`), `#9A9890`, `#A9A7A0` |
| Traits / séparateurs | `#EFEEEA` (`--v-line`) |
| Fonds doux (survol, boutons gris) | `#F3F2EE`, `#F5F5F3` (`--v-soft`), `#F1F1EF` (`--v-soft2`) |
| Puces / chips | `#ECEAE4` (`--v-chip`) |
| Case à cocher non cochée | `#E6E5E0` (`--v-check`) |
| Sélection / action principale | **noir `#1F1F1F`** avec texte blanc |
| Accent bleu (mode actif, sélection) | `#2F62C9`, fond `#EEF3FE`, bord `#CFDCF8` |
| Rouge (retard, supprimer) | `#C8342B` (`--v-red`), fond `#FBECEC` |
| Vert (aujourd'hui, terminé) | `#2F9E5B` (`--v-green`) |
| Orange (aujourd'hui dans le calendrier) | `#E8590C` |

Couleurs de projet / catégorie : générées par `colors()` à partir de la couleur du projet
(fond très clair + texte foncé de la même teinte). Palette des catégories :
`#2F62C9 #B4541A #B23A6E #6A44B8 #237A45 #946200 #4A4A4A #1F7A8C #C8342B #3E72A6`.

---

## 3. Typographie

- Police : **Inter** partout (`font-family: 'Inter', sans-serif`).
- Titres de page : 26-28 px, 700.
- Titre de tâche dans la fenêtre : grand (≈ 30 px), 700.
- Texte courant des listes : 14 px. Méta / dates : 12,5-13,5 px.
- Petits titres de section (SOUS-TÂCHES, AFFICHAGE…) : 11-13 px, 700, MAJUSCULES, `letter-spacing: .06-.08em`, gris.
- Aperçu centré (fenêtre tâche) : tout un cran plus gros (sous-tâches 16,5 px).

---

## 4. Formes et espacements

- Rayons : boutons / chips **9-11 px**, cartes & menus **12-16 px**, grandes fenêtres **20-22 px**.
- Ombres : menus `0 12px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.05)` ;
  fenêtres `0 20px 50px rgba(0,0,0,.08)` à `.25`.
- Hauteur des boutons d'outils : 34 px. Icônes : 14-21 px, trait 1,7-2.

---

## 5. Composants à réutiliser

| Besoin | Composant existant |
|---|---|
| Menu déroulant (statut, groupe, catégorie, lot…) | `floatMenu()` / classe `.v-stmenu` — fond blanc, rayon 12, lignes 8 px, survol `#F3F2EE`, coche à droite |
| Onglets / segments | `.v-seg` (fond `#F1F1EF`, onglet actif blanc) |
| Bouton d'outil de la barre | `.v-tool` (blanc, bord `--v-line`, `.on` = bleu clair) |
| Pastille de statut | `.v-pill.st-todo / .st-wip / .st-done` |
| Puce de catégorie | `.v-tcat` (couleur de la catégorie, sans flèche) |
| Priorité | drapeau SVG + couleur (`FLAG_SVG`, `PRIO_COL`) |
| Case à cocher tâche | `.v-chk` : carré gris `#E6E5E0` **sans bordure**, vert quand cochée |
| Choix d'une date | calendrier de l'app : `.cal-head` (flèches fines `cal-nav`), `.cal-grid`, `.cal-cell` — jour choisi = **carré arrondi noir**, aujourd'hui = **orange**, jours passés gris, point sous les jours qui ont des tâches |
| Raccourcis de date | 4 icônes grises `.dp-quick` : aujourd'hui (soleil), demain (lever de soleil), +7 jours, dans un mois (flèche) |
| Heure / Rappel / Répéter | pastilles `.dp-chip` (grises, noires quand réglées) + roue des heures `.time-wheel` |
| Fenêtre / modale | style `.v-tcm` (blanc, rayon 20, fond assombri `rgba(24,24,22,.35)`) |
| Confirmation | petit menu « Supprimer ? » dans un `floatMenu` (jamais `confirm()`) |
| Message court / annuler | toast noir `.v-undo` en bas au centre, avec bouton « Annuler » |
| Barre d'actions en lot | `.v-bulk` (barre noire flottante en bas) |

---

## 6. Icônes

- SVG plats, trait `currentColor`, `stroke-width` 1,7-2, bouts arrondis.
- Gris au repos (`#8B8A85` / `#9A9890`), noirs au survol ou actifs.
- Réutiliser les icônes déjà présentes (`I.*`, `SUN/RISE/WEEK/NEXT`, `FLAG_SVG`, `CLOCK`, `BELL`, `REP`).

---

## 7. Dates

- Ordi : Avant‑hier, Hier, Aujourd'hui, Demain, Après‑demain, puis « 11 nov. ».
- Téléphone : seul aujourd'hui devient « Today », les autres jours gardent la date.
- Couleurs : retard rouge, aujourd'hui vert.
- Liste : onglet **Tout** par défaut (aujourd'hui, puis retard, puis la suite par date) ;
  ordre des onglets : Tout, Overdue, Today, Demain (Semaine sur ordi).

---

## 8. Cohérence — ce qui doit se ressembler partout

Règle : un même rôle = un même composant, et par défaut **gris** (pas de bleu, pas de couleur
qui « flashe »). La couleur sert seulement à repérer (icône, petite pastille), jamais de fond vif.

- **Tous les choix d'un groupe** (À acheter / Tous les produits, Courses / Recettes / Next,
  Tout / Alimentation / Divers / Shopping…) utilisent `.v-seg` : même piste grise, même onglet
  actif blanc. Pas de puces noires d'un côté et d'onglets de l'autre.
- **Filtres** : un seul bouton « Filtres » (icône + pastille du nombre actif) qui ouvre une feuille
  en bas sur téléphone, une petite fenêtre sur ordi. Sélection = **noir `#1F1F1F`** (couleur par
  défaut de l'app), puces non choisies en gris `#F1F1EF` ; pastille du nombre en noir ; bouton
  « Voir N … » noir. Jamais de bleu, pas de couleurs en plus.
- **Pas de `<select>` natif** (flèche collée au bord, style du navigateur) : `floatMenu()` ou feuille.
- **Fonds gris des boutons et tuiles** : le même gris que la piste des onglets (`#F1F1EF` sur
  fond blanc, `--v-seg` `#E9E7E1` sur fond `--v-bg`). Vaut pour Aujourd'hui / En retard /
  Favoris / Nouvelle tâche, « Nouvelle idée », « Nouvelle recette », etc.
- **Pas de bordure, jamais** : ni autour d'un élément sélectionné (puce, filtre, galerie / liste,
  recherche…), ni pour décorer. L'état actif = fond noir `#1F1F1F` texte blanc (puces, filtres)
  ou fond gris un peu plus foncé / blanc (onglets), sans contour.
- **Champ de recherche** : fond gris de l'app, sans bordure, loupe grise.
- **Ajouter** : le + va à droite de la barre de recherche, pas en bouton flottant.
- **Icône grille** : « G3 » — 4 petits carrés pleins espacés, deux tons (haut-gauche et bas-droite
  pleins, les deux autres à 35 %), même icône partout dans l'app.
- **Harmoniser, toujours** : un même rôle a exactement le même rendu partout (Tâches, Cuisine,
  Bibliothèque, ordi et téléphone). Gris neutres uniquement — plus de beige / sable
  (`--v-chip` = `#EBEBE8`, `--v-soft2` = `#F1F1EF`). Onglets actifs, boutons (Nouvelle tâche,
  Filtres avancés, Retards inclus, outils `.v-tool`) : même gris, sans bordure.
- **Bouton d'ajout principal** (+ Recette, Ajouter dans la Bibliothèque) : **noir**, placé juste
  après les onglets, avant la recherche ou les filtres.
- **Galerie / liste** : un seul sélecteur partout, `.v-seg.cz-viewsw` (icône grille G3 + icône liste),
  collé aux filtres / au tri.


## 9. Mode sombre (palette Noir)

- Suit automatiquement le réglage de l'appareil (`prefers-color-scheme`), via `data-theme="dark"` sur `<html>`.
- Palette : fond `#000`, cartes `#1C1C1E`, surfaces `#242426` / `#2C2C2E`, cases `#3A3A3C`, texte `#F2F2F3`, secondaire `#A1A1A6`.
  Couleurs vives éclaircies : rouge `#FF6B5E`, vert `#4CC27A`, orange `#F2A33A`. Le noir de sélection devient blanc (texte foncé).
- Les règles sombres sont **générées** depuis le CSS clair : après toute modification du CSS, lancer `python3 tools/dark-apply.py`
  (régénère le bloc « MODE SOMBRE » en fin de `<style>`). Ne pas modifier ce bloc à la main ; les réglages manuels vont dans `tools/dark-apply.py`.
- Couleurs de catégorie/projet : passer par `--c-bg` / `--c-fg` (jamais `style="background:…"` en dur), pour que le mode sombre puisse les adapter.
