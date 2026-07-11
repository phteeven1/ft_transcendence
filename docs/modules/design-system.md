# Web Minor — Custom design system

**Points:** 1 · **Category:** Web

## Summary

Dicteé uses a **Claymorphism** design system: soft 3D surfaces, teal/amber palette, playful typography for kids, and **14 reusable React components** in `apps/frontend/app/components/ui/`.

Foundations live in `design-tokens.json`, `globals.css`, and `design-system/dicteé/MASTER.md`.

## Demo steps

1. Open **Dashboard** — show `Tile`, `PageShell`, typography
2. Open **Manage Group** — show `Panel`, `Tabs`, `ListButton`, `Chip`, `Dropdown` (language menu in top bar)
3. Show **`components/ui/index.ts`** — exported component library
4. Show **`design-tokens.json`** + **`globals.css`** — palette and spacing tokens
5. Show **`Icon`** component — consistent SVG icons (not emoji)

## Color palette

| Token | Role | Value |
|-------|------|-------|
| `primary` | Brand teal | `#0D9488` |
| `accent` | CTA amber | `#D97706` |
| `background` | Page bg | `#F0FDFA` |
| `foreground` | Text | `#134E4A` |
| `muted` | Subtle surfaces | `#E8F1F4` |
| `destructive` | Errors / admin alerts | `#DC2626` |

Source: `apps/frontend/app/design-tokens.json`, CSS variables in `globals.css`.

## Typography

| Role | Font | Usage |
|------|------|-------|
| Headings | **Baloo 2** | Titles, buttons, chips (`font-heading`) |
| Body | **Comic Neue** | Paragraphs, inputs, chat |

Loaded via `next/font/google` in `app/layout.tsx`.

## Icons

- **`Icon`** component — stroke SVG set (`chevron-down`, `user`, `users`, `book`, `game`, `check`, `close`)
- **Flag SVGs** — `/public/flags/*.svg` for language picker
- Design rule: no emoji as UI icons (see `MASTER.md`)

## Reusable components (14)

| # | Component | Purpose |
|---|-----------|---------|
| 1 | `Button` | Primary actions, 5 variants, 3 sizes |
| 2 | `Input` | Form fields with label/error |
| 3 | `Card` | Content containers (default / interactive / feature) |
| 4 | `Modal` | Centered overlay dialog |
| 5 | `Dialog` | Accessible dialog with title |
| 6 | `PageShell` | Page layout + gradient background |
| 7 | `Panel` | Bordered clay surface (lists, chat) |
| 8 | `Tabs` / `Tab` | Tab bar navigation |
| 9 | `Dropdown` / `DropdownItem` | Menus (e.g. language picker) |
| 10 | `ListButton` | Selectable list rows |
| 11 | `Chip` | Filter toggles |
| 12 | `ActionButton` | Full-width manage-screen actions |
| 13 | `Tile` | Dashboard / lobby tiles |
| 14 | `Icon` | Shared SVG icons |

Import from `@/app/components/ui` or `../components/ui`.

## Key files

| Layer | Path |
|-------|------|
| Component library | `apps/frontend/app/components/ui/` |
| Design tokens | `apps/frontend/app/design-tokens.json` |
| Global styles | `apps/frontend/app/globals.css` |
| Icons | `apps/frontend/app/components/ui/ui-icon.tsx` |
| Master spec | `design-system/dicteé/MASTER.md` |
| Fonts | `apps/frontend/app/layout.tsx` |

## Usage example

```tsx
import { PageShell, Panel, Tab, Tabs, Button, Icon } from '@/app/components/ui';

<PageShell>
  <Panel>
    <Tabs>
      <Tab active>Profile</Tab>
      <Tab>Chat</Tab>
    </Tabs>
    <Button variant="primary">
      <Icon name="users" size={18} />
      Manage group
    </Button>
  </Panel>
</PageShell>
```

## Eval talking points

- “We built a **custom Claymorphism system**, not a generic CSS framework skin.”
- “**14 reusable components** share tokens for color, radius, and shadow.”
- “**Baloo 2 + Comic Neue** target a kid-friendly learning app.”
- “**Icon** gives consistent SVG icons; flags are separate assets for i18n.”
