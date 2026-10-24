import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import "./index.css"
import { router } from "./router.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/context/AuthContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="p-6 text-sm text-muted-foreground" role="status">
                Loading page...
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)
