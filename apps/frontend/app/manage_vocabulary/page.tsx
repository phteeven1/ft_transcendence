'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { Vocabulary } from '../types';
import VocabularyList from './_components/vocabulary-list';
import ImportVocabulary from './_components/import-vocabulary';
import RenameVocabulary from './_components/rename-vocabulary';
import EditVocabulary from './_components/edit-vocabulary';
import ShareVocabulary from './_components/share-vocabulary';
import DeleteVocabulary from './_components/delete-vocabulary';
import UseInGames from './_components/use-in-games';

export default function ManageVocabulary() {
  const { user, group } = useAuth();
  const router = useRouter();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [selectedVocabulary, setSelectedVocabulary] = useState<Vocabulary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !group) {
      router.push('/');
      return;
    }
    fetchVocabularies();
  }, []);

  const fetchVocabularies = async () => {
    if (!group) return;
    try {
      const res = await fetch(
        `http://localhost:4000/vocabularies/group/${group.groupId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch vocabularies: ${res.status}`);
      const data: Vocabulary[] = await res.json();
      setVocabularies(data);
    } catch (error) {
      console.error('fetchVocabularies failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (vocabulary: Vocabulary) => {
    setSelectedVocabulary(prev =>
      prev?.vocabularyId === vocabulary.vocabularyId ? null : vocabulary
    );
  };

  const handleActivated = (updated: Vocabulary) => {
    // Set all to inactive, then set the updated one to active
    setVocabularies(prev =>
      prev.map(v => ({
        ...v,
        isCurrent: v.vocabularyId === updated.vocabularyId,
      }))
    );
    setSelectedVocabulary(updated);
  };

  if (!user || !group) return null;

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">{group.groupName}</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">Manage Vocabulary</p>

        <div className="md:grid md:grid-cols-3 gap-6">
          {/* Vocabulary list */}
          <div className="col-span-1 mb-6 md:mb-0">
            <h2 className="text-lg font-semibold mb-2">Vocabularies</h2>
            <VocabularyList
              vocabularies={vocabularies}
              selectedVocabulary={selectedVocabulary}
              isLoading={isLoading}
              onSelect={handleSelect}
            />
          </div>

          {/* Action buttons */}
          <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
            <ImportVocabulary />
            <UseInGames
              selectedVocabulary={selectedVocabulary}
              onActivated={handleActivated}
            />
            <RenameVocabulary selectedVocabulary={selectedVocabulary} />
            <EditVocabulary selectedVocabulary={selectedVocabulary} />
            <ShareVocabulary selectedVocabulary={selectedVocabulary} />
            <DeleteVocabulary selectedVocabulary={selectedVocabulary} />
            <button
              onClick={() => router.push('/manage_group')}
              className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
            >
              Back to Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}