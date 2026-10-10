import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Headphones, Keyboard, Layers3, Play, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMusic } from './music-context';
import { emptyPattern } from '@/lib/beat-drop';
import { toast } from 'sonner';
import { signaturePattern, SIGNATURE_SONG } from '@/lib/demo-song';
import { roomService } from '@/services/local-services';

/** A first-run affordance, not a blocking tutorial or a fabricated multiplayer room. */
export function StudioGettingStarted({isJam=false}:{isJam?:boolean}){
 const music=useMusic();const navigate=useNavigate();
 const [open,setOpen]=useState(true);
 const demo=async()=>{
   if(music.playing){toast('Your loop is already playing. Press Pause when you want to stop.');return;}
   try{await music.toggle();}
   catch{toast.error('Browser audio could not start. Check your volume and try again.');}
 };
 const demoSong=()=>{
   music.load(signaturePattern(),SIGNATURE_SONG.title);
   music.setInstrument('synth');
   toast.success('Original demo song loaded. Press Play loop to hear all four instruments.');
 };
 const rehearse=()=>{
   const room=roomService.create(SIGNATURE_SONG.title,'House','private');
   roomService.save({...room,seats:room.seats.map(seat=>({...seat,owner:'You'})),pattern:signaturePattern()});
   void navigate({to:'/room/$roomId/lobby',params:{roomId:room.id}});
 };
 const blank=()=>{
   music.load(emptyPattern(),'My first beat');
   music.setInstrument('drums');
   toast('Blank studio ready. Click a drum step in the first row, then press Play loop.');
 };
 if(!open)return <div className="studio-guidance-closed">
   <span><Sparkles className="size-4"/> Need help making a beat?</span>
   <Button size="sm" variant="outline" onClick={()=>setOpen(true)}>Show quick guide</Button>
 </div>;
 return <section className="studio-guidance" aria-label="Getting started with music">
   <div className="studio-guidance-head">
     <div><p className="eyebrow mb-2">START HERE · {isJam?'LOCAL JAM':'NO WALLET NEEDED'}</p>
       <h2>Make your first beat in 30 seconds.</h2>
       <p>{isJam?'Pick your assigned instrument, play notes and build the loop together in this local demonstration.':
         'Hear a working beat first. Then change a note, play the keyboard, or start from an empty loop.'}</p>
     </div>
     <Button variant="ghost" size="icon" aria-label="Hide getting started guide" onClick={()=>setOpen(false)}><X className="size-4"/></Button>
   </div>
   <div className="studio-guidance-actions">
      <Button size="sm" className="studio-guidance-play" onClick={()=>void demo()}>
        <Play className="size-4"/>{music.playing?'Beat is playing':'▶ Play example beat'}
      </Button>
      {!isJam&&<Button size="sm" variant="outline" onClick={demoSong}><Sparkles className="size-4"/>Load “Midnight on Monad”</Button>}
      {!isJam&&<Button size="sm" variant="outline" onClick={blank}><Plus className="size-4"/>Start empty beat</Button>}
      {!isJam&&<Button size="sm" variant="outline" onClick={rehearse}><Layers3 className="size-4"/>Rehearse 4 players alone</Button>}
      {!isJam&&<Button size="sm" variant="outline" asChild><Link to="/create"><Layers3 className="size-4"/>Create a jam <ArrowRight className="size-3"/></Link></Button>}
   </div>
   <div className="studio-guide-steps">
     <div><span className="studio-guide-step-number">01</span><strong>Choose a sound</strong><small>Drums, Bass, Synth, or Pluck at the top.</small></div>
     <div><span className="studio-guide-step-number">02</span><strong>Tap the keys</strong><small>Click the instrument pads below or press A, S, D, F.</small></div>
     <div><span className="studio-guide-step-number">03</span><strong>Build your loop</strong><small>Click colored grid squares to add or remove notes.</small></div>
     <div><span className="studio-guide-step-number">04</span><strong>Record & save</strong><small>Arm Record + Play, tap notes, then Save my drop.</small></div>
   </div>
   <p className="studio-guide-note">
     <Headphones className="size-3.5"/> {isJam?'This is a one-browser local jam, not a remote room.':
       'Can’t hear anything? Click Play once to unlock audio, then check the player volume and browser tab.'}
     <Keyboard className="size-3.5 ml-auto hidden sm:block"/>
   </p>
 </section>;
}
