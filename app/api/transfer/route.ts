import { NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://20.199.136.163:5000/transfer-single';
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

interface TransferRequestBody {
  id: string;
  amount: number | string;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Récupération et validation des données
    const body: TransferRequestBody = await request.json();

    if (!body.id?.trim() || !body.amount) {
      return NextResponse.json(
        { error: 'Les champs ID et Montant sont obligatoires.' },
        { status: 400 }
      );
    }

    const amount = parseFloat(String(body.amount));
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être un nombre positif.' },
        { status: 400 }
      );
    }

    // 2. Configuration de la requête avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // 3. Transfert vers l'API Python
    const res = await fetch(PYTHON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
      },
      body: JSON.stringify({
        id: body.id.trim(),
        montant: amount,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. Traitement de la réponse
    const data = await res.json();
    const responseTime = Date.now() - startTime;

    console.log(
      `Transfert traité - ID: ${body.id}, Montant: ${amount}, Temps: ${responseTime}ms, Statut: ${res.status}`
    );

    // 5. Renvoi de la réponse
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'X-Response-Time': `${responseTime}ms`,
      },
    });

  } catch (error: unknown) {
    console.error('Erreur API Route:', error);

    // Vérifie si l'erreur est une instance d'Error et gère AbortError
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Le serveur de paiement ne répond pas dans le délai imparti.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Impossible de contacter le serveur de paiement.' },
      { status: 500 }
    );
  }
}
