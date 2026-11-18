export type DashboardSectionId =
  | "homes"
  | "layers"
  | "analytics"
  | "synthesis"
  | "studio";

export interface NavToolItem {
  id: DashboardSectionId;
  label: string;
  shortcut: string;
  description: string;
}

export type CardTone = "dark" | "mid" | "light";

export interface PreviewLayerItem {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  metric?: string;
  docId?: string;
  tone: CardTone;
  canvasTag: string;
}

export interface DeckLayerItem {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
  tone: CardTone;
  sectionTarget: DashboardSectionId;
}

export const NAV_ITEMS: NavToolItem[] = [
  {
    id: "homes",
    label: "Homes",
    shortcut: "1",
    description: "Workspace dashboard overview",
  },
  {
    id: "layers",
    label: "Layers",
    shortcut: "2",
    description: "Document layers & repository",
  },
  {
    id: "analytics",
    label: "Analytics",
    shortcut: "3",
    description: "DuckDB verified charts & metrics",
  },
  {
    id: "synthesis",
    label: "Synthesis",
    shortcut: "4",
    description: "Cross-document comparison & graph",
  },
  {
    id: "studio",
    label: "Studio",
    shortcut: "5",
    description: "Quiz & audio briefing studio",
  },
];

export const INITIAL_PREVIEW_ITEMS: PreviewLayerItem[] = [
  {
    id: "preview-1",
    code: "01",
    title: "Layer 01",
    subtitle: "Corpus index",
    metric: "Ready",
    tone: "dark",
    canvasTag: "Base Layer",
  },
  {
    id: "preview-2",
    code: "02",
    title: "Layer 02",
    subtitle: "Verified metrics",
    metric: "DuckDB",
    tone: "mid",
    canvasTag: "Midground",
  },
  {
    id: "preview-3",
    code: "03",
    title: "Layer 03",
    subtitle: "Active view",
    metric: "Homes",
    tone: "light",
    canvasTag: "Active Render",
  },
];

export const INITIAL_DECK_LAYERS: DeckLayerItem[] = [
  {
    id: "deck-1",
    code: "01",
    label: "Synthesis",
    shortLabel: "SYN",
    tone: "dark",
    sectionTarget: "synthesis",
  },
  {
    id: "deck-2",
    code: "02",
    label: "Analytics",
    shortLabel: "ANA",
    tone: "mid",
    sectionTarget: "analytics",
  },
  {
    id: "deck-3",
    code: "03",
    label: "Homes",
    shortLabel: "HOM",
    tone: "light",
    sectionTarget: "homes",
  },
];

export const PRESET_STEPS = [0, 1, 2, 3, 4] as const;
