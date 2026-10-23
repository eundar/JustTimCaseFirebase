# Modifying the Sidebar UI

This guide explains how to update the app sidebar’s navigation, appearance, and
layout while preserving dark-mode support.

## Which files to edit

- [`src/components/layout/AppSidebar.tsx`](../src/components/layout/AppSidebar.tsx)
  defines the app-specific brand, menu links, and footer actions. Make most
  sidebar UI changes here.
- [`src/components/ui/sidebar.tsx`](../src/components/ui/sidebar.tsx) provides
  reusable sidebar components, responsive behavior, and collapse behavior.
  Edit it only when changing shared behavior or component defaults.
- [`src/index.css`](../src/index.css) defines the sidebar color tokens for both
  light and dark themes.
- [`src/router.tsx`](../src/router.tsx) defines the pages that menu links can
  navigate to.

`AppSidebar` is rendered within `SidebarProvider` in `src/App.tsx`, which
enables the responsive layout, collapsed state, and toggle behavior.

## Sidebar structure

`AppSidebar` has three sections:

1. **Header** — the “Burdeos Law Firm” brand.
2. **Content** — the “Main Menu” label and links generated from the
   `navigation` array.
3. **Footer** — the Profile link and Logout action.

## Add or change menu items

The `navigation` array near the top of `AppSidebar.tsx` supplies the main
menu’s title, Lucide icon, and destination path. Change `title` to rename an
item, or import another icon from `lucide-react` and replace its `icon`.

To add a link, add an item to the array:

```tsx
{
  title: "Reports",
  icon: FileText,
  path: "/app/reports",
}
```

The destination must also have a route in `src/router.tsx`; a sidebar link by
itself does not create a page. Add the page component and route if the
destination is new. The Profile and Logout controls are separate from the
navigation array. Keep Logout connected to `signOut()` from `useAuth()`.

## Style the sidebar

Adjust Tailwind classes on the relevant components in `AppSidebar.tsx`:

- `SidebarHeader` — brand area.
- `SidebarContent` — menu background and spacing.
- `SidebarGroupLabel` — section label.
- `SidebarMenuButton` — menu item size and spacing.
- `SidebarFooter` — Profile and Logout area.

For example, this is a theme-aware version of the header:

```tsx
<SidebarHeader className="h-16 border-b border-sidebar-border bg-sidebar px-6 py-5 text-sidebar-foreground">
```

The menu content and footer can use the same `bg-sidebar text-sidebar-foreground`
classes. Use ordinary Tailwind utilities such as `h-11`, `px-3`, `text-sm`,
`font-semibold`, and `tracking-tight` to adjust dimensions and typography
without overriding the theme colors.

## Color the sidebar so dark mode works

The theme provider applies either `.light` or `.dark` to the document root.
`src/index.css` assigns sidebar CSS variables for each theme, and Tailwind
exposes them as semantic utility classes. Prefer those utilities over fixed
colors:

| Intent | Use |
| --- | --- |
| Sidebar surface | `bg-sidebar` |
| Default sidebar text and icons | `text-sidebar-foreground` |
| Borders and separators | `border-sidebar-border` |
| Hover or selected menu surface | `bg-sidebar-accent` |
| Text on hover or selected surface | `text-sidebar-accent-foreground` |
| Primary/emphasized sidebar surface | `bg-sidebar-primary` |
| Text on the primary surface | `text-sidebar-primary-foreground` |

For example:

```tsx
<SidebarHeader className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
  ...
</SidebarHeader>

<SidebarContent className="bg-sidebar px-3 py-4 text-sidebar-foreground">
  ...
</SidebarContent>
```

`SidebarMenuButton` already includes theme-aware hover and active styles in
`src/components/ui/sidebar.tsx`. Keep those styles by not setting a fixed
background or text color on the button unless you also provide correct hover,
active, and focus colors.

Avoid hard-coded color classes such as `bg-[#1E293B]` and `text-[#F8FAFC]` on
the header, content, footer, or menu buttons. These colors remain the same in
both themes, so they mask the theme’s sidebar tokens. Also avoid setting
`dark:` overrides on each sidebar part when a semantic token already expresses
the intended role.

If the design needs custom sidebar colors, change the token values in both
theme blocks in `src/index.css`:

- `:root` defines the light theme’s `--sidebar`, `--sidebar-foreground`,
  `--sidebar-accent`, and related values.
- `.dark` defines the corresponding dark theme values.

Keep foreground and background tokens paired with enough contrast in both
blocks. Components using classes such as `bg-sidebar` and
`text-sidebar-foreground` will then automatically use the matching value when
the theme changes.

## Change layout or collapse behavior

`<Sidebar>` in `AppSidebar.tsx` supports these props, defined in
`src/components/ui/sidebar.tsx`:

- `side`: `"left"` or `"right"`; defaults to `"left"`.
- `variant`: `"sidebar"`, `"floating"`, or `"inset"`; defaults to `"sidebar"`.
- `collapsible`: `"offcanvas"`, `"icon"`, or `"none"`; defaults to
  `"offcanvas"`.

For example, `collapsible="icon"` keeps a narrow icon-only sidebar when
collapsed. `collapsible="none"` disables collapsing.

The shared component defines desktop, mobile, and icon-only widths with
`SIDEBAR_WIDTH`, `SIDEBAR_WIDTH_MOBILE`, and `SIDEBAR_WIDTH_ICON` near the top
of `src/components/ui/sidebar.tsx`. Changing these values affects every use of
that shared component. Mobile display uses a Sheet; the app’s toggle is
`SidebarTrigger` in `src/components/layout/AppHeader.tsx`.

The sidebar’s open state is persisted in a browser cookie, and the shared
component supports Ctrl+B / Command+B as a toggle shortcut. Change those
behaviors in `src/components/ui/sidebar.tsx` only when the behavior itself
needs to change.

## Check your changes

1. Confirm each menu path exists in `src/router.tsx`.
2. Preview both light and dark themes; verify surfaces, text, borders, hover,
   active, and focus states.
3. Preview desktop and mobile widths, expanded and collapsed.
4. Check text contrast and that icons remain understandable when collapsed.
5. Make sure Profile still navigates to settings and Logout still signs out.
