import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { session } = useAuth();
  const [isWooConnected, setIsWooConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [appVersion, setAppVersion] = useState('1.0.0');

  const fetchAppVersion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('version')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      if (data) {
        setAppVersion(data.version);
      }
    } catch (error) {
      console.error("Error fetching app version:", error.message);
    }
  }, []);

  const checkWooCommerceConnection = useCallback(async () => {
    if (!session) {
      setIsCheckingConnection(false);
      return;
    }
    
    setIsCheckingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-woo-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ test_connection: true }), 
      });

      if (error) throw error;
      if (data.error && !data.message?.includes("No new orders")) {
          throw new Error(data.error);
      }
      
      setIsWooConnected(true);

    } catch (e) {
      console.error("WooCommerce connection check failed:", e);
      setIsWooConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  }, [session]);

  useEffect(() => {
    checkWooCommerceConnection();
    fetchAppVersion();
  }, [checkWooCommerceConnection, fetchAppVersion]);

  const value = {
    isWooConnected,
    setIsWooConnected,
    isCheckingConnection,
    refreshWooConnection: checkWooCommerceConnection,
    appVersion,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};