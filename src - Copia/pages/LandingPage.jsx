import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingPage = () => {
  return (
    <div className="bg-slate-50 text-slate-800 font-sans">
      <Helmet>
        <title>Sistema de Gerenciamento | Lajes Tocantins</title>
        <meta name="description" content="Acesse o sistema de gerenciamento da Lajes Tocantins." />
      </Helmet>
      
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="/lajes-tocantins-logo.jpg" alt="Lajes Tocantins Logo" className="h-12" />
          </div>
          <Link to="/app" className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              Acessar Sistema
          </Link>
        </div>
      </header>

      <main>
        <section className="relative py-32 text-center bg-white overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
            <div className="container mx-auto px-6 relative">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Sistema de Gerenciamento <br /> <span className="text-blue-600">Lajes Tocantins</span>
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                        Gerencie suas operações de forma eficiente e integrada. Acesse o painel para começar.
                    </p>
                    <div className="mt-10 flex justify-center gap-4">
                        <Link to="/app" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-lg shadow-xl hover:shadow-2xl transition-shadow transform hover:scale-105 text-lg">
                            Acessar Painel
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
      </main>
      
      <footer className="bg-slate-900 text-white">
          <div className="container mx-auto px-6 py-16">
              <div className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                  <p>&copy; {new Date().getFullYear()} Lajes Tocantins. Todos os direitos reservados.</p>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default LandingPage;