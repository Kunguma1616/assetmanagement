import { useState, useEffect } from 'react';

interface UserData {
  name: string;
  email: string;
  session: string;
  trade: string; // "ALL" = no restriction, else specific trade like "LDR"
}

export const useUserTrade = () => {
  const [userTrade, setUserTrade] = useState<string>('ALL');
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const userDataJson = sessionStorage.getItem('user_data');
      if (userDataJson) {
        const userData: UserData = JSON.parse(userDataJson);
        const trade = userData.trade || 'ALL';
        setUserTrade(trade);
        setUserName(userData.name || null);
        console.log(`✅ useUserTrade: Loaded ${userData.name} | Trade: ${trade}`);
      } else {
        console.warn('⚠️ useUserTrade: No user_data in sessionStorage');
        setUserTrade('ALL');
      }
    } catch (error) {
      console.error('❌ useUserTrade: Parse error:', error);
      setUserTrade('ALL');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Returns true if should show all data (user has no trade restriction)
  const showsAllTrades = () => {
    return userTrade === 'ALL' || userTrade === null || !userTrade;
  };

  // Returns true if given trade matches user's restricted trade
  const canViewTrade = (itemTrade: string | null | undefined): boolean => {
    if (showsAllTrades()) return true;
    if (!itemTrade) return false;
    return itemTrade === userTrade;
  };

  return {
    userTrade,
    userName,
    isLoading,
    showsAllTrades,
    canViewTrade,
  };
};
