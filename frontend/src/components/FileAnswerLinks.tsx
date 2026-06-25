import type { FileReference } from '../types';

interface Props {
  refs: FileReference[];
  formId: string;
  submissionId: string;
}

export function FileAnswerLinks({ refs, formId, submissionId }: Props) {
  if (refs.length === 0) return <span>—</span>;
  return (
    <span className="flex flex-col gap-1">
      {refs.map((ref) => (
        <a
          key={ref.storageKey}
          href={`/api/forms/${formId}/submissions/${submissionId}/files/${ref.storageKey}`}
          download={ref.filename}
          className="text-indigo-600 hover:underline"
        >
          {ref.filename}
        </a>
      ))}
    </span>
  );
}
