# Correctif de l’en-tête Apple — préparation du 27 octobre 2026

Le contenu JSON déjà publié et ses sept routes restent inchangés. L’adaptateur renvoie exactement ces octets avec `application/json; charset=utf-8`, HTTPS, aucun redirect, et prise en charge GET/HEAD. Il est limité au chemin exact et ne fait aucune requête au site, à l’application ou aux données des utilisateurs.

Le site actuel est publié sur GitHub Pages. Ajouter un fichier de configuration dans ce dépôt ne modifie pas les en-têtes de cette plateforme. Ce correctif est donc **préparé et testé, pas activé sur le domaine**. Il faut un hébergement/proxy contrôlable sur le chemin exact. L’exemple Cloudflare n’est pas une connexion existante ou une demande de migration : il nécessite une zone/route autorisée ; une route équivalente sur l’hébergement existant convient aussi. Aucun DNS, domaine, courrier OVH, déploiement ou migration n’est modifié par cette PR.

Validation locale : `node scripts/build-aasa-adapter.mjs --check` et `node --test scripts/test-aasa-adapter.mjs`. Les tests vérifient octets, types, routes, GET/HEAD, absence de redirection/cookies, clients arbitraires, refus des autres hôtes/chemins et méthodes. Ils ne prouvent pas une réponse publique après déploiement.

Après validation et accès à l’hébergement : monter uniquement la route, vérifier HTTP 200, MIME JSON, octets, absence de redirect, puis vérifier le CDN Apple et les liens sur iPhone. Le garde-fou public de CrossRun reste strict tant que la réponse réelle n’est pas corrigée.

Sources : https://developer.apple.com/documentation/xcode/supporting-associated-domains et https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links .
