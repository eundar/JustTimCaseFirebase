import { createBrowserRouter } from "react-router"

import App from "./App"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Clients from "./pages/Clients"
import Cases from "./pages/Cases"
import Documents from "./pages/Documents"
import Appointments from "./pages/Appointments"
import Settings from "./pages/Settings"

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
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
        path: "settings",
        Component: Settings,
      },
    ],
  },
])
