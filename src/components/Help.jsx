import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Settings,
  Shield,
  Mail,
  Phone,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Help = () => {
  const { handleNotImplemented } = useOutletContext();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Central de Ajuda</h1>
        <p className="text-slate-600 mt-2">Documentação e suporte para o sistema de NFC-e</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="help-section">
            <h3 className="help-title">Perguntas Frequentes</h3>
            <div className="help-content">
              <div className="help-item">
                <div className="help-question">
                  <span className="font-medium">Como configurar o certificado digital?</span>
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              
              <div className="help-item">
                <div className="help-question">
                  <span className="font-medium">Por que minha NFC-e foi rejeitada?</span>
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              
              <div className="help-item">
                <div className="help-question">
                  <span className="font-medium">Como integrar com o WooCommerce?</span>
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h3 className="help-title">Guias de Configuração</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="feature-card">
                <Settings className="feature-icon" />
                <h4 className="feature-title">Configuração Inicial</h4>
                <p className="feature-description">Passo a passo para configurar o sistema pela primeira vez</p>
                <Button 
                  onClick={() => handleNotImplemented('Abrir guia de configuração inicial')}
                  className="mt-4 w-full"
                  variant="outline"
                >
                  Ver Guia
                </Button>
              </div>
              
              <div className="feature-card">
                <Shield className="feature-icon" />
                <h4 className="feature-title">Certificado Digital</h4>
                <p className="feature-description">Como obter e configurar seu certificado digital</p>
                <Button 
                  onClick={() => handleNotImplemented('Abrir guia de certificado')}
                  className="mt-4 w-full"
                  variant="outline"
                >
                  Ver Guia
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="contact-card">
            <Mail className="contact-icon" />
            <h4 className="contact-title">Suporte por Email</h4>
            <p className="contact-info">suporte@pmw420.com</p>
            <Button 
              onClick={() => handleNotImplemented('Abrir email de suporte')}
              className="mt-3 w-full"
              variant="outline"
            >
              Enviar Email
            </Button>
          </div>

          <div className="contact-card">
            <Phone className="contact-icon" />
            <h4 className="contact-title">Suporte por Telefone</h4>
            <p className="contact-info">(63) 9999-9999</p>
            <Button 
              onClick={() => handleNotImplemented('Ligar para suporte')}
              className="mt-3 w-full"
              variant="outline"
            >
              Ligar Agora
            </Button>
          </div>

          <div className="contact-card">
            <HelpCircle className="contact-icon" />
            <h4 className="contact-title">Base de Conhecimento</h4>
            <p className="contact-info">Documentação completa</p>
            <Button 
              onClick={() => handleNotImplemented('Abrir documentação')}
              className="mt-3 w-full"
              variant="outline"
            >
              Acessar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;