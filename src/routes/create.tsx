import { createFileRoute } from '@tanstack/react-router';
import { CreatePage } from '@/components/room-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/create')({head:()=>pageHead('Create a jam','Make room for music. Set up your own BEAT DROP local jam session.'),component:CreatePage});