import { createFileRoute } from '@tanstack/react-router';
import { StudioPage } from '@/components/studio-page';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/studio')({head:()=>pageHead('Solo studio','Play four instruments, record a 16-step loop and find your rhythm in BEAT DROP.'),component:()=> <StudioPage/>});