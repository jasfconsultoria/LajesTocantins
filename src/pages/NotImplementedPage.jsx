import React from 'react';
import { Wrench } from 'lucide-react';

const NotImplementedPage = ({ title = "Funcionalidade" }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
      <Wrench className="w-16 h-16 text-blue-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-slate-600 mt-2">Esta funcionalidade está em desenvolvimento. Volte em breve!</p>
    </div>
  );
};

export default NotImplementedPage;