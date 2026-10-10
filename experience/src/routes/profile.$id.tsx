import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/components/beat-pages';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute('/profile/$id')({head:({params})=>pageHead(`Creator ${params.id}`,'Explore this BEAT DROP creator’s contributions and saved sounds.'),component:Profile});
function Profile(){const {id}=Route.useParams();return <ProfilePage id={id}/>;}