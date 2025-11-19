// src/pages/Landing.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BadgePlus } from 'lucide-react';
import GalaxyParticles from '../components/ui/GalaxyParticles';
import Shaders from '../components/ui/Shaders';
import { useParameters } from '../contexts/ParameterContext';

const Landing = ({ onClearSession }) => {
  const { removeAllParameters } = useParameters();

  useEffect(() => {
    // Clear all parameters when landing page is accessed
    removeAllParameters();
    // Clear App-level state and sessionStorage
    if (onClearSession) {
      onClearSession();
    }
  }, [removeAllParameters, onClearSession]);
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="fixed w-full h-screen overflow-hidden">
      {/* Background particle system */}
      <GalaxyParticles />
      <Shaders />
      {/* Foreground content */}
      <div className="content__inner absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white">
      <div className="max-w-4xl mx-auto px-8">
          <h1 className="flex flex-wrap justify-center gap-4 text-[84px] text-primary font-bold leading-[64px] mb-8 tracking-tight text-center">
            {["What", "kind", "of", "futures", "do", "you", "envision?"].map((word, i) => (
              <span key={i}>
                {word === "futures" ? (
                  <Link
                    to="/library" 
                    className="
                      group relative inline-block italic cursor-pointer
                      transition-all duration-500 ease-out
                      hover:scale-125 hover:text-primary hover:bg-popover hover:p-8 hover:pb-14
                      before:content-[''] before:fixed before:inset-0 before:bg-primary
                      before:opacity-0 group-hover:before:opacity-100
                      before:transition-opacity before:duration-500 before:ease-out
                      before:pointer-events-none before:-z-10
                      z-10
                    "
                  >
                    {word}
                    {/* subtext appears on hover */}
                    <span
                      className="
                        absolute left-0 w-3/4 top-[65%]
                        text-[20px] font-normal not-italic opacity-0 tracking-normal
                        transition-opacity duration-200 ease-out bg-none leading-[40px] whitespace-nowrap
                        group-hover:opacity-100
                      "
                    >
                      you can read →
                    </span>
                  </Link>
                ) : (
                  word
                )}
              </span>
            ))}
          </h1>

  
          <p className="text-[28px] text-darkText/80 mb-8 font-regular leading-[40px] hover:bg-background/70 transition-colors">
            Explore speculative futures, challenge assumptions, and shape worlds that 
            reflect the values you believe in.
          </p>
          <Link
            to="/parameters"
            className="inline-flex items-center bg-primary text-primary-foreground 
              px-6 py-3 rounded-md text-lg font-light hover:bg-accent/90 transition-colors"
          >
            Get Started
            <BadgePlus className="ml-2 h-5 w-5" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center bg-primary text-primary-foreground 
              m-2 px-6 py-3 rounded-md text-lg font-light hover:bg-accent/90 transition-colors"
          >
            Learn More about the Project
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      
      </div>
      
    </div>
    </div>
  );
};

export default Landing;

