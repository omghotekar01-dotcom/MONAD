import { createFileRoute } from '@tanstack/react-router';
import { DropsPage } from '@/components/beat-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/library')({head:()=>pageHead('My library','Your saved local BEAT DROP creations, ready for another listen.'),component:()=> <DropsPage library/>});