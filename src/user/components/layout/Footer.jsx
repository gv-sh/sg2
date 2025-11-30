// src/components/layout/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t py-4 text-center text-sm text-muted-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
      <div className="container">
        <p>
          ©️ Conceptualized by <a 
            href="https://www.1377.co.in/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >13°77°</a> and developed in collaboration with <a 
            href="https://mathscapes.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >Mathscapes</a>. Commissioned by <a 
            href="https://drive.google.com/file/d/1ig1VdKZne2DFyQ4S1zR5Er2Ie42GUlNr/view?usp=drivesdk" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >Quest Learning Observatory</a>.

        </p>
      </div>
    </footer>
  );
};

export default Footer;