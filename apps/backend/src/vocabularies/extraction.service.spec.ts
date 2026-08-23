import { ExtractionService, sniffUploadKind } from './extraction.service';

function padHeader(bytes: number[]): Uint8Array {
  const header = new Uint8Array(12);
  header.set(bytes);
  return header;
}

function fakeUpload(
  buffer: Buffer,
  originalname = 'file.bin',
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: buffer.length,
    destination: '',
    filename: originalname,
    path: '',
    buffer,
    stream: undefined as never,
  };
}

describe('sniffUploadKind', () => {
  it('detects PNG, JPEG, GIF, WebP, and PDF headers', () => {
    expect(sniffUploadKind(padHeader([0x89, 0x50, 0x4e, 0x47]))).toBe('png');
    expect(sniffUploadKind(padHeader([0xff, 0xd8, 0xff]))).toBe('jpeg');
    expect(sniffUploadKind(padHeader([0x47, 0x49, 0x46, 0x38]))).toBe('gif');
    expect(
      sniffUploadKind(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toBe('webp');
    expect(sniffUploadKind(padHeader([0x25, 0x50, 0x44, 0x46]))).toBe('pdf');
  });

  it('rejects HEIC-like ftyp bytes and short buffers', () => {
    expect(
      sniffUploadKind(
        new Uint8Array([
          0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69,
          0x63,
        ]),
      ),
    ).toBeNull();
    expect(sniffUploadKind(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

describe('ExtractionService.extractVocab', () => {
  const configService = { get: jest.fn() };
  let service: ExtractionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExtractionService(configService as never);
  });

  it('returns EMPTY_FILE without needing OpenAI', async () => {
    const result = await service.extractVocab(fakeUpload(Buffer.alloc(0)));

    expect(result).toEqual({ success: false, code: 'EMPTY_FILE' });
    expect(configService.get).not.toHaveBeenCalled();
  });

  it('returns UNSUPPORTED_FILE_TYPE without needing OpenAI', async () => {
    const result = await service.extractVocab(
      fakeUpload(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    );

    expect(result).toEqual({ success: false, code: 'UNSUPPORTED_FILE_TYPE' });
    expect(configService.get).not.toHaveBeenCalled();
  });
});
