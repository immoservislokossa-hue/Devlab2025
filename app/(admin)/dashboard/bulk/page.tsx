"use client";

import { useState, FormEvent, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import ChatbotInterface from '../ChatbotInterfaces';

export default function FileUploadInterface() {
  const [showChoiceModal, setShowChoiceModal] = useState(true);
  const [mode, setMode] = useState<'manual' | 'chatbot' | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const chooseManual = () => {
    setMode('manual');
    setShowChoiceModal(false);
  };

  const chooseChatbot = () => {
    setMode('chatbot');
    setShowChoiceModal(false);
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem('file') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setUploadMessage('Veuillez sélectionner un fichier CSV.');
      setUploadStatus('error');
      return;
    }
    handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    setUploadStatus('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 10, 90));
      }, 400);

      const response = await fetch('http://20.199.136.163:5001/upload-csv', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (!response.ok) throw new Error('Erreur serveur');

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('zip')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      setUploadStatus('success');
      setUploadMessage('Traitement terminé. Le rapport a été téléchargé.');
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage('Échec du traitement.');
    }
  };

  return (
    <main className="min-h-screen p-8">
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              Voulez-vous traiter les pensions manuellement ou passer par l'assistant intelligent ?
            </h2>

            <div className="flex flex-col gap-4">
              <button
                onClick={chooseManual}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Traiter manuellement
              </button>
              <button
                onClick={chooseChatbot}
                className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-black transition"
              >
                Via l'assistant chatbot
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {mode === 'chatbot' && <ChatbotInterface />}

        {mode === 'manual' && (
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Traitement CSV manuel</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                onClick={openFileSelector}
                className="cursor-pointer border-2 border-dashed border-blue-300 p-8 rounded-xl text-center hover:bg-blue-50"
              >
                <FileText className="w-10 h-10 mx-auto text-blue-600" />
                <p className="mt-3 font-semibold text-gray-800">{fileName || 'Sélectionner un fichier CSV'}</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />

              {uploadStatus === 'uploading' && (
                <div className="w-full bg-blue-200 h-2 rounded-full">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <button
                type="submit"
                disabled={!fileName || uploadStatus === 'uploading'}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                Traiter le fichier CSV
              </button>
            </form>

            {uploadMessage && (
              <div className="mt-4 p-4 rounded-xl border flex items-start gap-2">
                {uploadStatus === 'error' ? (
                  <AlertCircle className="text-red-600 w-6 h-6" />
                ) : (
                  <CheckCircle className="text-green-600 w-6 h-6" />
                )}
                <p>{uploadMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
