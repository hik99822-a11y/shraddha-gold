import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home/Home';
import Services from './pages/Services/Services';
import Login from './pages/Login/Login';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsOfServices from './pages/Legal/TermsOfServices';
import { useAuth } from './context/AuthContext';
import { useLenis } from './hooks/useLenis';
import { useLandingPage } from './context/LandingPageContext';

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
import LandingPageAdmin from './pages/Admin/LandingPage/LandingPageAdmin';

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
  const { settings } = useLandingPage();
  
  // Initialize smooth inertia scrolling (bypasses on /admin and portal routes)
  useLenis(pathname);
  
  const whatsappNumber = settings?.general?.whatsappNumber || '917600619325';
  // ensure no + or spaces in link
  const formattedWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <>
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <Routes>
        {/* Public Main Layout with Luxury Header and Footer */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
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
          <Route path="landing-page" element={<LandingPageAdmin />} />
        </Route>

        {/* Dedicated Split-Screen Authentication Page */}
        <Route path="/login" element={<Login />} />

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* WhatsApp Floating Button */}
      <a 
        href={`https://wa.me/${formattedWhatsapp}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#25D366',
          color: 'white',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          zIndex: 1000,
          textDecoration: 'none',
          fontSize: '30px'
        }}
        aria-label="Chat on WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/>
        </svg>
      </a>
    </>
  );
}

export default App;
