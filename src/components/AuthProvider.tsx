import React, { createContext, useContext } from 'react';

interface AuthContextType {
  user: any;
  loading: boolean;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: { uid: 'guest', displayName: 'Guest User' }, 
  loading: false, 
  isAdmin: false,
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider value={{ 
      user: { uid: 'guest', displayName: 'Guest User' }, 
      loading: false, 
      isAdmin: false,
      logout: () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
