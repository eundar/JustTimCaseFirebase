import { lazy } from "react"
import { createBrowserRouter } from "react-router"

import App from "./App"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: lazy(() => import("./pages/LandingPage")),
  },
  {
    path: "/client-intake-form",
    Component: lazy(() => import("./pages/ClientIntakeForm")),
  },
  {
    path: "/login",
    Component: lazy(() => import("./pages/Login")),
  },
  {
    path: "/app",
    Component: App,
    children: [
      {
        index: true,
        Component: lazy(() => import("./pages/Dashboard")),
      },
      {
        path: "clients",
        Component: lazy(() => import("./pages/Clients")),
      },
      {
        path: "cases",
        Component: lazy(() => import("./pages/Cases")),
      },
      {
        path: "documents",
        Component: lazy(() => import("./pages/Documents")),
      },
      {
        path: "appointments",
        Component: lazy(() => import("./pages/Appointments")),
      },
      {
        path: "intakeforms",
        Component: lazy(() => import("./pages/IntakeForm")),
      },
      {
        path: "settings",
        Component: lazy(() => import("./pages/Settings")),
      },
    ],
  },
])
