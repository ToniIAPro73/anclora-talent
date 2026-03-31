import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { mockEditorialProject } from './mockProject';
import { getDocumentMetrics, type EditorialProject } from './types';

interface DocumentStoreValue {
  project: EditorialProject;
  document: EditorialProject['document'];
  metrics: ReturnType<typeof getDocumentMetrics>;
  updateBlockContent: (chapterId: string, blockId: string, nextContent: string) => void;
}

const DocumentStoreContext = createContext<DocumentStoreValue | null>(null);

export function DocumentStoreProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<EditorialProject>(mockEditorialProject);

  const value = useMemo<DocumentStoreValue>(() => {
    const document = project.document;

    return {
      project,
      document,
      metrics: getDocumentMetrics(document),
      updateBlockContent: (chapterId, blockId, nextContent) => {
        setProject((currentProject) => ({
          ...currentProject,
          document: {
            ...currentProject.document,
            chapters: currentProject.document.chapters.map((chapter) => {
              if (chapter.id !== chapterId) {
                return chapter;
              }

              return {
                ...chapter,
                blocks: chapter.blocks.map((block) => {
                  if (block.id !== blockId) {
                    return block;
                  }

                  if (block.type === 'image' || block.type === 'divider') {
                    return block;
                  }

                  return {
                    ...block,
                    content: nextContent,
                  };
                }),
              };
            }),
          },
        }));
      },
    };
  }, [project]);

  return <DocumentStoreContext.Provider value={value}>{children}</DocumentStoreContext.Provider>;
}

export function useDocumentStore() {
  const context = useContext(DocumentStoreContext);

  if (!context) {
    throw new Error('useDocumentStore must be used inside DocumentStoreProvider');
  }

  return context;
}
