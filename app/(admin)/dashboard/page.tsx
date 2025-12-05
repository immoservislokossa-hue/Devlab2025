


"use client";

import Image from "next/image";
import Link from "next/link";

export default function DashboardHome() {
  return (
    <main className="min-h-screen p-10 bg-white flex flex-col items-center justify-center">

      {/* Grande image d'accueil */}
      <div className="flex flex-col items-center text-center">
        <Image
          src="/girl.png"
          alt="welcome"
          width={620}
          height={620}
          className="drop-shadow-xl rounded-lg"
        />

        <h1 className="mt-6 text-4xl font-bold text-gray-800">
          Bienvenue sur PensiPay
        </h1>

        <p className="mt-2 text-gray-500 text-lg max-w-xl">
          Votre tableau de bord   pour gérer vos paiements et consulter
          toute votre activité.
        </p>
      </div>

      {/* Boutons */}
      <div className="mt-10 flex gap-6">
        <Link
          href="/dashboard/pay"
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl shadow-md hover:bg-blue-700 transition"
        >
          Faire un paiement
        </Link>

        <Link
          href="/dashboard/history"
          className="px-8 py-4 bg-gray-900 text-white rounded-2xl shadow-md hover:bg-black transition"
        >
          Voir l’historique
        </Link>
      </div>

    </main>
  );
}
