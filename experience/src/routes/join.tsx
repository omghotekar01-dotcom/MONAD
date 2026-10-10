import { createFileRoute } from '@tanstack/react-router';
import { JoinPage } from '@/components/room-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/join')({head:()=>pageHead('Join a room','Enter your BEAT DROP room code and find your place in the band.'),component:JoinPage});