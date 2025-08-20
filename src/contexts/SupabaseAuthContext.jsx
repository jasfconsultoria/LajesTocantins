import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState(null);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    setActiveCompany(null); // Reset active company on session change

    if (currentUser) {
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', currentUser.id)
          .single();
        
        if (roleError) throw roleError;
        setRole(roleData?.roles?.name || 'user');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('default_emitente_id')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) throw profileError;

        if (profile && profile.default_emitente_id) {
          const { data: company, error: companyError } = await supabase
            .from('emitente')
            .select('id, razao_social, logo_sistema_url')
            .eq('id', profile.default_emitente_id)
            .single();
          
          if (companyError) throw companyError;
          setActiveCompany(company);
        } else {
          // If no default company, try to set the first associated company as default
          const { data: associatedCompanies, error: assocError } = await supabase.functions.invoke('get-all-companies');
          if (assocError) throw assocError;

          if (associatedCompanies && associatedCompanies.length > 0) {
            const firstCompany = associatedCompanies[0];
            await supabase.from('profiles').update({ default_emitente_id: firstCompany.id }).eq('id', currentUser.id);
            setActiveCompany(firstCompany);
          }
        }

      } catch (error) {
        console.error("Error fetching user role or company:", error.message);
        setRole('user');
      }
    } else {
      setRole(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    handleSession(null);

    if (error) {
      if (!error.message.includes('User from sub claim in JWT does not exist')) {
        toast({
          variant: "destructive",
          title: "Sign out Failed",
          description: error.message || "Something went wrong",
        });
      }
    }

    return { error };
  }, [toast, handleSession]);

  const setActiveCompany = useCallback(async (companyId) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ default_emitente_id: companyId })
        .eq('id', user.id);

      if (error) throw error;

      const { data: company, error: companyError } = await supabase
        .from('emitente')
        .select('id, razao_social, logo_sistema_url')
        .eq('id', companyId)
        .single();
      
      if (companyError) throw companyError;
      setActiveCompany(company);
      toast({ title: "Empresa ativa alterada!", description: `Agora você está gerenciando ${company.razao_social}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao mudar empresa", description: error.message });
    }
  }, [user, toast]);

  const value = useMemo(() => ({
    user,
    session,
    role,
    loading,
    activeCompany,
    signUp,
    signIn,
    signOut,
    setActiveCompany,
  }), [user, session, role, loading, activeCompany, signUp, signIn, signOut, setActiveCompany]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};