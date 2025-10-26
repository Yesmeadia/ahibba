import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg.png)' }}
      >
        <div className="absolute inset-0 "></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl text-center">

        {/* 404 Number */}
        <div className="relative mb-6">
          <h1 className="text-9xl md:text-[12rem] font-bold text-white/20 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-20 h-20 md:w-24 md:h-24 text-white/40" />
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-blue-100 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
           <span className="text-yellow-500 font-semibold hover:underline"> Use the Latest QR Code.</span>
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-white text-sm">
        <p>© 2025 YES INDIA FOUNDATION | Powered by Cyberduce Technologies</p>
      </div>
    </div>
  );
}