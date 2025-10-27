import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { Dashboard } from '@/components/dashboard';
import { Pricing } from '@/components/pricing';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <Dashboard />
      <Pricing />
      <Footer />
    </main>
  );
}