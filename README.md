# ui-starter

Base de démarrage SaaS neutre (Next.js 16 App Router, Supabase, Stripe, i18n) —
fork strippé de son domaine métier, prêt à accueillir un nouveau produit. Voir
`docs/architecture.md` et `docs/design-system.md` pour le détail.

## Démarrage

```bash
npm install
cp .env.local.example .env.local   # renseigner Supabase + Stripe
npm run dev                        # http://localhost:8000
```

## Mode démo

`npm run dev:demo` et `npm run start:demo` lancent l'app **sans aucune
variable Supabase/Stripe** : identité, profil, abonnement et données du
dashboard viennent de fixtures en mémoire (`lib/demo/`). Un bandeau « mode
démo » persistant s'affiche sur chaque écran ; il permet de se connecter avec
n'importe quel e-mail, de basculer le rôle `user`↔`admin` et de simuler un
abonnement.

```bash
npm run dev:demo     # démo en développement
npm run start:demo   # démo en artefact de production (build sa PROPRE build)
```

L'état vit dans un **cookie de session par navigateur** (`demo_session`,
non signé, sans donnée réelle) : il survit à un redémarrage du serveur —
c'est ce qui permet au middleware et aux server actions de voir le même
état, alors qu'ils compilent dans deux graphes de modules séparés. Il n'est
donc pas « en mémoire, par process » comme une première version le décrivait.
Le bandeau démo expose un bouton **« Réinitialiser »** qui supprime le
cookie et restaure les fixtures de départ (`demo@example.com`, « Alex
Démo », rôle admin, abonnement actif) — c'est le contrôle explicite à
utiliser pour repartir de zéro, pas un redémarrage du serveur.

### Garde-fou : constante de build, pas un flag runtime

`DEMO_MODE` est une **constante posée à la compilation**, pas un interrupteur
lu en runtime (décision humaine du 28/08/2026, documentée dans
`docs/plans/s11-demo-mode.md`). `next.config.ts` déclare `DEMO_MODE` dans son
bloc `env` : le compilateur Next remplace alors littéralement chaque
occurrence de `process.env.DEMO_MODE` par sa valeur au moment du build.

Conséquence directe : **un `npm run build` normal (sans `DEMO_MODE=1`)
produit un artefact où `isDemoMode()` (`lib/demo/flag.ts`, seul module
autorisé à lire cette variable) vaut toujours `false`** — le code démo qu'il
protège devient inatteignable : poser `DEMO_MODE=1` au démarrage d'un
artefact construit sans le flag n'active rien.

Mesuré, pour être exact : les modules démo et leurs fixtures **restent
présents dans le bundle** (2 fichiers de `.next/server/chunks/` contiennent
encore les fixtures) — Turbopack ne les élimine pas à travers la frontière de
module. C'est du poids mort, pas une faille : le code est prouvablement
inatteignable. C'est pour ça que `start:demo` reconstruit sa propre build
(`DEMO_MODE=1 next build && next start`) : servir la démo depuis un
`npm run build` classique ne fonctionnerait pas, la variable n'y est jamais
posée.

> **Attention** — `start:demo` écrase le `.next` partagé avec un artefact de
> démo. Un `npm run start` lancé ensuite **sans rebuild** servirait donc la
> démo. Refaites un `npm run build` avant de servir la vraie app.

> **CI** — `npm run test` n'inclut pas `next.config.demo-flag.test.ts`, qui
> lance un vrai build et efface `.next` (il casserait un `npm run dev` en
> cours). Il tourne via `npm run test:build` : toute CI doit appeler **les
> deux**, sinon la régression T8 n'est plus gardée.

- `DEMO_MODE=1` (valeur exacte) active la démo — toute autre valeur (absente,
  malformée) la laisse éteinte.
- Toute erreur de résolution du flag retombe sur « démo éteinte » (fail-closed).

Hors mode démo, le comportement de l'app est strictement inchangé.
