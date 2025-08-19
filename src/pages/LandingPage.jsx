import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="bg-slate-50 text-slate-800 font-sans">
      <Helmet>
        <title>NFC-e Plus | Automação de Notas Fiscais</title>
        <meta name="description" content="Automatize a emissão de NFC-e. Simples, rápido e em conformidade com a SEFAZ." />
      </Helmet>
      
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">NFC-e Plus</span>
          </div>
          <Link to="/app" className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              Acessar App
          </Link>
        </div>
      </header>

      <main>
        <section className="relative py-32 text-center bg-white overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
            <div className="container mx-auto px-6 relative">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Sistema para Emissão de <span className="gradient-text">NFC-e</span>.
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                        Menos burocracia, mais tempo para você. Acesse o painel para configurar e começar a emitir.
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
                  <p>&copy; {new Date().getFullYear()} NFC-e Plus. Todos os direitos reservados.</p>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default LandingPage;