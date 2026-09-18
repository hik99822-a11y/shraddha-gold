import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Header/Navbar';
import Footer from '../components/Footer/Footer';

const MainLayout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
