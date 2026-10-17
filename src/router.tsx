import { createBrowserRouter } from "react-router"

import App from "./App"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Clients from "./pages/Clients"
import Cases from "./pages/Cases"
import Documents from "./pages/Documents"
import Appointments from "./pages/Appointments"
import Settings from "./pages/Settings"
import ClientIntakeForm from "./pages/ClientIntakeForm"
import IntakeForms from "./pages/IntakeForm"
import LandingPage from "./pages/LandingPage"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/client-intake-form",
    Component: ClientIntakeForm,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/app",
    Component: App,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "clients",
        Component: Clients,
      },
      {
        path: "cases",
        Component: Cases,
      },
      {
        path: "documents",
        Component: Documents,
      },
      {
        path: "appointments",
        Component: Appointments,
      },
      {
        path: "intakeforms",
        Component: IntakeForms,
      },
      {
        path: "settings",
        Component: Settings,
      },
    ],
  },
])
