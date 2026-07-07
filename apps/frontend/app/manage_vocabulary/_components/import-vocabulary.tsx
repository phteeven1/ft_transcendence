'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';

type Props = {
  onImported: (vocabulary: Vocabulary) => void;
};

export default function ImportVocabulary({ onImported }: Props) {
  const { user, group } = useAuth();

	// States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('fr');
  const [toLanguage, setToLanguage] = useState('en');

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
  ];

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			setSelectedFile(e.target.files[0]);
		}
	};

	const handleAiExtract = async () => {
		if (!selectedFile || !user || !group) return;
		setIsExtracting(true);
		try {
      const fromLangName = LANGUAGES.find(l => l.code === fromLanguage)?.name || fromLanguage;
      const toLangName = LANGUAGES.find(l => l.code === toLanguage)?.name || toLanguage;
			const data = await vocabulariesApi.extract(selectedFile, fromLangName, toLangName);
			
			// Automatically save after extraction
			const created = await vocabulariesApi.create({
				vocabularyInGroup: group.id,
				byUser: user.id,
				vocabularyName: data.title,
				vocabularyWords: data.words,
				vocabularyMeanings: data.meanings,
			});
			
			onImported(created);
			setSelectedFile(null);
		} catch (error: any) {
			console.error("AI extraction failed", error);
			alert(error.message || "AI extraction failed. Please ensure the file has at least 5 words and try again.");
		} finally {
			setIsExtracting(false);
		}
	};

	return (
		<div className="space-y-4 p-4 border rounded-lg bg-white shadow-sm">
			<h2 className="text-lg font-semibold text-emerald-800">AI Vocabulary Import</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Language</label>
          <select 
            value={fromLanguage} 
            onChange={(e) => setFromLanguage(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Language</label>
          <select 
            value={toLanguage} 
            onChange={(e) => setToLanguage(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

			{/* 1. The File Input */}
			<input 
				type="file" 
				accept="image/*,.pdf" 
				onChange={handleFileChange}
				className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
			/>

			{/* 2. The AI Extract Button */}
			<button
				onClick={handleAiExtract}
				disabled={!selectedFile || isExtracting}
				className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
			>
				{isExtracting ? (
					<span className="flex items-center justify-center">
						{/* Simple Spinner */}
						<svg className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
						AI is reading your file...
					</span>
				) : 'Extract and Save with AI'}
			</button>
		</div>
	);
}
