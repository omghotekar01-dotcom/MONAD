import { createFileRoute } from '@tanstack/react-router';
import { LobbyPage } from '@/components/room-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/room/$roomId/lobby')({head:({params})=>pageHead(`Backstage ${params.roomId}`,'Pick your instrument seat and get ready for a BEAT DROP jam.'),component:Lobby});
function Lobby(){const {roomId}=Route.useParams();return <LobbyPage roomId={roomId}/>;}