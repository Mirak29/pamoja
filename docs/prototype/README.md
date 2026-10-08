# Prototype Pamoja v2

Prototype interactif complet produit avec Claude Design à partir de `docs/brief-prototype-claude-design.md`. C'est la **référence des écrans et des parcours** ; le cahier des charges reste la référence des règles et des décisions.

## L'ouvrir

Depuis ce dossier :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/pamoja-v2.dc.html`. Le panneau « Démo » en bas à gauche change d'utilisateur, déclenche les événements GitHub et remet les données à zéro.

## Ce qu'on ne reprend pas dans le code

- **Les adresses avec `#`** (`#/@moussa`) : le code utilise de vrais chemins (`/@moussa`), sinon le serveur ne peut pas servir l'aperçu de partage (§12.2, §17.1).
- **La double adresse du profil** (`/p/moussa` et `/@moussa`) : une seule adresse, `/@moussa`, publique sans connexion, complète une fois connecté (§9).
- **Les styles en ligne** : le système isométrique devient des utilitaires CSS réutilisables (§12.7).
- **Les accords au pluriel** (« 1 aides », « 1 mentorats ») et la Collaboration Map qui compte le pays du profil parmi les pays reliés.

## Ce qui manque et que le code doit ajouter

- Les états de chargement et d'erreur sur toutes les pages (le prototype n'a presque que des états vides).
- La navigation complète au clavier (le prototype ne gère que ⌘K / Ctrl+K et Échap).
- Les dialogues testés sur mobile.
- À vérifier pendant les répétitions : le toast « Badge en progression » et la boucle de démo chronométrée en vue côte à côte.
