import {
  BookOpen,
  Briefcase,
  Calendar,
  Code,
  Dumbbell,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Music,
  Plane,
  Shield,
  Star,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";

export const PROJECT_ICON_MAP: Record<string, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  home: Home,
  user: User,
  heart: Heart,
  star: Star,
  code: Code,
  shield: Shield,
  globe: Globe,
  calendar: Calendar,
  music: Music,
  dumbbell: Dumbbell,
  plane: Plane,
  wallet: Wallet,
};

export const PROJECT_ICON_AR_LABEL: Record<string, string> = {
  folder: "مجلد",
  briefcase: "عمل",
  "book-open": "كتاب",
  "graduation-cap": "جامعة",
  home: "منزل",
  user: "شخصي",
  heart: "قلب",
  star: "نجمة",
  code: "برمجة",
  shield: "حماية",
  globe: "سفر وعالم",
  calendar: "تقويم",
  music: "موسيقى",
  dumbbell: "رياضة",
  plane: "سفر",
  wallet: "مالية",
};

const PROJECT_ICON_EN_LABEL: Record<string, string> = {
  folder: "Folder",
  briefcase: "Work",
  "book-open": "Book",
  "graduation-cap": "University",
  home: "Home",
  user: "Personal",
  heart: "Heart",
  star: "Star",
  code: "Code",
  shield: "Shield",
  globe: "Globe",
  calendar: "Calendar",
  music: "Music",
  dumbbell: "Workout",
  plane: "Travel",
  wallet: "Finance",
};

export function projectIconLabel(icon: string, locale: Locale): string {
  const map = locale === "en" ? PROJECT_ICON_EN_LABEL : PROJECT_ICON_AR_LABEL;
  return map[icon] ?? icon;
}

export function ProjectIcon({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  const Icon = PROJECT_ICON_MAP[icon] ?? Folder;
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
      style={{ backgroundColor: color }}
    >
      <Icon size={size} aria-hidden />
    </span>
  );
}
