import { DirectorApp } from '@/director/DirectorApp';
import {
  createApartmentProject,
  APARTMENT_SCOPE,
  APARTMENT_EDITOR,
  APARTMENT_NOTE,
} from '@/director/presets/apartment';

export default function ApartmentPage() {
  return (
    <DirectorApp
      initialProject={createApartmentProject()}
      storageScope={APARTMENT_SCOPE}
      editorView={APARTMENT_EDITOR}
      note={APARTMENT_NOTE}
    />
  );
}
