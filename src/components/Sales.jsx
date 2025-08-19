import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, PackagePlus, Trash2, Save, XCircle, Search, ClipboardList, CheckCircle } from 'lucide-react';

const Sales = ({ setActiveTab }) => {
    const { user, session } = useAuth();
    const { toast } = useToast();

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cart, setCart] = useState([]);
    
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [customersRes, productsRes] = await Promise.all([
                supabase.from('customers').select('*').eq('user_id', user.id),
                supabase.from('products').select('*').eq('user_id', user.id)
            ]);

            if (customersRes.error) throw customersRes.error;
            if (productsRes.error) throw productsRes.error;

            setCustomers(customersRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao carregar dados", description: error.message });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user, fetchInitialData]);

    const filteredCustomers = useMemo(() => 
        customers.filter(c => 
            `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.email.toLowerCase().includes(customerSearch.toLowerCase())
        ).slice(0, 5), 
    [customers, customerSearch]);

    const filteredProducts = useMemo(() => 
        products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 5), 
    [products, productSearch]);

    const addProductToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product_id === product.id);
            if (existingItem) {
                return prevCart.map(item => 
                    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
        });
        setProductSearch('');
    };

    const updateQuantity = (productId, quantity) => {
        const newQuantity = Math.max(1, quantity);
        setCart(cart.map(item => item.product_id === productId ? { ...item, quantity: newQuantity } : item));
    };
    
    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const total = useMemo(() => 
        cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    [cart]);

    const resetSale = () => {
        setSelectedCustomer(null);
        setCart([]);
        setCustomerSearch('');
        setProductSearch('');
    };
    
    const handleFinalizeSale = async () => {
        if (!selectedCustomer) {
            toast({ variant: "destructive", title: "Cliente não selecionado", description: "Por favor, selecione um cliente para a venda." });
            return;
        }
        if (cart.length === 0) {
            toast({ variant: "destructive", title: "Carrinho vazio", description: "Adicione pelo menos um produto para criar o pedido." });
            return;
        }
        
        setIsSubmitting(true);
        toast({ title: 'Criando pedido...', description: 'Aguarde enquanto o pedido é enviado para o WooCommerce.' });
        
        const orderPayload = {
            customer_id: selectedCustomer.id,
            billing: {
                first_name: selectedCustomer.first_name,
                last_name: selectedCustomer.last_name,
                email: selectedCustomer.email,
            },
            shipping: {
                first_name: selectedCustomer.first_name,
                last_name: selectedCustomer.last_name,
            },
            line_items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
            })),
            set_paid: true,
        };
        
        try {
            const { data, error } = await supabase.functions.invoke('create-woo-order', {
                body: JSON.stringify(orderPayload),
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            
            toast({
                title: 'Venda Finalizada com Sucesso!',
                description: `Pedido #${data.order_id} criado no WooCommerce.`,
                action: <Button onClick={() => setActiveTab('nfce')}>Ir para NFC-e</Button>
            });
            resetSale();
        } catch(error) {
            toast({ variant: "destructive", title: "Erro ao finalizar venda", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Ponto de Venda (PDV)</h1>
                <p className="text-slate-600 mt-2">Crie um novo pedido selecionando o cliente e os produtos.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <motion.div layout className="card-ui">
                        <div className="p-4">
                            <h2 className="font-semibold text-slate-800 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-blue-600" /> Cliente</h2>
                            {!selectedCustomer ? (
                                <div className="relative mt-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar cliente por nome ou e-mail..."
                                        className="form-input pl-10 w-full"
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                    />
                                    {customerSearch && (
                                        <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                                            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                                <li key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }} className="px-4 py-2 hover:bg-slate-100 cursor-pointer">{c.first_name} {c.last_name} ({c.email})</li>
                                            )) : <li className="px-4 py-2 text-slate-500">Nenhum cliente encontrado.</li>}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                    <p className="font-medium text-blue-800">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)}><XCircle className="w-5 h-5 text-blue-600" /></Button>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Product Selection & Cart */}
                    <motion.div layout className="card-ui">
                         <div className="p-4">
                            <h2 className="font-semibold text-slate-800 flex items-center"><PackagePlus className="w-5 h-5 mr-2 text-blue-600" /> Itens da Venda</h2>
                             <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar produto por nome ou SKU..."
                                    className="form-input pl-10 w-full"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                />
                                {productSearch && (
                                    <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                                        {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                            <li key={p.id} onClick={() => addProductToCart(p)} className="px-4 py-2 hover:bg-slate-100 cursor-pointer">{p.name} ({formatCurrency(p.price)})</li>
                                        )) : <li className="px-4 py-2 text-slate-500">Nenhum produto encontrado.</li>}
                                    </ul>
                                )}
                            </div>
                            
                            <div className="mt-4 space-y-2">
                                {cart.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">O carrinho está vazio.</p>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.product_id} className="flex items-center justify-between bg-white p-2 rounded-md border">
                                            <span className="flex-1 font-medium text-slate-700">{item.name}</span>
                                            <div className="flex items-center space-x-2">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                                                    className="form-input w-16 text-center"
                                                />
                                                <span className="w-24 text-right">{formatCurrency(item.price * item.quantity)}</span>
                                                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product_id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
                
                {/* Sale Summary */}
                <div className="lg:col-span-1">
                    <div className="card-ui sticky top-24">
                        <div className="p-4">
                            <h2 className="font-semibold text-slate-800 flex items-center"><ClipboardList className="w-5 h-5 mr-2 text-blue-600" /> Resumo da Venda</h2>
                             <div className="mt-4 space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-slate-600">Total</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(total)}</span>
                                </div>
                             </div>
                             <div className="mt-6 space-y-2">
                                <Button onClick={handleFinalizeSale} disabled={isSubmitting || cart.length === 0} className="w-full">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    {isSubmitting ? 'Finalizando...' : 'Finalizar Venda'}
                                </Button>
                                <Button onClick={resetSale} variant="outline" className="w-full">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sales;