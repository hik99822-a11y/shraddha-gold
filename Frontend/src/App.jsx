import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home/Home';
import About from './pages/About/About';
import Services from './pages/Services/Services';
import Products from './pages/Products/Products';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Contact from './pages/Contact/Contact';
import Login from './pages/Login/Login';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsOfServices from './pages/Legal/TermsOfServices';
import { useAuth } from './context/AuthContext';
import { useLenis } from './hooks/useLenis';

// Admin Architecture
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard';
import CustomersManagement from './pages/Admin/Customers/CustomersManagement';
import CategoriesManagement from './pages/Admin/Categories/CategoriesManagement';
import StyleImagesManagement from './pages/Admin/StyleImages/StyleImagesManagement';
import ExcelStockManagement from './pages/Admin/ExcelStock/ExcelStockManagement';
import OrdersManagement from './pages/Admin/Orders/OrdersManagement';
import AdminProfile from './pages/Admin/Profile/AdminProfile';
import PDFCompress from './pages/Admin/PDFCompress/PDFCompress';

// Customer & Shared Architecture
import CustomerPortal from './pages/CustomerPortal/CustomerPortal';
import SharedViewer from './pages/SharedViewer/SharedViewer';

// Scroll restoration component on route navigation with Lenis integration
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
};

// Admin Route Guard (Requires Admin Role)
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/customer/portal" replace />;
  }
  return children;
};

// Customer Route Guard (Requires Authentication)
const CustomerRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Smart Dashboard Redirector based on user role
const DashboardRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/customer/portal" replace />;
};

function App() {
  const { pathname } = useLocation();
  // Initialize smooth inertia scrolling (bypasses on /admin and portal routes)
  useLenis(pathname);

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Main Layout with Luxury Header and Footer */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="products" element={<Products />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-of-services" element={<TermsOfServices />} />
          <Route path="dashboard" element={<DashboardRedirect />} />
        </Route>

        {/* Public Shared Token Portfolio Viewer ("Without Login") */}
        <Route path="/shared/:token" element={<SharedViewer />} />
        <Route path="/shared/:token/:section" element={<SharedViewer />} />

        {/* Authenticated Customer Portal ("With Login") */}
        <Route
          path="/customer/portal"
          element={
            <CustomerRoute>
              <CustomerPortal />
            </CustomerRoute>
          }
        />
        <Route
          path="/customer/portal/:section"
          element={
            <CustomerRoute>
              <CustomerPortal />
            </CustomerRoute>
          }
        />

        {/* Complete Executive Admin Panel */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="customers" element={<CustomersManagement />} />
          <Route path="orders" element={<OrdersManagement orderType="Regular" />} />
          <Route path="make-stock-orders" element={<OrdersManagement orderType="Make Stock" />} />
          <Route path="categories" element={<CategoriesManagement />} />
          <Route path="style-images" element={<StyleImagesManagement />} />
          <Route path="excel-stock" element={<ExcelStockManagement />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="pdf-compress" element={<PDFCompress />} />
        </Route>

        {/* Dedicated Split-Screen Authentication Page */}
        <Route path="/login" element={<Login />} />

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
