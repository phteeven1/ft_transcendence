'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';

type Props = {
  onImported: (vocabulary: Vocabulary) => void;
};

const DUMMY_WORDS = [
  'construire',
  'élever',
  'remplir',
  'ressembler',
  'le vivarium',
  'la terre',
  "l'insecte",
  'le phasme',
  'la brindille',
  'la cour',
  'jamais',
  'dans',
];

const DUMMY_MEANINGS = [
  'to build',
  'to raise',
  'to fill',
  'to resemble',
  'the vivarium',
  'the earth / soil',
  'the insect',
  'the stick insect',
  'the twig',
  'the yard / courtyard',
  'never',
  'in / inside',
];

export default function ImportVocabulary({ onImported }: Props) {
  const { user, group } = useAuth();

	// States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
	const [extractedData, setExtractedData] = useState<{words: string[], meanings: string[]} | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			setSelectedFile(e.target.files[0]);
		}
	};

	const handleAiExtract = async () => {
		if (!selectedFile) return;
		setIsExtracting(true);
		try {
			const data = await vocabulariesApi.extract(selectedFile);
			setExtractedData(data);
		} catch (error) {
			console.error("AI extraction failed", error);
		} finally {
			setIsExtracting(false);
		}
	};

	const handleFinalSave = async () => {
		if (!user  || !group || !extractedData) return;
		try {
			const created = await vocabulariesApi.create({
				vocabularyInGroup: group.id,
				byUser: user.id,
				vocabularyName: selectedFile?.name.split('.')[0] || 'AI Generated List',
				vocabularyWords: extractedData.words,
				vocabularyMeanings: extractedData.meanings,
			});
			onImported(created);
			setExtractedData(null);
		} catch (error) {
			console.error("Saving failed", error);
		}
	};

	return (
		<div className="space-y-4 p-4 border rounded-lg bg-white shadow-sm">
			<h2 className="text-lg font-semibold text-emerald-800">AI Vocabulary Import</h2>

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
				) : 'Extract 20 Words with AI'}
			</button>
			{/* 3. The Review UI (Only shows when extractedData is not null) */}
			{extractedData && (
				<div className="mt-6 p-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-4">
					<h3 className="font-bold text-gray-700 mb-3">
						Review Extracted Words ({extractedData.words.length})
					</h3>

					<div className="max-h-60 overflow-y-auto border rounded mb-4">
						<table className="w-full text-left text-sm">
							<thead className="bg-gray-50 sticky top-0">
								<tr>
									<th className="p-2 border-b">Word</th>
									<th className="p-2 border-b">Meaning</th>
								</tr>
							</thead>
							<tbody>
								{extractedData.words.map((w, i) => (
									<tr key={i} className="hover:bg-gray-50 border-b last:border-0">
										<td className="p-2 font-medium">{w}</td>
										<td className="p-2 text-gray-600">{extractedData.meanings[i]}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<button 
						onClick={handleFinalSave} 
						className="w-full bg-emerald-600 text-white py-2 px-4 rounded font-bold hover:bg-emerald-700 transition-colors"
					>
						Confirm and Save to Group
					</button>
				</div>
			)}
		</div>
	);
}
