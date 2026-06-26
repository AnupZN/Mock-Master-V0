export interface ThemeClasses {
  id: string;
  primaryBg: string;
  primaryHoverBg: string;
  primaryText: string;
  primaryHoverText: string;
  accentText: string;
  lightBg: string;
  lightBgHover: string;
  lightText: string;
  border: string;
  hoverBorder: string;
  focusRing: string;
  accentRing: string;
  shadowMd: string;
  shadowLg: string;
  accentBg: string;
  fromGradient: string;
  toGradient: string;
  fromGradientSolid: string;
  toGradientSolid: string;
  accentFill: string;
  borderActive: string;
}

export const themeStyles: Record<string, ThemeClasses> = {
  slate: {
    id: "slate",
    primaryBg: "bg-indigo-600 dark:bg-indigo-500",
    primaryHoverBg: "hover:bg-indigo-700 dark:hover:bg-indigo-600",
    primaryText: "text-indigo-600 dark:text-indigo-400",
    primaryHoverText: "hover:text-indigo-700 dark:hover:text-indigo-300",
    accentText: "text-indigo-700 dark:text-indigo-300",
    lightBg: "bg-indigo-50 dark:bg-indigo-950/20",
    lightBgHover: "hover:bg-indigo-100 dark:hover:bg-indigo-950/40",
    lightText: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-600 dark:border-indigo-500",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-800",
    focusRing: "focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20",
    accentRing: "ring-indigo-600 dark:ring-indigo-500",
    shadowMd: "shadow-indigo-600/15",
    shadowLg: "shadow-indigo-900/20",
    accentBg: "bg-indigo-100 dark:bg-indigo-950/40",
    fromGradient: "from-indigo-500/30",
    toGradient: "to-sky-500/30",
    fromGradientSolid: "from-indigo-500",
    toGradientSolid: "to-sky-500",
    accentFill: "text-indigo-600",
    borderActive: "border-indigo-600"
  },
  classic: {
    id: "classic",
    primaryBg: "bg-indigo-600 dark:bg-indigo-500",
    primaryHoverBg: "hover:bg-indigo-700 dark:hover:bg-indigo-600",
    primaryText: "text-indigo-600 dark:text-indigo-400",
    primaryHoverText: "hover:text-indigo-700 dark:hover:text-indigo-300",
    accentText: "text-indigo-700 dark:text-indigo-300",
    lightBg: "bg-indigo-50 dark:bg-indigo-950/20",
    lightBgHover: "hover:bg-indigo-100 dark:hover:bg-indigo-950/40",
    lightText: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-600 dark:border-indigo-500",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-800",
    focusRing: "focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20",
    accentRing: "ring-indigo-600 dark:ring-indigo-500",
    shadowMd: "shadow-indigo-600/15",
    shadowLg: "shadow-indigo-900/20",
    accentBg: "bg-indigo-100 dark:bg-indigo-950/40",
    fromGradient: "from-indigo-500/30",
    toGradient: "to-sky-500/30",
    fromGradientSolid: "from-indigo-500",
    toGradientSolid: "to-sky-500",
    accentFill: "text-indigo-600",
    borderActive: "border-indigo-600"
  },
  amber: {
    id: "amber",
    primaryBg: "bg-amber-500 dark:bg-amber-400",
    primaryHoverBg: "hover:bg-amber-600 dark:hover:bg-amber-500",
    primaryText: "text-amber-600 dark:text-amber-400",
    primaryHoverText: "hover:text-amber-700 dark:hover:text-amber-300",
    accentText: "text-amber-700 dark:text-amber-300",
    lightBg: "bg-amber-50 dark:bg-amber-950/20",
    lightBgHover: "hover:bg-amber-100 dark:hover:bg-amber-950/40",
    lightText: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500 dark:border-amber-400",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-800",
    focusRing: "focus:ring-amber-500/20 dark:focus:ring-amber-400/20",
    accentRing: "ring-amber-500 dark:ring-amber-400",
    shadowMd: "shadow-amber-500/15",
    shadowLg: "shadow-amber-900/20",
    accentBg: "bg-amber-100 dark:bg-amber-950/40",
    fromGradient: "from-amber-500/30",
    toGradient: "to-orange-500/30",
    fromGradientSolid: "from-amber-500",
    toGradientSolid: "to-orange-500",
    accentFill: "text-amber-500",
    borderActive: "border-amber-500"
  },
  emerald: {
    id: "emerald",
    primaryBg: "bg-emerald-600 dark:bg-emerald-500",
    primaryHoverBg: "hover:bg-emerald-700 dark:hover:bg-emerald-600",
    primaryText: "text-emerald-600 dark:text-emerald-400",
    primaryHoverText: "hover:text-emerald-700 dark:hover:text-emerald-300",
    accentText: "text-emerald-700 dark:text-emerald-300",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/20",
    lightBgHover: "hover:bg-emerald-100 dark:hover:bg-emerald-950/40",
    lightText: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-600 dark:border-emerald-500",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-800",
    focusRing: "focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20",
    accentRing: "ring-emerald-600 dark:ring-emerald-500",
    shadowMd: "shadow-emerald-600/15",
    shadowLg: "shadow-emerald-900/20",
    accentBg: "bg-emerald-100 dark:bg-emerald-950/40",
    fromGradient: "from-emerald-500/30",
    toGradient: "to-teal-500/30",
    fromGradientSolid: "from-emerald-500",
    toGradientSolid: "to-teal-500",
    accentFill: "text-emerald-600",
    borderActive: "border-emerald-600"
  },
  ocean: {
    id: "ocean",
    primaryBg: "bg-sky-600 dark:bg-sky-500",
    primaryHoverBg: "hover:bg-sky-700 dark:hover:bg-sky-600",
    primaryText: "text-sky-600 dark:text-sky-400",
    primaryHoverText: "hover:text-sky-700 dark:hover:text-sky-300",
    accentText: "text-sky-700 dark:text-sky-300",
    lightBg: "bg-sky-50 dark:bg-sky-950/20",
    lightBgHover: "hover:bg-sky-100 dark:hover:bg-sky-950/40",
    lightText: "text-sky-700 dark:text-sky-400",
    border: "border-sky-600 dark:border-sky-500",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-800",
    focusRing: "focus:ring-sky-500/20 dark:focus:ring-sky-400/20",
    accentRing: "ring-sky-600 dark:ring-sky-500",
    shadowMd: "shadow-sky-600/15",
    shadowLg: "shadow-sky-900/20",
    accentBg: "bg-sky-100 dark:bg-sky-950/40",
    fromGradient: "from-sky-500/30",
    toGradient: "to-indigo-500/30",
    fromGradientSolid: "from-sky-500",
    toGradientSolid: "to-indigo-500",
    accentFill: "text-sky-600",
    borderActive: "border-sky-600"
  },
  rose: {
    id: "rose",
    primaryBg: "bg-rose-600 dark:bg-rose-500",
    primaryHoverBg: "hover:bg-rose-700 dark:hover:bg-rose-600",
    primaryText: "text-rose-600 dark:text-rose-400",
    primaryHoverText: "hover:text-rose-700 dark:hover:text-rose-300",
    accentText: "text-rose-700 dark:text-rose-300",
    lightBg: "bg-rose-50 dark:bg-rose-950/20",
    lightBgHover: "hover:bg-rose-100 dark:hover:bg-rose-950/40",
    lightText: "text-rose-700 dark:text-rose-400",
    border: "border-rose-600 dark:border-rose-500",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-800",
    focusRing: "focus:ring-rose-500/20 dark:focus:ring-rose-400/20",
    accentRing: "ring-rose-600 dark:ring-rose-500",
    shadowMd: "shadow-rose-600/15",
    shadowLg: "shadow-rose-900/20",
    accentBg: "bg-rose-100 dark:bg-rose-950/40",
    fromGradient: "from-rose-500/30",
    toGradient: "to-pink-500/30",
    fromGradientSolid: "from-rose-500",
    toGradientSolid: "to-pink-500",
    accentFill: "text-rose-600",
    borderActive: "border-rose-600"
  }
};

export function getThemeStyles(themeId: string | undefined): ThemeClasses {
  return themeStyles[themeId || "slate"] || themeStyles.slate;
}
