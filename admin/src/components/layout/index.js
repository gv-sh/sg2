import React from 'react';
import { motion } from 'framer-motion';

// Page animation variants
const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

// Layout Component
function Layout({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6"
    >
      {children}
    </motion.div>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="border-t py-6 md:px-8 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {new Date().getFullYear()} SpecGen Admin - Fiction & Image Generation Admin Panel
        </p>
      </div>
    </footer>
  );
}

export { Layout, Footer };
export default Layout;
