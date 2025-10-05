import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
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

  useEffect(() => {
    fetchAppVersion();
  }, [fetchAppVersion]);

  const value = {
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