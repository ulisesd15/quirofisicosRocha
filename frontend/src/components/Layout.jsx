/**
 * Layout.jsx — shared page shell (Navbar + routed page + Footer) used by
 * every public-facing route via React Router's nested <Outlet />.
 */
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
