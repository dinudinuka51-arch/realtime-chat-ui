import { useState, useEffect } from 'react';

const INITIAL_BALANCE = 10000;
const STORAGE_KEY = 'roman_game_wallet';

export const useGameWallet = () => {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : INITIAL_BALANCE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, balance.toString());
  }, [balance]);

  const addBalance = (amount: number) => {
    setBalance(prev => prev + amount);
  };

  const deductBalance = (amount: number): boolean => {
    if (balance >= amount) {
      setBalance(prev => prev - amount);
      return true;
    }
    return false;
  };

  const resetBalance = () => {
    setBalance(INITIAL_BALANCE);
  };

  return { balance, addBalance, deductBalance, resetBalance };
};
