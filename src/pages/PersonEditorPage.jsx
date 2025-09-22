import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { logAction } from '@/lib/log';

const initialPersonState = {
    pessoa_tipo: 1, // 1 for PF, 2 for PJ
    cpf_cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    insc_estadual: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '', // Stores municipio.codigo
    uf: '', // Stores uf.sigla
    cep: '',
    pais: 'Brasil',
    telefone: '',
    email: '',
    contato: '',
    observacao: '',
};

const PersonEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [person, setPerson] = useState(initialPersonState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ufs, setUfs] = useState([]); // Stores { uf: ID, sigla: 'AC', estado: 'Acre' }
    const [municipalities, setMunicipalities] = useState([]); // Stores { codigo: '12345', municipio: 'Cidade' }
    const [selectedUfSigla, setSelectedUfSigla] = useState(''); // Stores the selected UF abbreviation (e.g., 'TO')
    const [selectedUfIdForMunicipalities, setSelectedUfIdForMunicipalities] = useState(null); // Stores the selected UF ID (e.g., 17)

    const fetchUfs = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('estados') // Fetch from 'estados' table
                .select('uf, sigla, estado') // Select ID, abbreviation, and full name
                .order('sigla');
            if (error) throw error;
            setUfs(data);
        } catch (error) {
            console.error("Error fetching UFs:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as UFs.' });
        }
    }, [toast]);

    const fetchMunicipalities = useCallback(async (ufId) => { // Takes the integer ID
        if (!ufId) {
            setMunicipalities([]);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('municipios')
                .select('codigo, municipio') // Select code and name
                .eq('uf', ufId) // Filter by the integer UF ID
                .order('municipio');
            if (error) throw error;
            setMunicipalities(data);
        } catch (error) {
            console.error("Error fetching municipalities:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os municípios.' });
        }
    }, [toast]);

    // Fetch UFs on component mount
    useEffect(() => {
        fetchUfs();
    }, [fetchUfs]);

    // Fetch person data and set initial UF/Município
    const fetchPerson = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pessoas')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (data) {
                setPerson(data);
                // Find the UF ID based on the loaded UF sigla
                const loadedUf = ufs.find(u => u.sigla === data.uf);
                if (loadedUf) {
                    setSelectedUfSigla(loadedUf.sigla);
                    setSelectedUfIdForMunicipalities(loadedUf.uf); // Set the ID for filtering municipalities
                } else {
                    setSelectedUfSigla('');
                    setSelectedUfIdForMunicipalities(null);
                }
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar pessoa', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, toast, ufs]); // Add ufs to dependencies

    useEffect(() => {
        // Only fetch person if UFs are loaded (important for initial UF/Município setup)
        if (ufs.length > 0 || !id) { // If no ID, it's a new person, no need to wait for UFs to load for initial person data
            fetchPerson();
        }
    }, [fetchPerson, ufs, id]); // Depend on ufs and id

    // Fetch municipalities when selectedUfIdForMunicipalities changes
    useEffect(() => {
        if (selectedUfIdForMunicipalities) {
            fetchMunicipalities(selectedUfIdForMunicipalities);
        } else {
            setMunicipalities([]); // Clear municipalities if no UF is selected
        }
    }, [selectedUfIdForMunicipalities, fetchMunicipalities]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setPerson(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id, value) => {
        setPerson(prev => ({ ...prev, [id]: value }));
        if (id === 'uf') {
            const selectedState = ufs.find(u => u.sigla === value);
            setSelectedUfSigla(value); // Store the sigla
            setSelectedUfIdForMunicipalities(selectedState ? selectedState.uf : null); // Store the ID
            setPerson(prev => ({ ...prev, municipio: '' })); // Clear municipality when UF changes
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = { ...person, updated_at: new Date().toISOString() };
            let error;
            let actionType;
            let description;

            if (id) {
                const { error: updateError } = await supabase
                    .from('pessoas')
                    .update(saveData)
                    .eq('id', id);
                error = updateError;
                actionType = 'person_update';
                description = `Pessoa ${person.razao_social || person.nome_fantasia} (ID: ${id}) atualizada.`;
            } else {
                delete saveData.id;
                const { data: newPersonData, error: insertError } = await supabase
                    .from('pessoas')
                    .insert([saveData])
                    .select();
                error = insertError;
                actionType = 'person_create';
                description = `Nova pessoa ${saveData.razao_social || saveData.nome_fantasia} (ID: ${newPersonData?.[0]?.id}) criada.`;
                if (newPersonData && newPersonData.length > 0) {
                    saveData.id = newPersonData[0].id;
                }
            }

            if (error) throw error;

            if (user) {
                await logAction(user.id, actionType, description, null, saveData.id);
            }

            toast({ title: 'Sucesso!', description: `Pessoa ${id ? 'atualizada' : 'criada'} com sucesso.` });
            navigate('/app/people');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/app/people')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{id ? 'Editar Pessoa' : 'Nova Pessoa'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie os dados de clientes, fornecedores ou outros contatos.</p>
                </div>
            </div>

            <div className="config-card max-w-5xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        {person.pessoa_tipo === 1 ? <User className="w-6 h-6 text-blue-600" /> : <Building2 className="w-6 h-6 text-purple-600" />}
                        <div>
                            <h3 className="config-title">Informações Cadastrais</h3>
                            <p className="config-description">Dados principais da pessoa física ou jurídica.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6">
                    <div className="form-group">
                        <Label htmlFor="pessoa_tipo" className="form-label">Tipo de Pessoa *</Label>
                        <Select onValueChange={(value) => handleSelectChange('pessoa_tipo', parseInt(value))} value={person.pessoa_tipo.toString()}>
                            <SelectTrigger id="pessoa_tipo" className="form-select">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Pessoa Física</SelectItem>
                                <SelectItem value="2">Pessoa Jurídica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group">
                        <Label htmlFor="cpf_cnpj" className="form-label">{person.pessoa_tipo === 1 ? 'CPF' : 'CNPJ'} *</Label>
                        <Input id="cpf_cnpj" type="text" className="form-input" value={person.cpf_cnpj} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="razao_social" className="form-label">{person.pessoa_tipo === 1 ? 'Nome Completo' : 'Razão Social'} *</Label>
                        <Input id="razao_social" type="text" className="form-input" value={person.razao_social} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="nome_fantasia" className="form-label">{person.pessoa_tipo === 1 ? 'Apelido' : 'Nome Fantasia'}</Label>
                        <Input id="nome_fantasia" type="text" className="form-input" value={person.nome_fantasia} onChange={handleInputChange} />
                    </div>
                    {person.pessoa_tipo === 2 && (
                        <div className="form-group">
                            <Label htmlFor="insc_estadual" className="form-label">Inscrição Estadual</Label>
                            <Input id="insc_estadual" type="text" className="form-input" value={person.insc_estadual} onChange={handleInputChange} />
                        </div>
                    )}
                    <div className="form-group">
                        <Label htmlFor="telefone" className="form-label">Telefone</Label>
                        <Input id="telefone" type="text" className="form-input" value={person.telefone} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="email" className="form-label">Email</Label>
                        <Input id="email" type="email" className="form-input" value={person.email} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="contato" className="form-label">Contato</Label>
                        <Input id="contato" type="text" className="form-input" value={person.contato} onChange={handleInputChange} />
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Endereço</h3>
                <div className="form-grid pt-6">
                    <div className="form-group">
                        <Label htmlFor="cep" className="form-label">CEP</Label>
                        <Input id="cep" type="text" className="form-input" value={person.cep} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="logradouro" className="form-label">Logradouro</Label>
                        <Input id="logradouro" type="text" className="form-input" value={person.logradouro} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="numero" className="form-label">Número</Label>
                        <Input id="numero" type="text" className="form-input" value={person.numero} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="complemento" className="form-label">Complemento</Label>
                        <Input id="complemento" type="text" className="form-input" value={person.complemento} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="bairro" className="form-label">Bairro</Label>
                        <Input id="bairro" type="text" className="form-input" value={person.bairro} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="uf" className="form-label">UF</Label>
                        <Select onValueChange={(value) => handleSelectChange('uf', value)} value={selectedUfSigla}>
                            <SelectTrigger id="uf" className="form-select">
                                <SelectValue placeholder="Selecione a UF" />
                            </SelectTrigger>
                            <SelectContent>
                                {ufs.map(uf => (
                                    <SelectItem key={uf.uf} value={uf.sigla}>{uf.sigla} - {uf.estado}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group">
                        <Label htmlFor="municipio" className="form-label">Município</Label>
                        <Select onValueChange={(value) => handleSelectChange('municipio', value)} value={person.municipio}>
                            <SelectTrigger id="municipio" className="form-select" disabled={!selectedUfIdForMunicipalities}>
                                <SelectValue placeholder="Selecione o Município" />
                            </SelectTrigger>
                            <SelectContent>
                                {municipalities.map(m => (
                                    <SelectItem key={m.codigo} value={m.codigo}>{m.municipio}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group">
                        <Label htmlFor="pais" className="form-label">País</Label>
                        <Input id="pais" type="text" className="form-input" value={person.pais} onChange={handleInputChange} />
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Observações</h3>
                <div className="form-grid pt-6">
                    <div className="form-group col-span-full">
                        <Label htmlFor="observacao" className="form-label">Observação</Label>
                        <Textarea id="observacao" className="form-textarea" value={person.observacao} onChange={handleInputChange} rows={3} />
                    </div>
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Pessoa
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PersonEditorPage;