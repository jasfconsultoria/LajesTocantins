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
    setActiveCompany(null);

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

  const value = useMemo(() => ({
    user,
    session,
    role,
    loading,
    activeCompany,
    signUp,
    signIn,
    signOut,
  }), [user, session, role, loading, activeCompany, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};