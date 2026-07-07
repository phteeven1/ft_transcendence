'use client';

/*
this is the layout structure to manage vocabularies. It fetches once on mount, then manages everything locally
via callbacks. Optimistic UI pattern. Assumes that it is not so important or likely if two admins happen
to work on the same vocabulary list at the same time. State will be updated at next call to manage_vocabulary.
Child components handle their own modals/logic and report back via onXxx props. Three states:
vocabularies: is the full list fetched from backend.
selectedVocabulary: whichever the user has clicked or null.
isLoading: shows loading state while fetching.
*/

import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../types';
import VocabularyList from './_components/vocabulary-list';
import ImportVocabulary from './_components/import-vocabulary';
import RenameVocabulary from './_components/rename-vocabulary';
import EditVocabulary from './_components/edit-vocabulary';
import ShareVocabulary from './_components/share-vocabulary';
import DeleteVocabulary from './_components/delete-vocabulary';
import UseInGames from './_components/use-in-games';
import { PageShell } from '../components/ui/page-shell';
import { Button } from '../components/ui/button';

export default function ManageVocabulary() {
  const { user, group, syncGroup } = useAuth();
  const router = useRouter();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [selectedVocabulary, setSelectedVocabulary] =
    useState<Vocabulary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !group) {
      router.push('/');
      return;
    }
    fetchVocabularies();
  }, []);

  // guards against no group. fetches only the vocabularies belonging to current group
  // displays eventual error, then closes state isLoading regardless of success or failure
  const fetchVocabularies = async () => {
    if (!group) return;
    try {
      const data = await vocabulariesApi.findByGroup(group.id);
      setVocabularies(data);
    } catch (error) {
      console.error('fetchVocabularies failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // toggle. If already selected -> null, if not selected -> select it
  const handleSelect = (vocabulary: Vocabulary) => {
    setSelectedVocabulary((prev) =>
      prev?.id === vocabulary.id ? null : vocabulary,
    );
  };

  // updates currentVocabulary on group
  const handleActivated = (updated: Vocabulary) => {
    if (group) syncGroup(group.id);
    setSelectedVocabulary(updated);
  };

  // appends a new vocabulary to the list
  const handleImported = (vocabulary: Vocabulary) => {
    setVocabularies((prev) => [...prev, vocabulary]);
  };

  // maps over list and replaces matching entry id, also updates selectedVocabulary
  const handleRenamed = (updated: Vocabulary) => {
    setVocabularies((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v)),
    );
    setSelectedVocabulary(updated);
  };

  // filters out deleted entry by id, then clears selection
  const handleDeleted = (vocabularyId: number) => {
    setVocabularies((prev) => prev.filter((v) => v.id !== vocabularyId));
    setSelectedVocabulary(null);
    if (group && vocabularyId === group.currentVocabulary) syncGroup(group.id);
  };

  // maps over list and replaces matching entry id, also updates selectedVocabulary
  const handleEdited = (updated: Vocabulary) => {
    setVocabularies((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v)),
    );
    setSelectedVocabulary(updated);
  };

  if (!user || !group) return null;

  return (
    <PageShell>
      <h1 className="font-heading text-2xl font-bold mb-2 text-center text-foreground">
        {group.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        Manage Vocabulary
      </p>

      <div className="md:grid md:grid-cols-3 gap-6">
        <div className="col-span-1 mb-6 md:mb-0">
          <h2 className="font-heading text-lg font-semibold mb-2 text-foreground">
            Vocabularies
          </h2>
          <VocabularyList
            vocabularies={vocabularies}
            selectedVocabulary={selectedVocabulary}
            currentVocabulary={group.currentVocabulary}
            isLoading={isLoading}
            onSelect={handleSelect}
          />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
          <ImportVocabulary onImported={handleImported} />
          <UseInGames
            selectedVocabulary={selectedVocabulary}
            onActivated={handleActivated}
          />
          <RenameVocabulary
            selectedVocabulary={selectedVocabulary}
            onRenamed={handleRenamed}
          />
          <EditVocabulary
            selectedVocabulary={selectedVocabulary}
            onEdited={handleEdited}
          />
          <ShareVocabulary selectedVocabulary={selectedVocabulary} />
          <DeleteVocabulary
            selectedVocabulary={selectedVocabulary}
            onDeleted={handleDeleted}
          />
          <Button
            variant="ghost"
            fullWidth
            className="clay-action-btn"
            onClick={() => router.push('/manage_group')}
          >
            Back to Group
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
