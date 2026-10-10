import {createFileRoute} from '@tanstack/react-router';
import {ChainDashboard} from '@/components/chain-dashboard';
import {pageHead} from '@/lib/beat-drop';
export const Route=createFileRoute('/chain')({
 head:()=>pageHead('Monad live explorer','Real-time contract address, public transactions, rooms, wallet owners and music contributions on Monad Testnet.'),
 component:ChainDashboard,
});
