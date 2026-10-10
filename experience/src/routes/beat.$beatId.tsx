import { createFileRoute } from '@tanstack/react-router';
import { BeatPage } from '@/components/beat-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/beat/$beatId')({head:({params})=>pageHead(`Drop ${params.beatId}`,'Replay a BEAT DROP loop, hear each part and see every contributor.'),component:BeatDetail});
function BeatDetail(){const {beatId}=Route.useParams();return <BeatPage beatId={beatId}/>;}