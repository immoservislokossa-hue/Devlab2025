"use client";

import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Wallet, TrendingUp } from "lucide-react";

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Transaction = {
  retraite_id: string;
  numero: number | null;
  user_id: string;
  identifiant_partie: string | null;
  Valide: boolean | null;
  transfer_id: string | null;
  payee_id_value: string | null;
  amount: number | null;
  transfer_date: string | null;
};

export default function DashboardTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const userId = user.user.id;

      // Requête sur la vue retraites_transactions
      const { data, error } = await supabase
        .from("retraites_transactions")
        .select("*")
        .eq("user_id", userId);

      if (error) console.error("Erreur Supabase:", error);
      else setTransactions(data as Transaction[]);
    } catch (err) {
      console.error("Erreur fetchTransactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalAmount = transactions.reduce(
    (acc, tx) => acc + (tx.amount ?? 0),
    0
  );
  const totalTransactions = transactions.length;

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-blue-600 text-xl font-bold">
        Chargement...
      </div>
    );

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">
        Dashboard Transactions
      </h1>

      {/* Cartes résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-600 flex items-center space-x-4 hover:scale-105 transition-transform">
          <Wallet className="text-blue-600 w-8 h-8" />
          <div>
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-600">{totalTransactions}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-600 flex items-center space-x-4 hover:scale-105 transition-transform">
          <TrendingUp className="text-blue-600 w-8 h-8" />
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalAmount.toFixed(2)} €
            </p>
          </div>
        </div>
        
      </div>

      {/* Tableau ou message vide */}
      {totalTransactions === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center text-blue-600 space-y-4">
          <div className="text-6xl">💸</div>
          <p className="text-xl font-semibold">Aucune transaction pour le moment</p>
          <p className="text-gray-500">Commencez à effectuer des transactions pour les voir ici.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-blue-200">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Retraite ID</th>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Numéro</th>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Transfer ID</th>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Payee ID</th>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Montant</th>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Date</th>
                <th className="px-6 py-3 text-left text-blue-600 font-medium text-sm">Valide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-200">
              {transactions.map((tx) => (
                <tr key={tx.retraite_id + (tx.transfer_id ?? "null")} className="hover:bg-blue-50">
                  <td className="px-6 py-3">{tx.retraite_id}</td>
                  <td className="px-6 py-3">{tx.numero ?? "-"}</td>
                  <td className="px-6 py-3">{tx.transfer_id ?? "-"}</td>
                  <td className="px-6 py-3">{tx.payee_id_value ?? "-"}</td>
                  <td className="px-6 py-3">{tx.amount !== null ? tx.amount.toFixed(2) + " €" : "-"}</td>
                  <td className="px-6 py-3">
                    {tx.transfer_date ? new Date(tx.transfer_date).toLocaleString() : "-"}
                  </td>
                  <td className="px-6 py-3">{tx.Valide ? "Oui" : "Non"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
