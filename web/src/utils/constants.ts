import { Utensils, Car, Bed, ShoppingBag, Coffee, MoreHorizontal, LucideIcon } from 'lucide-react';

export interface BillCategory {
  id: number;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const BILL_CATEGORIES: Record<number, BillCategory> = {
  1: { id: 1, label: '餐饮', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  2: { id: 2, label: '交通', icon: Car, color: 'bg-blue-100 text-blue-600' },
  3: { id: 3, label: '住宿', icon: Bed, color: 'bg-purple-100 text-purple-600' },
  4: { id: 4, label: '购物', icon: ShoppingBag, color: 'bg-pink-100 text-pink-600' },
  5: { id: 5, label: '娱乐', icon: Coffee, color: 'bg-yellow-100 text-yellow-600' },
  0: { id: 0, label: '其他', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
};

export const getCategoryById = (id: number): BillCategory => {
  return BILL_CATEGORIES[id] || BILL_CATEGORIES[0];
};
