import { createFileRoute } from '@tanstack/react-router';
import { ExplorePage } from '@/components/room-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/explore')({head:()=>pageHead('Jam rooms','Find your next sound in BEAT DROP’s local preview jam rooms.'),component:ExplorePage});