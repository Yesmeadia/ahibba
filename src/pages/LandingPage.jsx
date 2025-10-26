import { useState } from "react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const zones = [
    "Poonch",
    "Mandi",
    "Mendher",
    "Surankote",
    "Rajouri",
    "Jammu",
    "Srinagar",
    "North East",
    "South",
    "Rajasthan",
    "Maharashta",
    "PR Department",
    "Academia Department",
    "Directorate",
    "Not Applicable"
  ];

  // Zones for display in the participating regions section (excluding departments and "Not Applicable")
  const displayZones = zones.filter(zone => 
    zone !== "Not Applicable" && 
    zone !== "PR Department" && 
    zone !== "Academia Department" && 
    zone !== "Directorate"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 to-slate-900 relative overflow-hidden">
      <div className="absolute top-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-900/30 rounded-full blur-3xl"></div>

      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <img
            src="/yeslogo.png"
            alt="YES Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
      </header>

      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mb-8"
                >
                  <p className="text-emerald-200 text-lg font-light mb-4">
                    "Empowering <span className="text-white font-semibold">Change</span>, Inspiring <span className="text-white font-semibold">Action</span>!"
                  </p>

                  <div className="flex justify-center mb-8">
                    <img
                      src="/ahibba.png"
                      alt="Ahibba Heading"
                      className="w-80 h-auto rounded-lg"
                    />
                  </div>

                  <div className="flex items-center space-x-4 mb-8">
                    <div className="flex-1 h-1 bg-gradient-to-r from-yellow-300 to-transparent rounded-full"></div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">25 - 26 October 2025</p>
                        <p className="text-emerald-200 text-sm">Youth Leadership & Empowerment Conference</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">Poonch</p>
                        <p className="text-emerald-200 text-sm">Jammu & Kashmir Region</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="mb-8"
                >
                  <h2 className="text-2xl font-bold text-white mb-5">Program Highlights</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {["Leadership Workshops", "Industry Expert Sessions", "Networking Opportunities", "Skill Development", "Cultural Programs", "Accommodation Provided"].map((item, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-yellow-300 rounded-full flex-shrink-0"></div>
                        <span className="text-emerald-100 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <button
                    disabled
                    className="bg-gray-500 text-white font-bold text-lg py-4 px-10 rounded-full shadow-2xl flex items-center justify-center mb-4 cursor-not-allowed opacity-75"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    REGISTRATION CLOSED
                  </button>
                  <p className="text-emerald-200 text-sm">
                    Registration has ended. Thank you for your interest!
                  </p>
                </motion.div>
              </div>

              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="lg:col-span-1"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-white font-bold text-lg mb-4">Participating Regions</h3>
                  <div className="space-y-3">
                    {displayZones.map((region, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7 + index * 0.05, duration: 0.4 }}
                        className="flex items-center space-x-2 group"
                      >
                        <div className="w-2 h-2 bg-yellow-300 rounded-full group-hover:scale-150 transition-transform"></div>
                        <span className="text-emerald-100 text-sm group-hover:text-white transition-colors">{region}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 py-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-emerald-200 text-sm text-center">
              © 2025 YES INDIA FOUNDATION | Ahibba Summit 6.0
            </p>
            <p className="text-emerald-200 text-sm text-center">
              Powered by Cyberduce Technologies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}