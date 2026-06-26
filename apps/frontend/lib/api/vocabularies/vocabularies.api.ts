import { apiRequest } from '../http';
import type {
  CreateVocabularyInput,
  RemoveVocabularyInput,
  RenameVocabularyInput,
  SetActiveVocabularyInput,
  UpdateVocabularyEntriesInput,
  VocabularyDto,
} from './types';

export const vocabulariesApi = {
  create(input: CreateVocabularyInput): Promise<VocabularyDto> {
    return apiRequest<VocabularyDto>('/vocabularies/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getById(vocabularyId: number): Promise<VocabularyDto> {
    return apiRequest<VocabularyDto>(`/vocabularies/${vocabularyId}`);
  },

  findByGroup(groupId: number): Promise<VocabularyDto[]> {
    return apiRequest<VocabularyDto[]>(`/vocabularies/group/${groupId}`);
  },

  setActive(input: SetActiveVocabularyInput): Promise<VocabularyDto> {
    return apiRequest<VocabularyDto>('/vocabularies/setActive', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  rename(input: RenameVocabularyInput): Promise<VocabularyDto> {
    return apiRequest<VocabularyDto>('/vocabularies/rename', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateEntries(input: UpdateVocabularyEntriesInput): Promise<VocabularyDto> {
    return apiRequest<VocabularyDto>('/vocabularies/update-entries', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  remove(input: RemoveVocabularyInput): Promise<boolean> {
    return apiRequest<boolean>('/vocabularies/remove', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};