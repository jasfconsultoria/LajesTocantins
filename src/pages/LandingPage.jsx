import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Link as LinkIcon, Shield, CheckCircle, BarChart, DollarSign, Users, ChevronRight, FileText } from 'lucide-react';

const FeatureCard = ({ icon, title, children }) => (
  <motion.div
    className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
    whileHover={{ y: -5 }}
  >
    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600">{children}</p>
  </motion.div>
);

const PriceCard = ({ plan, price, features, isFeatured }) => (
    <div className={`border rounded-2xl p-8 flex flex-col ${isFeatured ? 'border-purple-500 scale-105 bg-white shadow-2xl z-10' : 'border-slate-300 bg-slate-50'}`}>
        {isFeatured && (
            <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase">Mais Popular</span>
            </div>
        )}
        <h3 className="text-2xl font-bold text-slate-800">{plan}</h3>
        <p className="mt-4">
            <span className="text-5xl font-extrabold text-slate-900">{price}</span>
            <span className="text-slate-500">/mês</span>
        </p>
        <p className="mt-2 text-slate-600">Para empresas que buscam eficiência.</p>
        <ul className="mt-8 space-y-4 flex-grow">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-700">{feature}</span>
                </li>
            ))}
        </ul>
        <Link to="/app" className={`mt-10 w-full text-center font-semibold py-3 px-6 rounded-lg transition-transform duration-300 transform hover:scale-105 ${isFeatured ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'bg-white border border-slate-300 text-blue-600 hover:bg-slate-100'}`}>
            Começar Agora
        </Link>
    </div>
);

const FaqItem = ({ question, children }) => (
    <details className="group border-b border-slate-200 py-4">
        <summary className="flex justify-between items-center font-semibold text-slate-800 cursor-pointer list-none">
            <span>{question}</span>
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-open:rotate-90" />
        </summary>
        <div className="text-slate-600 mt-3 group-open:animate-fadeIn">
            {children}
        </div>
    </details>
);

