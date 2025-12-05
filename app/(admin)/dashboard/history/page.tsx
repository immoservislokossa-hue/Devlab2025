'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, 
  Database, 
  CheckCircle, 
  Clock,
  BarChart3,
  FileText,
  Users,
  Percent,
  ArrowUpRight,
  Activity
} from 'lucide-react';

interface HistoriqueResume {
  id: string;
  bulk_id: string;
  created_at: string;
  filename: string | null;
  total_lignes: number;
  nb_succes: number;
  nb_echecs_tech: number;
  nb_invalides: number;
  taux_succes: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HistoriqueFintech() {
  const [historiques, setHistoriques] = useState<HistoriqueResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTransfers: 0,
    totalSuccess: 0,
    averageRate: 0,
    todayTransfers: 0,
    totalBatches: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('historique_resumes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setHistoriques(data);
        calculateStats(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: HistoriqueResume[]) => {
    const totalTransfers = data.reduce((sum, item) => sum + item.total_lignes, 0);
    const totalSuccess = data.reduce((sum, item) => sum + item.nb_succes, 0);
    const averageRate = data.length > 0 
      ? data.reduce((sum, item) => sum + item.taux_succes, 0) / data.length 
      : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const todayTransfers = data
      .filter(item => item.created_at.startsWith(today))
      .reduce((sum, item) => sum + item.total_lignes, 0);

    setStats({
      totalTransfers,
      totalSuccess,
      averageRate: parseFloat(averageRate.toFixed(1)),
      todayTransfers,
      totalBatches: data.length
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
Historiques
          </h1>
          <p className="text-slate-600 mt-2">Suivi des transferts en masse XOF</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-lg shadow-blue-100/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.totalTransfers.toLocaleString()} <span className="text-blue-600"></span>
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Users className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-slate-500">{stats.totalBatches} batchs</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-lg shadow-emerald-100/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Taux de Succès</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.averageRate}%
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                  style={{ width: `${Math.min(stats.averageRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-cyan-100 shadow-lg shadow-cyan-100/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Transactions Réussies</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.totalSuccess.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-50 text-cyan-700">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                {((stats.totalSuccess / Math.max(stats.totalTransfers, 1)) * 100).toFixed(1)}% de succès
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-lg shadow-amber-100/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Transferts Aujourd'hui</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.todayTransfers.toLocaleString()} <span className="text-blue-600"></span>
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-slate-500">
              <Clock className="w-4 h-4 mr-2" />
              <span>Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Historique des Transferts
              <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {historiques.length} batchs
              </span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <tr>
                  <th className="p-4 text-left text-slate-700 font-semibold">Batch ID</th>
                  <th className="p-4 text-left text-slate-700 font-semibold">Date</th>
                  <th className="p-4 text-left text-slate-700 font-semibold">Total Lignes</th>
                  <th className="p-4 text-left text-slate-700 font-semibold">Succès</th>
                  <th className="p-4 text-left text-slate-700 font-semibold">Taux</th>
                  <th className="p-4 text-left text-slate-700 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {historiques.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-sm font-medium text-blue-900">
                        {item.bulk_id}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">
                      {new Date(item.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{item.total_lignes}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-bold text-slate-900">{item.nb_succes}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${
                          item.taux_succes >= 95 ? 'text-emerald-600' :
                          item.taux_succes >= 90 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {item.taux_succes}%
                        </span>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              item.taux_succes >= 95 ? 'bg-emerald-500' :
                              item.taux_succes >= 90 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.taux_succes}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        item.taux_succes >= 95 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.taux_succes >= 90 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.taux_succes >= 95 ? 'Excellent' : 
                         item.taux_succes >= 90 ? 'Bon' : 'À améliorer'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Dernière actualisation: {new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    </div>
  );
}