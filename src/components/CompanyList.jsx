import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, Building, ChevronLeft, ChevronRight, KeyRound, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
// import CompanyUserDialog from './CompanyUserDialog'; // Removed import
import CertificateSettings from '@/components/settings/CertificateSettings';
import SefazSettings from '@/components/settings/SefazSettings';

const CompanyList = () => {
    const { handleNotImplemented } = useOutletContext();
    const { role } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // const [selectedCompany, setSelectedCompany] = useState(null); // Removed state
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
    const [companyForCertificate, setCompanyForCertificate] = useState(null);
    const [isSefazModalOpen, setIsSefazModalOpen] = useState(false);
    const [companyForSefaz, setCompanyForSefaz] = useState(null);

    const ITEMS_PER_PAGE = 10;

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('get-all-companies');
            
            if (error) throw error;
            setCompanies(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar empresas",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const filteredCompanies = useMemo(() => {
        return companies.filter(c =>
            (c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.cnpj?.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, '')))
        );
    }, [companies, searchTerm]);

    const paginatedCompanies = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCompanies, currentPage]);

    const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleOpenCertificateModal = (company) => {
        setCompanyForCertificate(company);
        setIsCertificateModalOpen(true);
    };

    const handleCloseCertificateModal = () => {
        setIsCertificateModalOpen(false);
        setCompanyForCertificate(null);
        fetchCompanies();
    };

    const handleOpenSefazModal = (company) => {
        setCompanyForSefaz(company);
        setIsSefazModalOpen(true);
    };

    const handleCloseSefazModal = () => {
        setIsSefazModalOpen(false);
        setCompanyForSefaz(null);
        fetchCompanies();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <Building className="w-8 h-8" />
                        Lista de Empresas
                    </h1>
                    <p className="text-slate-600 mt-2">Visualize e gerencie as empresas (emitentes) cadastradas.</p>
                </div>
                {role === 'admin' && (
                    <Button 
                        onClick={() => navigate('/app/companies/new')} 
                        className="save-button"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Nova Empresa
                    </Button>
                )}
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por Razão Social ou CNPJ..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>
            
            {loading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
                <div className="data-table-container">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Razão Social</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Cidade/UF</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCompanies.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.razao_social}</TableCell>
                                    <TableCell>{c.cnpj}</TableCell>
                                    <TableCell>{c.municipio}/{c.uf}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Removed UsersIcon button */}
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/companies/${c.id}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenCertificateModal(c)}>
                                                <KeyRound className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenSefazModal(c)}>
                                                <Shield className="w-4 h-4" />
                                            </Button>
                                            {role === 'admin' && (
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleNotImplemented('Excluir Empresa')}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex justify-between items-center text-sm text-slate-600 mt-4">
                <div>
                    Exibindo {paginatedCompanies.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredCompanies.length)} de {filteredCompanies.length} registros
                </div>
                <div className="flex items-center gap-2">
                    <span>Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                        Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
            
            {/* Removed CompanyUserDialog usage */}

            <Dialog open={isCertificateModalOpen} onOpenChange={setIsCertificateModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Certificado Digital para {companyForCertificate?.razao_social}</DialogTitle>
                        <DialogDescription>
                            Faça o upload e gerencie o certificado digital A1 para esta empresa.
                        </DialogDescription>
                    </DialogHeader>
                    {companyForCertificate && (
                        <CertificateSettings companyId={companyForCertificate.id} />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isSefazModalOpen} onOpenChange={setIsSefazModalOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Configurações SEFAZ para {companyForSefaz?.razao_social}</DialogTitle>
                        <DialogDescription>
                            Configure a integração com a SEFAZ para esta empresa.
                        </DialogDescription>
                    </DialogHeader>
                    {companyForSefaz && (
                        <SefazSettings companyId={companyForSefaz.id} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompanyList;