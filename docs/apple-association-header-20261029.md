# Liens Apple — préparation du 29 octobre 2026

État : **correctif préparé, non déployé**. Le contrôle de publication mobile sur le type de contenu reste inchangé et reste en échec à l’origine. Aucun changement DNS, de site public, d’application, d’OTA ou de build n’a été exécuté pour ce correctif.

## Diagnostic réel

Le domaine public est servi par GitHub Pages, contrairement à l’ancienne indication Sites dans le README. Le fichier `/.well-known/apple-app-site-association` répond directement HTTP 200 avec `Content-Type: application/octet-stream`. Le JSON est le bon : 696 octets, appID `67WMYG23VK.fr.crossrun.app`, sept règles `components` attendues. Son SHA-256 est `b735dd6a696c57f4264e39952dde0dfc48454f9a28238c42e1d3dee0e665f803`.

Le CDN Apple `https://app-site-association.cdn-apple.com/a/v1/crossrunapp.fr` répond lui aussi HTTP 200, avec `Content-Type: application/json`, `Apple-Origin-Format: json`, la bonne origine et exactement les mêmes octets. Cela prouve la récupération serveur observée, pas l’ouverture dans l’application d’un iPhone déjà installé. L’anomalie MIME à l’origine est conservée comme réserve explicite.

Les DNS publics observés sont `dns111.ovh.net` et `ns111.ovh.net`. Aucune connexion de gestion OVH/Cloudflare n’est disponible dans cette session.

## Correctif ciblé préparé

Le Worker sert uniquement `https://crossrunapp.fr/.well-known/apple-app-site-association`, avec le MIME JSON et sans redirection. Son corps est généré à partir du fichier AASA existant ; aucune copie manuelle de la liste d’applications ou des routes n’est utilisée. Il refuse les autres hôtes, chemins et méthodes d’écriture. Il n’effectue aucune requête sortante, ne stocke aucune donnée utilisateur et ne touche pas aux pages du site.

La configuration est une **option de déploiement via une route Cloudflare**, pas une configuration à appliquer à l’aveugle sur OVH. Son activation nécessite une zone et un routage appropriés ainsi que l’accès au compte d’hébergement/DNS. Le domaine utilise actuellement les DNS OVH : cette PR ne migre pas ses serveurs DNS et n’active pas de proxy. Si un hébergement HTTP existant permet de corriger cet en-tête directement, la correction peut y être appliquée sans déployer ce Worker.

Depuis la racine du dépôt :

```sh
node --test scripts/test-apple-association-worker.mjs
npx --yes wrangler@4.102.0 deploy --dry-run --config wrangler.aasa.json --outdir /tmp/crossrun-aasa-proof
```

La commande `deploy --config wrangler.aasa.json` sans `--dry-run` est une opération de production distincte, à réaliser une fois l’hébergement et son accès établis. Il n’existe aucun workflow de déploiement automatique de ce Worker.

## Validation

- 15 tests Node : corps exact, MIME, sept routes, identité de l’app, absence de redirection, HEAD, méthodes, hôtes, génération depuis la source et portée de déploiement.
- Construction sèche Wrangler 4.102.0 réussie : module autonome de 3,16 Kio, sans binding, aucun téléversement effectif.
- Les 19 tests du contrat de publication mobile existant ont été exécutés sans modifier ce contrat. L’origine réelle continue d’être refusée par ce contrat ; le CDN Apple réel le respecte.
- La recette physique iPhone reste à effectuer sur le build 62 reçu par OTA : ouverture depuis Notes d’un lien CrossRun existant, retour d’authentification et navigation ; pas depuis la barre d’adresse Safari. Ne pas désinstaller l’application pour ce test, afin de conserver les données locales.

Références : [diagnostic Apple TN3155](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links), [domaines associés Apple](https://developer.apple.com/documentation/xcode/supporting-associated-domains), [configuration Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/), [routage Cloudflare](https://developers.cloudflare.com/workers/configuration/routing/routes/).
