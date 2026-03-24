# SEED Agent Rules

## 1) Tooling: Bun only

- Use Bun for all installs and scripts.
- Never use npm, npx, pnpm, pnpx, yarn, or yarn dlx.
- Use `bunx --bun` for CLIs.

Allowed commands:

- `bun add <package>`
- `bun add -d <package>`
- `bun remove <package>`
- `bun run <script>`
- `bunx --bun <tool> ...`

## 2) UI: Shadcn only

- Use only Shadcn components.
- Do not add other UI libraries.
- If a needed component is not in the allowlist, ask first.

Allowlist:

- Accordion
- Alert
- Alert Dialog
- Aspect Ratio
- Avatar
- Badge
- Breadcrumb
- Button
- Button Group
- Calendar
- Card
- Carousel
- Chart
- Checkbox
- Collapsible
- Combobox
- Command
- Context Menu
- Data Table
- Date Picker
- Dialog
- Direction
- Drawer
- Dropdown Menu
- Empty
- Field
- Hover Card
- Input
- Input Group
- Input OTP
- Item
- Kbd
- Label
- Menubar
- Native Select
- Navigation Menu
- Pagination
- Popover
- Progress
- Radio Group
- Resizable
- Scroll Area
- Select
- Separator
- Sheet
- Sidebar
- Skeleton
- Slider
- Sonner
- Spinner
- Switch
- Table
- Tabs
- Textarea
- Toast
- Toggle
- Toggle Group
- Tooltip
- Typography

Install format:

- `bunx --bun shadcn@latest add <component>`
- Use kebab-case for multi-word names (example: `alert-dialog`).

## 3) Styling and tone

- Never use custom colors.
- Always follow default Shadcn CSS tokens and styling.
- Keep UI minimal and clean.
- No emojis in code, or UI text.

## 4) Enforcement

- Validate Bun command usage before suggesting installs.
- Validate component names against the allowlist.
- If outside policy, state it clearly and request approval.
