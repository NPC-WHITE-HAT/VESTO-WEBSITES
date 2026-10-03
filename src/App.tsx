import { useState } from 'react';
import { CartProvider } from '@/context/CartContext';
import { useRouter } from '@/router';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { QuickView } from '@/components/QuickView';
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductPage } from '@/pages/ProductPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import type { Product } from '@/types';

function App() {
  const route = useRouter();
  const [quickView, setQuickView] = useState<Product | null>(null);

  const renderPage = () => {
    const { path, params } = route;
    switch (path) {
      case '/':
        return <HomePage onQuickView={setQuickView} />;
      case '/shop':
        return (
          <ShopPage
            initialFilter={params.filter ?? 'all'}
            initialQuery={params.q ?? ''}
            onQuickView={setQuickView}
          />
        );
      case '/product':
        return <ProductPage id={params.id ?? ''} onQuickView={setQuickView} />;
      case '/cart':
        return <CartPage />;
      case '/checkout':
        return <CheckoutPage />;
      case '/admin':
        return <AdminLoginPage />;
      case '/admin/dashboard':
        return <AdminDashboardPage />;
      case '/about':
        return <AboutPage />;
      case '/contact':
        return <ContactPage />;
      default:
        return <HomePage onQuickView={setQuickView} />;
    }
  };

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{renderPage()}</main>
        <Footer />
        <WhatsAppFloat />
        <QuickView product={quickView} onClose={() => setQuickView(null)} />
      </div>
    </CartProvider>
  );
}

export default App;
