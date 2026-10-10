import { createFileRoute } from '@tanstack/react-router';
import { DropsPage } from '@/components/beat-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/drops')({head:()=>pageHead('Recent drops','Discover and play fresh BEAT DROP loops from the sample collection.'),component:()=> <DropsPage/>});