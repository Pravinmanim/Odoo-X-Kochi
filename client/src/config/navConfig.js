import {
  LayoutDashboard,
  Package,
  Layers,
  FileSpreadsheet,
  Receipt,
  Percent,
  CalendarCheck,
  FileText,
  CreditCard,
  Users,
  ShieldCheck,
  User,
} from 'lucide-react';

/**
 * Role-based sidebar navigation configuration.
 * Add new items here - structured so two developers can add entries without conflicts.
 */
export const navigationConfig = [
  // Common / Dashboard & Analytics
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: FileSpreadsheet,
    roles: ['ADMIN', 'STAFF'],
  },

  // Admin Only: Products & Catalog Configuration
  {
    name: 'Products',
    path: '/products',
    icon: Package,
    roles: ['ADMIN', 'STAFF'], // Staff has read-only, Admin has full CRUD
  },
  {
    name: 'Plans',
    path: '/plans',
    icon: Layers,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    name: 'Templates',
    path: '/templates',
    icon: FileSpreadsheet,
    roles: ['ADMIN'],
  },
  {
    name: 'Taxes',
    path: '/taxes',
    icon: Receipt,
    roles: ['ADMIN'],
  },
  {
    name: 'Discounts',
    path: '/discounts',
    icon: Percent,
    roles: ['ADMIN'],
  },

  // Operations: Subscriptions & Invoicing (Admin & Staff)
  {
    name: 'Subscriptions',
    path: '/subscriptions',
    icon: CalendarCheck,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    name: 'Invoices',
    path: '/invoices',
    icon: FileText,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    name: 'Payments',
    path: '/payments',
    icon: CreditCard,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    name: 'Customers',
    path: '/customers',
    icon: Users,
    roles: ['ADMIN', 'STAFF'],
  },

  // Administration: Staff Management (Admin only)
  {
    name: 'Staff',
    path: '/staff',
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },

  // Customer Portal Navigation
  {
    name: 'My Subscriptions',
    path: '/my-subscriptions',
    icon: CalendarCheck,
    roles: ['CUSTOMER'],
  },
  {
    name: 'My Invoices',
    path: '/my-invoices',
    icon: FileText,
    roles: ['CUSTOMER'],
  },
  {
    name: 'Profile',
    path: '/profile',
    icon: User,
    roles: ['CUSTOMER'],
  },
];

/**
 * Filter items by user role
 */
export function getNavItemsForRole(role) {
  if (!role) return [];
  return navigationConfig.filter((item) => item.roles.includes(role));
}
