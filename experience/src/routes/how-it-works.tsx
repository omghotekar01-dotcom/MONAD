import { createFileRoute } from '@tanstack/react-router';
import { HelpPage } from '@/components/help-page';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/how-it-works')({head:()=>pageHead('Find your rhythm','Learn about BEAT DROP instruments, local jams, recording and shared credit.'),component:HelpPage});