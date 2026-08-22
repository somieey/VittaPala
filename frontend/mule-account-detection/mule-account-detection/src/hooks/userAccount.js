import { useCallback, useEffect, useState } from "react";
import {
  getAccountById,
  getTransactions,
  getRiskScore,
  investigateAccount,
} from "../services/api";

function useAccount(accountId) {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [risk, setRisk] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Load Account
  |--------------------------------------------------------------------------
  */

  const loadAccount = useCallback(async () => {
    if (!accountId) {
      setAccount(null);
      setTransactions([]);
      setRisk(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result =
        await investigateAccount(accountId);

      if (!result) {
        throw new Error(
          "Account not found."
        );
      }

      setAccount(result.account || null);

      setTransactions(
        result.transactions || []
      );

      setRisk(result.risk || null);
    } catch (err) {
      console.error(
        "Failed to load account:",
        err
      );

      setError(
        err.message ||
          "Unable to load account information."
      );
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  /*
  |--------------------------------------------------------------------------
  | Refresh Account
  |--------------------------------------------------------------------------
  */

  const refresh = useCallback(async () => {
    await loadAccount();
  }, [loadAccount]);

  /*
  |--------------------------------------------------------------------------
  | Load Account on ID Change
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Only Risk
  |--------------------------------------------------------------------------
  */

  const refreshRisk = useCallback(async () => {
    if (!accountId) {
      return;
    }

    try {
      const riskData =
        await getRiskScore(accountId);

      setRisk(riskData);
    } catch (err) {
      console.error(
        "Failed to load risk score:",
        err
      );

      setError(
        err.message ||
          "Unable to load risk information."
      );
    }
  }, [accountId]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Only Transactions
  |--------------------------------------------------------------------------
  */

  const refreshTransactions =
    useCallback(async () => {
      if (!accountId) {
        return;
      }

      try {
        const transactionData =
          await getTransactions(accountId);

        setTransactions(
          transactionData || []
        );
      } catch (err) {
        console.error(
          "Failed to load transactions:",
          err
        );

        setError(
          err.message ||
            "Unable to load transaction history."
        );
      }
    }, [accountId]);

  /*
  |--------------------------------------------------------------------------
  | Return Hook State
  |--------------------------------------------------------------------------
  */

  return {
    account,

    transactions,

    risk,

    loading,

    error,

    refresh,

    refreshRisk,

    refreshTransactions,
  };
}

export default useAccount;