# Quiz Maths 5ème — Application d'auto-évaluation

Application web complète d'auto-évaluation en Mathématiques pour la classe de 5ème (programme Côte d'Ivoire).
Basée sur les fiches de cours de **ADRIEN KONAN**.

---

## 📚 Leçons disponibles (10 leçons — 300 questions)

| # | Leçon | Questions |
|---|-------|-----------|
| 1 | Puissance entière d'un nombre entier naturel | 30 |
| 2 | Nombres premiers | 30 |
| 3 | Figures symétriques par rapport à une droite | 30 |
| 4 | Angles | 30 |
| 5 | Nombres décimaux relatifs | 30 |
| 6 | Segments — Caractérisation & Médiatrice | 30 |
| 7 | Fractions | 30 |
| 8 | Triangles | 30 |
| 9 | Cercles et disques | 30 |
| 10 | Parallélogrammes particuliers, Proportionnalité & Statistiques | 30 |

---

## ✨ Fonctionnalités

- **Quiz interactif** : 20 questions tirées aléatoirement parmi 30 par leçon
- **Chronomètre** : 30 secondes par question (barre verte → orange → rouge)
- **Feedback immédiat** : explication de la bonne réponse après chaque question
- **Résumé de révision** : parties du cours à retravailler identifiées
- **Tableau de bord élève** : historique, scores, statistiques
- **Système d'abonnement** : plan Gratuit (3 leçons) et Premium (toutes leçons)
- **Paiement** : Wave et Orange Money (simulation)
- **Parrainage** : code unique, +7 jours Premium pour le parrain et le filleul
- **Panel admin** : gestion des élèves, performances, abonnements, parrainages
- **Responsive** : mobile, tablette et desktop

---

## 🚀 Installation locale

```bash
# 1. Cloner le projet
git clone <votre-repo> quiz-maths-5eme
cd quiz-maths-5eme

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Lancer
npm start
# → http://localhost:3000
```

---

## 🔑 Comptes par défaut

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| 👨‍🏫 Professeur (admin) | `prof` | `password` |
| 👨‍🎓 Élève | `eleve1` | `password` |

---

## ☁️ Guide de déploiement complet

### A — MongoDB Atlas (gratuit)

1. Aller sur **https://cloud.mongodb.com** → Créer un compte
2. **Build a Database** → Free (M0) → Frankfurt (EU Central)
3. **Create user** : créer un utilisateur (username + mot de passe **sans** `@`, `#`, `!`, `$`)
4. **Network Access** → Add IP Address → Allow from Anywhere → `0.0.0.0/0`
5. **Connect** → Drivers → Node.js → Copier l'URI de connexion
6. Compléter l'URI avec votre base :
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/quiz-maths-5eme
   ```

> ⚠️ Si le mot de passe contient `@` → encoder en `%40`
> ⚠️ Si le mot de passe contient `#` → encoder en `%23`

---

### B — GitHub

1. Aller sur **https://github.com** → New repository
2. Nom : `quiz-maths-5eme` → **Create repository**
3. Cliquer **"uploading an existing file"**
4. Glisser **tous les fichiers** du ZIP (sauf `node_modules/` et `.env`)
5. **Commit changes**

---

### C — Render.com (hébergement gratuit)

1. Aller sur **https://render.com** → Get Started → Continue with GitHub
2. **New +** → Web Service → Sélectionner votre dépôt GitHub
3. Configurer :

| Paramètre | Valeur |
|-----------|--------|
| Name | `quiz-maths-5eme` |
| Region | Frankfurt (EU Central) |
| Branch | `main` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

4. **Environment Variables** (onglet Environment) :

| Clé | Valeur |
|-----|--------|
| `MONGO_URI` | Votre URI Atlas complète |
| `JWT_SECRET` | Une phrase longue aléatoire (ex: `MonQuiz2024xK9mP3qR7zW`) |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://votre-app.onrender.com` |
| `WAVE_NUMBER` | Votre numéro Wave |
| `ORANGE_NUMBER` | Votre numéro Orange Money |
| `PREMIUM_PRICE_MONTHLY` | `500` |
| `PREMIUM_PRICE_ANNUAL` | `4200` |

5. Cliquer **Create Web Service** → Attendre 2-3 minutes

---

## 🔧 Résolution des problèmes courants

| Erreur | Solution |
|--------|----------|
| `IP not whitelisted` | Atlas → Network Access → Add `0.0.0.0/0` |
| `bad auth` | Vérifier le mot de passe dans l'URI (encoder `@` en `%40`) |
| Page blanche | Plan gratuit Render = cold start de 50s, recharger |
| `Exit code 1` | Vérifier `MONGO_URI` et `JWT_SECRET` dans Render |
| Scores perdus | Vérifier que `MONGO_URI` est bien défini |

---

## 🔄 Mise à jour

Après une modification, pousser sur GitHub → Render redéploie automatiquement :

```bash
git add .
git commit -m "Mise à jour"
git push
```

---

## 🏗️ Structure du projet

```
quiz-maths-5eme/
├── server.js          ← API Express + Auth JWT
├── models.js          ← Schémas Mongoose (User, Score, Subscription, Referral)
├── seed.js            ← Comptes par défaut
├── questions.js       ← Banque de questions (backend)
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js        ← SPA complète
        └── questions.js  ← Banque de questions (frontend)
```
