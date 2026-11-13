import { BookOpenTextIcon, CoinsIcon, FileTextIcon, NotePencilIcon, ScalesIcon, SparkleIcon } from "@phosphor-icons/react";
import type { ModeChoice } from "@/lib/types";

const ICONS = {
  auto: SparkleIcon,
  money: CoinsIcon,
  legal: ScalesIcon,
  assignment: NotePencilIcon,
  syllabus: BookOpenTextIcon,
  other: FileTextIcon,
};

export function ModeIcon({ mode, size = 18 }: { mode: ModeChoice; size?: number }) {
  const Icon = ICONS[mode];
  return <Icon size={size} weight="duotone" />;
}
