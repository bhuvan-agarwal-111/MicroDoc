# MicroDoc 🩺

A premium, highly interactive health and symptom tracking application designed with sleek, tactile user experiences, a custom warm bone/cream aesthetic, and robust offline capability.

## Features

- **Tactile Symptom Logger:** Features a morphing full-screen transition and dynamic gravity-based intensity slider.
- **Custom Cream Theme:** Optimized warm bones and parchment look (`#F2EFE9` & `#F6F5EF`) that feels premium and easy on the eyes.
- **Progressive Web App (PWA):** Fully installable on iOS, Android, and Desktop with offline assets support.
- **Automatic Deployment:** Powered by GitHub Actions to deploy to Firebase Hosting on every commit.

## Tech Stack

- **Framework:** React + TypeScript + Ionic
- **Bundler:** Vite
- **PWA:** `vite-plugin-pwa`
- **Hosting:** Google Firebase

---

## Local Development

To run the application locally:

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   ```
3. **Build the production bundle:**
   ```bash
   npm run build
   ```

---

## Deployment & CI/CD

Automatic deployment is configured via **GitHub Actions**. Whenever you push changes to the `main` branch, the workflow will:
1. Checkout the code.
2. Install dependencies (`npm ci`).
3. Compile the production PWA bundle (`npm run build`).
4. Automatically deploy the assets to your Live Firebase Hosting site.
