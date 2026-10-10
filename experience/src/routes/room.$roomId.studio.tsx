import { createFileRoute } from '@tanstack/react-router';
import { StudioPage } from '@/components/studio-page';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/room/$roomId/studio')({head:({params})=>pageHead(`Jam ${params.roomId}`,'Make a beat together in the BEAT DROP 90-second local studio.'),component:Studio});
function Studio(){const {roomId}=Route.useParams();return <StudioPage roomId={roomId}/>;}