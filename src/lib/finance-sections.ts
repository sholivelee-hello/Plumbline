import { Sparkles, Receipt, ShoppingBasket, Heart, PiggyBank, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FinanceSectionId =
  | "heaven"
  | "obligation"
  | "necessity"
  | "want"
  | "surplus"
  | "debt";

export interface FinanceSectionMeta {
  id: FinanceSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  // Tailwind utility snippets tuned for light + dark
  iconBg: string;
  iconColor: string;
  accentBar: string;
  tintBg: string;
}

export const FINANCE_SECTIONS: Record<FinanceSectionId, FinanceSectionMeta> = {
  heaven: {
    id: "heaven",
    label: "하늘은행",
    description: "심은 헌금과 후원",
    icon: Sparkles,
    iconBg: "bg-heaven-100 dark:bg-heaven-700/25",
    iconColor: "text-heaven-600 dark:text-heaven-300",
    accentBar: "bg-heaven-400",
    tintBg: "bg-heaven-50/60 dark:bg-heaven-700/10",
  },
  obligation: {
    id: "obligation",
    label: "의무지출",
    description: "월세, 공과금 등 고정비",
    icon: Receipt,
    iconBg: "bg-obligation-100 dark:bg-obligation-700/25",
    iconColor: "text-obligation-600 dark:text-obligation-300",
    accentBar: "bg-obligation-400",
    tintBg: "bg-obligation-50/60 dark:bg-obligation-700/10",
  },
  necessity: {
    id: "necessity",
    label: "생활비",
    description: "식비, 교통, 생활용품",
    icon: ShoppingBasket,
    iconBg: "bg-necessity-100 dark:bg-necessity-700/25",
    iconColor: "text-necessity-600 dark:text-necessity-300",
    accentBar: "bg-necessity-400",
    tintBg: "bg-necessity-50/60 dark:bg-necessity-700/10",
  },
  want: {
    id: "want",
    label: "요망사항",
    description: "갖고 싶은 것 위시리스트",
    icon: Heart,
    iconBg: "bg-want-100 dark:bg-want-700/25",
    iconColor: "text-want-600 dark:text-want-300",
    accentBar: "bg-want-400",
    tintBg: "bg-want-50/60 dark:bg-want-700/10",
  },
  surplus: {
    id: "surplus",
    label: "여윳돈",
    description: "이번 달 모은 저축",
    icon: PiggyBank,
    iconBg: "bg-surplus-100 dark:bg-surplus-700/25",
    iconColor: "text-surplus-600 dark:text-surplus-300",
    accentBar: "bg-surplus-400",
    tintBg: "bg-surplus-50/60 dark:bg-surplus-700/10",
  },
  debt: {
    id: "debt",
    label: "할부 · 빚",
    description: "진행 중인 상환",
    icon: CreditCard,
    iconBg: "bg-debt-100 dark:bg-debt-700/25",
    iconColor: "text-debt-600 dark:text-debt-300",
    accentBar: "bg-debt-400",
    tintBg: "bg-debt-50/60 dark:bg-debt-700/10",
  },
};
