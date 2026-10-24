import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "firebase-auth",
              test: /node_modules[\\/](?:firebase[\\/]auth|@firebase[\\/](?:auth|auth-interop|util))[\\/]/,
              priority: 29,
            },
            {
              name: "firebase-firestore",
              test: /node_modules[\\/](?:firebase[\\/]firestore|@firebase[\\/](?:firestore|webchannel-wrapper))[\\/]/,
              priority: 28,
            },
            {
              name: "firebase-storage",
              test: /node_modules[\\/](?:firebase[\\/]storage|@firebase[\\/]storage)[\\/]/,
              priority: 27,
            },
            {
              name: "firebase-vendor",
              test: /node_modules[\\/](?:firebase|@firebase)[\\/]/,
              priority: 25,
            },
            {
              name: "ui-vendor",
              test: /node_modules[\\/](?:@base-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              priority: 20,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
