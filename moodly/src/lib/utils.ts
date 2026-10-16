import { clsx, type ClassValue } from 'clsx';
export const cn = (...values: ClassValue[]) => clsx(values);
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
export const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const statusLabel: Record<string, string> = { PENDING_PAYMENT: 'Pending payment', PAID: 'Paid', PRINTING: 'In printing', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };
export const statusTransitions: Record<string, string[]> = { PENDING_PAYMENT: ['PAID', 'CANCELLED'], PAID: ['PRINTING', 'CANCELLED'], PRINTING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] };
