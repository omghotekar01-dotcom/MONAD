import { createFileRoute } from '@tanstack/react-router';
import { RoomEntry } from '@/components/room-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/room/$roomId/')({head:({params})=>pageHead(`Room ${params.roomId}`,'Take a seat in this BEAT DROP local jam room.'),component:RoomPage});
function RoomPage(){const {roomId}=Route.useParams();return <RoomEntry roomId={roomId}/>;}