const LandingPage = () => {
  return (
    <div className="bg-slate-50 text-slate-800 font-sans">
      <Helmet>
        <title>NFC-e Plus | Automação de Notas Fiscais para WooCommerce</title>
        <meta name="description" content="Automatize a emissão de NFC-e para suas vendas no WooCommerce. Simples, rápido e em conformidade com a SEFAZ. Experimente agora!" />
      </Helmet>
      
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">NFC-e Plus</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-slate-600 hover:text-blue-600 transition">Recursos</a>
            <a href="#pricing" className="text-slate-600 hover:text-blue-600 transition">Preços</a>
            <a href="#faq" className="text-slate-600 hover:text-blue-600 transition">FAQ</a>
          </nav>
          <Link to="/app" className="hidden md:inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              Acessar App
          </Link>
        </div>
      </header>

      <main>
        <section className="relative pt-24 pb-32 text-center bg-white overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
            <div className="container mx-auto px-6 relative">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Automatize a Emissão de <span className="gradient-text">NFC-e</span> para seu WooCommerce.
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                        Conecte sua loja e deixe que o NFC-e Plus cuide da emissão de notas fiscais para cada venda. Menos burocracia, mais tempo para você vender.
                    </p>
                    <div className="mt-10 flex justify-center gap-4">
                        <Link to="/app" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-lg shadow-xl hover:shadow-2xl transition-shadow transform hover:scale-105 text-lg">
                            Começar Agora (Grátis)
                        </Link>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">Não precisa de cartão de crédito.</p>
                </motion.div>
                 <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="mt-16">
                    <img  alt="Dashboard of NFC-e Plus app showing orders and status" className="rounded-xl shadow-2xl ring-1 ring-slate-900/10 mx-auto" width="1000" height="600" src="https://images.unsplash.com/photo-1698364019043-23fc0d9e7839" />
                </motion.div>
            </div>
        </section>

        <section id="features" className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900">Tudo que você precisa para decolar</h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Funcionalidades pensadas para simplificar sua vida e garantir a conformidade fiscal do seu negócio.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={<Zap className="w-6 h-6 text-blue-600" />}>
                Automação Total
              </FeatureCard>
              <FeatureCard icon={<LinkIcon className="w-6 h-6 text-purple-600" />}>
                Integração Perfeita
              </FeatureCard>
              <FeatureCard icon={<Shield className="w-6 h-6 text-green-600" />}>
                Conformidade com a SEFAZ
              </FeatureCard>
               <FeatureCard icon={<CheckCircle className="w-6 h-6 text-indigo-600" />}>
                Emissão em Lote
              </FeatureCard>
               <FeatureCard icon={<BarChart className="w-6 h-6 text-orange-600" />}>
                Relatórios Inteligentes
              </FeatureCard>
               <FeatureCard icon={<Users className="w-6 h-6 text-pink-600" />}>
                Gestão Simplificada
              </FeatureCard>
            </div>
          </div>
        </section>
        
        <section id="pricing" className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-slate-900">Planos flexíveis para seu negócio</h2>
                    <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Escolha o plano que melhor se adapta ao seu volume de vendas. Sem taxas escondidas.</p>
                </div>
                <div className="relative grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
                    <PriceCard plan="Iniciante" price="R$ 29" features={['Até 100 emissões/mês', 'Suporte via Email', 'Relatórios Básicos']} />
                    <PriceCard plan="Profissional" price="R$ 59" features={['Até 500 emissões/mês', 'Suporte Prioritário', 'Relatórios Avançados', 'Emissão em Lote']} isFeatured />
                    <PriceCard plan="Empresarial" price="R$ 99" features={['Emissões Ilimitadas', 'Suporte Dedicado 24/7', 'API para Integração', 'Multi-empresa']} />
                </div>
            </div>
        </section>

        <section id="faq" className="py-24">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-slate-900">Dúvidas Frequentes</h2>
                    <p className="mt-4 text-lg text-slate-600">Respostas para as perguntas mais comuns.</p>
                </div>
                <div className="space-y-2">
                    <FaqItem question="Preciso de um certificado digital?">
                        Sim, o certificado digital A1 é obrigatório para a emissão de NFC-e. Ele garante a autenticidade e a validade jurídica das suas notas fiscais. Você pode configurá-lo facilmente em nosso painel.
                    </FaqItem>
                    <FaqItem question="Como funciona a integração com WooCommerce?">
                        É muito simples! Basta instalar nosso plugin no seu WordPress, gerar as chaves de API na configuração do WooCommerce e inseri-las em nosso painel. Em poucos minutos, sua loja estará conectada.
                    </FaqItem>
                    <FaqItem question="A emissão é automática para todos os pedidos?">
                        Você tem total controle. Pode configurar a emissão para ser disparada automaticamente quando um pedido atinge um status específico (ex: "Processando" ou "Concluído"), ou pode emitir as notas manualmente em lote.
                    </FaqItem>
                     <FaqItem question="Posso cancelar uma nota fiscal emitida?">
                        Sim, desde que esteja dentro do prazo legal permitido pela SEFAZ do seu estado (geralmente algumas horas após a emissão) e a mercadoria ainda não tenha circulado. O cancelamento é feito diretamente pelo nosso painel.
                    </FaqItem>
                </div>
            </div>
        </section>
      </main>
      
      <footer className="bg-slate-900 text-white">
          <div className="container mx-auto px-6 py-16">
              <div className="grid md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="font-bold text-lg mb-4">NFC-e Plus</h3>
                    <p className="text-slate-400">Simplificando a gestão fiscal para lojas WooCommerce.</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-4">Navegação</h3>
                    <ul className="space-y-2">
                        <li><a href="#features" className="text-slate-400 hover:text-white">Recursos</a></li>
                        <li><a href="#pricing" className="text-slate-400 hover:text-white">Preços</a></li>
                        <li><a href="#faq" className="text-slate-400 hover:text-white">FAQ</a></li>
                        <li><Link to="/app" className="text-slate-400 hover:text-white">Login</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-4">Legal</h3>
                    <ul className="space-y-2">
                        <li><a href="#" className="text-slate-400 hover:text-white">Termos de Serviço</a></li>
                        <li><a href="#" className="text-slate-400 hover:text-white">Política de Privacidade</a></li>
                    </ul>
                  </div>
                   <div>
                    <h3 className="font-bold text-lg mb-4">Fale Conosco</h3>
                    <p className="text-slate-400">contato@nfceplus.com</p>
                  </div>
              </div>
              <div className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                  <p>&copy; {new Date().getFullYear()} NFC-e Plus. Todos os direitos reservados.</p>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default LandingPage;