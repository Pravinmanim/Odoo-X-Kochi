import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Pages
import LoginPage from '../pages/auth/LoginPage.jsx';
import SignupPage from '../pages/auth/SignupPage.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import ProductListPage from '../pages/products/ProductListPage.jsx';
import PlanListPage from '../pages/plans/PlanListPage.jsx';
import TaxListPage from '../pages/taxes/TaxListPage.jsx';
import DiscountListPage from '../pages/discounts/DiscountListPage.jsx';
import StaffListPage from '../pages/staff/StaffListPage.jsx';
import CustomerListPage from '../pages/customers/CustomerListPage.jsx';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage.jsx';
import SubscriptionListPage from '../pages/subscriptions/SubscriptionListPage.jsx';
import SubscriptionDetailPage from '../pages/subscriptions/SubscriptionDetailPage.jsx';
import MySubscriptionsPage from '../pages/customer-portal/MySubscriptionsPage.jsx';
import PlaceholderPage from '../pages/PlaceholderPage.jsx';
import Loader from '../components/Loader.jsx';

/**
 * Higher-order Route Guard for authentication and role requirements
 */
export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader text="Verifying session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their default view if forbidden
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/my-subscriptions" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Root index redirector based on authenticated role
 */
export function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'CUSTOMER') {
    return <Navigate to="/my-subscriptions" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

/**
 * Modular route definitions list.
 * Two developers can easily add entries without conflicting.
 */
export const appRoutes = [
  // Default index
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Executive Dashboard & Analytics (Admin & Staff)
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

  // Downloadable Reports Route (Admin & Staff)
  {
    path: '/reports',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

  // Reference Module: Products (Admin full CRUD, Staff read-only)
  {
    path: '/products',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <ProductListPage />
      </ProtectedRoute>
    ),
  },

  // Staff Administration (Admin only)
  {
    path: '/staff',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <StaffListPage />
      </ProtectedRoute>
    ),
  },

  // Modules for Developer 2
  {
    path: '/plans',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <PlanListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <PlaceholderPage
          title="Quotation Templates"
          description="Pre-packaged bundles of products and variant configurations for swift quotation drafting."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/taxes',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <TaxListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/discounts',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <DiscountListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/subscriptions',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <SubscriptionListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/subscriptions/:id',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
        <SubscriptionDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/invoices',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <PlaceholderPage
          title="Invoices"
          description="Manage recurring billing invoices, automated period calculations, and tax lines."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/payments',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <PlaceholderPage
          title="Payments"
          description="Record incoming subscription payments, payment methods, and transaction receipts."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <CustomerListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/:id',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
        <CustomerDetailPage />
      </ProtectedRoute>
    ),
  },

  // Customer Portal Routes
  {
    path: '/my-subscriptions',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <MySubscriptionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-invoices',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <PlaceholderPage
          title="My Invoices"
          description="View and download invoice history, due dates, and payment receipts."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <PlaceholderPage
          title="Account Profile"
          description="Update contact information, company billing details, and address."
        />
      </ProtectedRoute>
    ),
  },
];
