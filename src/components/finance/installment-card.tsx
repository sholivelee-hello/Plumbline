"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { Card } from "@/components/ui/card";
import { formatWon } from "@/lib/utils/format";
import { CreditCard, Check } from "lucide-react";

interface InstallmentCardProps {
  installment: {
    id: string;
    title: string;
    total_amount: number;
    monthly_payment: number;
    total_months: number;
    paid_months: number;
    remaining_months: number;
    remaining_amount: number;
    paid_amount: number;
    percent: number;
    start_date: string;
    is_completed: boolean;
  };
  onPayMonth: (id: string) => void;
}

export function InstallmentCard({ installment, onPayMonth }: InstallmentCardProps) {
  const {
    id,
    title,
    total_amount,
    monthly_payment,
    total_months,
    paid_months,
    remaining_months,
    percent,
    start_date,
    is_completed,
  } = installment;

  return (
    <Card className={is_completed ? "opacity-60" : ""}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-primary-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
        </div>
        {is_completed ? (
          <span className="text-xs font-medium text-surplus-600 dark:text-surplus-300 bg-surplus-50 dark:bg-surplus-700/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check size={12} /> 완납
          </span>
        ) : (
          <button
            onClick={() => onPayMonth(id)}
            className="text-xs font-medium text-primary-600 dark:text-primary-200 bg-primary-50 dark:bg-[#2a2e45] px-2.5 py-1 rounded-lg hover:bg-primary-100 dark:hover:bg-[#2a2e45]/80 transition-colors"
          >
            이번 달 납부
          </button>
        )}
      </div>

      <ProgressBar percent={percent} color="bg-primary-500" height="h-2" />

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400 dark:text-gray-500">총 금액</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">₩{formatWon(total_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 dark:text-gray-500">월 납입</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">₩{formatWon(monthly_payment)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 dark:text-gray-500">진행</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">{paid_months}/{total_months}회</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 dark:text-gray-500">남은 회차</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">{remaining_months}회</span>
        </div>
        <div className="col-span-2 flex justify-between pt-1 border-t border-gray-100 dark:border-[#262c38] mt-1">
          <span className="text-gray-400 dark:text-gray-500">시작월</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">{start_date}</span>
        </div>
      </div>
    </Card>
  );
}
