import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const Auth = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/app";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let error;

        if (isLogin) {
            const result = await signIn(email, password);
            error = result.error;
        } else {
            const result = await signUp(email, password, {
                data: {
                    full_name: 'Novo Usuário',
                }
            });
            error = result.error;
        }
        
        if (!error) {
            window.dispatchEvent(new Event('login-success'));
            navigate(from, { replace: true });
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="flex justify-center mb-8">
                     <img src="/lajes-tocantins-logo.jpg" alt="Lajes Tocantins Logo" className="h-20" />
                </div>

                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-xl shadow-lg border border-white">
                     <AnimatePresence mode="wait">
                        <motion.div
                            key={isLogin ? 'login' : 'signup'}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-2xl font-semibold text-center text-slate-800 mb-2">
                                {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                            </h2>
                            <p className="text-sm text-center text-slate-500 mb-6">
                                {isLogin ? 'Faça login para acessar o sistema' : 'Preencha os dados para se registrar'}
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Senha</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <Button type="submit" className="w-full save-button" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isLogin ? 'Entrar' : 'Registrar'}
                                </Button>
                            </form>
                        </motion.div>
                    </AnimatePresence>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
                        <Button
                            variant="link"
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-semibold text-blue-600 hover:text-purple-600"
                        >
                            {isLogin ? 'Registre-se' : 'Faça login'}
                        </Button>
                    </p>
                </div>

                 <div className="text-xs text-slate-500 text-center mt-8">
                    Sistema de Gerenciamento Lajes Tocantins
                </div>
            </div>
        </div>
    );
};

export default Auth;