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
  const [activeCompany, setActiveCompany] = useState(null); // This is the state setter

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    setActiveCompany(null); // Reset active company initially

    if (currentUser) {
      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', currentUser.id)
          .single();
        
        if (roleError) throw roleError;
        setRole(roleData?.roles?.name || 'user');

        // Fetch user profile to get default_emitente_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('default_emitente_id')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) throw profileError;

        let companyToSet = null;

        if (profile && profile.default_emitente_id) {
          // Try to fetch the default company
          const { data: defaultCompanyData, error: defaultCompanyError } = await supabase
            .from('emitente')
            .select('id, razao_social, logo_sistema_url')
            .eq('id', profile.default_emitente_id)
            .limit(1); // Changed from .single()
          
          if (defaultCompanyError) throw defaultCompanyError;

          if (defaultCompanyData && defaultCompanyData.length > 0) {
            companyToSet = defaultCompanyData[0];
          }
        }

        // If no default company was found/set, or if default_emitente_id was null,
        // try to set the first associated company as default
        if (!companyToSet) {
          const { data: associatedCompanies, error: assocError } = await supabase.functions.invoke('get-all-companies');
          if (assocError) throw assocError;

          if (associatedCompanies && associatedCompanies.length > 0) {
            const firstCompany = associatedCompanies[0];
            // Only update if there's no default_emitente_id or if the previous one was invalid
            if (!profile?.default_emitente_id || (profile.default_emitente_id && !companyToSet)) {
                await supabase.from('profiles').update({ default_emitente_id: firstCompany.id }).eq('id', currentUser.id);
            }
            companyToSet = firstCompany;
          }
        }
        
        setActiveCompany(companyToSet);

      } catch (error) {
        console.error("Error fetching user role or company:", error.message);
        setRole('user');
        setActiveCompany(null); // Ensure activeCompany is null on error
      }
    } else {
      setRole(null);
      setActiveCompany(null);
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

  // Renamed to updateActiveCompany to avoid conflict
  const updateActiveCompany = useCallback(async (companyId) => {
    if (!user) return;
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('emitente')
        .select('id, razao_social, logo_sistema_url')
        .eq('id', companyId)
        .limit(1); // Changed from .single()
      
      if (companyError) throw companyError;

      if (companyData && companyData.length > 0) {
        setActiveCompany(companyData[0]); // Use the state setter here
        toast({ title: "Empresa ativa alterada!", description: `Agora você está gerenciando ${companyData[0].razao_social}.` });
      } else {
        setActiveCompany(null); // If company not found after update, clear active company
        toast({ variant: "destructive", title: "Erro ao mudar empresa", description: "Empresa selecionada não encontrada ou acessível." });
      }
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
    setActiveCompany: updateActiveCompany, // Expose the new function
  }), [user, session, role, loading, activeCompany, signUp, signIn, signOut, updateActiveCompany]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};