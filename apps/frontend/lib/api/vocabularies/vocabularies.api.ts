import { apiRequest } from '../http';
import type {
  CreateVocabularyInput,
  RenameVocabularyInput,
  SetActiveVocabularyInput,
  UpdateVocabularyEntriesInput,
  VocabularyDto,
} from './types';
import { getApiBaseUrl } from '../config';

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

  remove(vocabularyId: number): Promise<VocabularyDto | boolean> {
    return apiRequest('/vocabularies/remove', {
      method: 'POST',
      body: JSON.stringify({ vocabularyId }),
    });
  },

	async extract(file: File): Promise<{ words: string[], meanings: string[] }> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch(`${getApiBaseUrl()}/vocabularies/extract`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error('Backend extraction error:', errorData);
			throw new Error('Failed to extract vocabulary: ' + errorData);
		}
		return response.json();
	}
};
