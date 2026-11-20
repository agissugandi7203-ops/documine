export type DashboardSectionId =
  | "homes"
  | "chat"
  | "repository"
  | "layers"
  | "analytics"
  | "synthesis"
  | "studio";

export interface NavToolItem {
  id: DashboardSectionId;
  label: string;
  shortcut: string;
  description: string;
  group: "primary" | "secondary";
}

export type CardTone = "dark" | "mid" | "light";

export interface PreviewLayerItem {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  metric?: string;
  statValue?: string;
  statDetail?: string;
  shortcutLabel?: string;
  docId?: string;
  sectionTarget?: DashboardSectionId;
  tone: CardTone;
  canvasTag: string;
  imageSrc: string;
}

export interface DeckLayerItem {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
  metric?: string;
  detail?: string;
  tone: CardTone;
  sectionTarget: DashboardSectionId;
  imageSrc: string;
}

export const PRIMARY_NAV_ITEMS: NavToolItem[] = [
  {
    id: "homes",
    label: "Homes",
    shortcut: "1",
    description: "Dashboard overview",
    group: "primary",
  },
  {
    id: "chat",
    label: "Chat",
    shortcut: "2",
    description: "Grounded AI document chat",
    group: "primary",
  },
  {
    id: "repository",
    label: "Repository",
    shortcut: "3",
    description: "Upload & manage documents",
    group: "primary",
  },
];

export const SECONDARY_NAV_ITEMS: NavToolItem[] = [
  {
    id: "layers",
    label: "Graph",
    shortcut: "4",
    description: "Interactive file relationship canvas",
    group: "secondary",
  },
  {
    id: "analytics",
    label: "Analytics",
    shortcut: "5",
    description: "DuckDB SQL charts",
    group: "secondary",
  },
  {
    id: "synthesis",
    label: "Synthesis",
    shortcut: "6",
    description: "Compare documents",
    group: "secondary",
  },
  {
    id: "studio",
    label: "Studio",
    shortcut: "7",
    description: "Quiz & audio briefing",
    group: "secondary",
  },
];

export const NAV_ITEMS: NavToolItem[] = [
  ...PRIMARY_NAV_ITEMS,
  ...SECONDARY_NAV_ITEMS,
];

export const INITIAL_PREVIEW_ITEMS: PreviewLayerItem[] = [
  {
    id: "preview-1",
    code: "01",
    title: "Corpus Vault",
    subtitle: "Indexed documents",
    metric: "0 Docs",
    statValue: "0 Docs",
    statDetail: "Start your first document",
    shortcutLabel: "Open Repo",
    sectionTarget: "repository",
    tone: "dark",
    canvasTag: "Repository",
    imageSrc: "/assets/card-stage-1.jpg",
  },
  {
    id: "preview-2",
    code: "02",
    title: "SQL Analytics",
    subtitle: "DuckDB metrics",
    metric: "0 SQL",
    statValue: "0 Metrics",
    statDetail: "0 tables · 0 charts",
    shortcutLabel: "Open SQL",
    sectionTarget: "analytics",
    tone: "mid",
    canvasTag: "Analytics",
    imageSrc: "/assets/card-stage-2.jpg",
  },
  {
    id: "preview-3",
    code: "03",
    title: "AI Studio",
    subtitle: "Graph & Briefing",
    metric: "0 Links",
    statValue: "0 Links",
    statDetail: "Quiz, Audio & Graph",
    shortcutLabel: "Open Studio",
    sectionTarget: "studio",
    tone: "light",
    canvasTag: "Studio",
    imageSrc: "/assets/card-stage-3.jpg",
  },
];

export const INITIAL_DECK_LAYERS: DeckLayerItem[] = [
  {
    id: "deck-1",
    code: "01",
    label: "Synthesis",
    shortLabel: "SYN",
    metric: "0 Links",
    detail: "Compare",
    tone: "dark",
    sectionTarget: "synthesis",
    imageSrc: "/assets/card-layer-1.jpg",
  },
  {
    id: "deck-2",
    code: "02",
    label: "Analytics",
    shortLabel: "ANA",
    metric: "0 SQL",
    detail: "Charts",
    tone: "mid",
    sectionTarget: "analytics",
    imageSrc: "/assets/card-layer-2.jpg",
  },
  {
    id: "deck-3",
    code: "03",
    label: "Homes",
    shortLabel: "HOM",
    metric: "0 Docs",
    detail: "Overview",
    tone: "light",
    sectionTarget: "homes",
    imageSrc: "/assets/card-layer-3.jpg",
  },
];

export const PRESET_STEPS = [0, 1, 2, 3, 4] as const;
