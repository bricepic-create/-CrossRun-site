# Site CrossRun — crossrunapp.fr

Cette version du site est pensée comme la vitrine marketing officielle de CrossRun. Elle reprend la palette claire actuelle de l’application (#EAF1F8 / #3F73D8), met en avant « Application 100 % gratuite » et concentre le parcours sur le téléchargement.

## Structure

- `index.html` : page d’accueil marketing premium
- `decouvrir/index.html` : présentation détaillée des fonctionnalités
- `coach-badges/index.html` : coach personnel, objectifs et badges
- `styles.css` : design responsive CrossRun
- `script.js` : animations et configuration des liens stores
- `confidentialite/index.html` : politique de confidentialité
- `assistance/index.html` : assistance
- `regles/index.html` : règles de la communauté
- `safety/index.html` : partage de sécurité temporaire

## Liens App Store / Google Play

Les boutons sont volontairement désactivés tant que les applications publiques ne sont pas disponibles.

Quand les liens seront connus, modifier uniquement `STORE_LINKS` en haut de `script.js` :

```js
const STORE_LINKS = {
  apple: 'https://apps.apple.com/...',
  google: 'https://play.google.com/store/apps/details?id=...',
};
```

Les boutons s’activent automatiquement dès qu’une URL est renseignée.

## Déploiement

Le domaine `crossrunapp.fr` pointe actuellement vers la version ChatGPT Sites historique. Cette branche prépare la version de remplacement sans modifier le domaine ni le site de production tant que la nouvelle version n’a pas été validée.

## Avant App Review publique

Publier et vérifier réellement les routes `/confidentialite/`, `/assistance/` et `/regles/` sur `crossrunapp.fr`. La présence des fichiers dans ce dossier ne prouve pas que le site ChatGPT Sites historique les sert déjà.
