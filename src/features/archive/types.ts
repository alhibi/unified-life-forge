export type ArchiveDepth = 'standard' | 'deep' | 'deepest';

export interface ArchiveSubsection {
  id: string;
  title: string;
  angle: string;
  targetWords?: number;
}
export interface ArchiveSection {
  id: string;
  title: string;
  dimension?: string;
  subsections: ArchiveSubsection[];
}
export interface ArchiveOutline {
  title: string;
  synopsis: string;
  sections: ArchiveSection[];
}

export interface ArchiveDocumentSummary {
  id: string;
  accession_number: number;
  title: string;
  abstract: string;
  tags: string[];
  depth: ArchiveDepth;
  word_count: number;
  created_at: string;
}

export interface ArchiveDocument extends ArchiveDocumentSummary {
  topic: string;
  complexity: string;
  content: string;
  outline: ArchiveOutline;
  updated_at: string;
}

export type ProgressEvent =
  | { stage: 'outline'; message: string }
  | { stage: 'outline_done'; outline: ArchiveOutline }
  | { stage: 'expansion'; message: string; current: number; total: number }
  | { stage: 'synthesis'; message: string }
  | { stage: 'filed'; document: { id: string; accession_number: number; title: string; word_count: number } }
  | { stage: 'error'; message: string };