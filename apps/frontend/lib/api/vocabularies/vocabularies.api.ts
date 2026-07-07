import { apiRequest } from '../http';
import type {
  CreateVocabularyInput,
  ExtractVocabularyResult,
  RemoveVocabularyInput,
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

  remove(input: RemoveVocabularyInput): Promise<boolean> {
    return apiRequest<boolean>('/vocabularies/remove', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async extract(
    file: File,
    fromLanguage: string,
    toLanguage: string,
  ): Promise<ExtractVocabularyResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fromLanguage', fromLanguage);
    formData.append('toLanguage', toLanguage);

    const response = await fetch(`${getApiBaseUrl()}/vocabularies/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let message = 'Failed to extract vocabulary';
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText) as { message?: string | string[] };
        const backendMessage = errorData.message;
        if (typeof backendMessage === 'string') {
          message = backendMessage;
        } else if (Array.isArray(backendMessage)) {
          message = backendMessage.join(', ');
        }
      } catch {
        if (errorText) message = errorText;
      }
      console.error('Backend extraction error:', message);
      throw new Error(message);
    }
    return response.json();
  },
};
