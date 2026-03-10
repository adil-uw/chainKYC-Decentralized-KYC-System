import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function IntroLayer({ onEnter }) {
  const [exiting, setExiting] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      onEnter();
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg transition-opacity duration-400 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center text-center px-6 transition-all duration-400 ${
          exiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <h1
          onClick={handleEnter}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-100 cursor-pointer hover:text-accent-teal transition-colors max-w-4xl mb-4 select-none"
        >
          ChainKYC: Blockchain-Based Reusable KYC Verification System
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10">
          Secure off-chain identity verification with on-chain proof and reusable credentials
        </p>
        <button
          onClick={handleEnter}
          className="btn-primary flex items-center gap-2 py-3 px-6 text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Enter
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
