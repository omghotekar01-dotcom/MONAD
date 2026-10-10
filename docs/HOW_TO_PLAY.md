# How to play BEAT DROP

This guide matches the current light Lovable Studio interface, including the
**Make your first beat in 30 seconds** tutorial above the instruments.

## Solo: hear something immediately

1. Open **Solo studio** (`/studio`).
2. In the top guide click **Play example beat**, or find the large **Play loop**
   button under the sequencer. No MetaMask wallet is required.
3. You should hear the existing colored drum, bass, synth and pluck steps.
   The transport message should say the loop is playing.
4. Choose **Bass**, **Synth** or **Pluck** from the four instrument cards.
5. Click one of the large performance keys, or use
   `A S D F G H J K` and `Q W E R T Y U I` on your keyboard.
   For Drums, `A/S/D/F` play kick/snare/hi-hat/clap.
6. Tap a piano key, then click any cell in that instrument's colored
   16-step row to place that note. The pitch menu now follows the note
   you last played.
7. Press **Play loop** to listen, **Stop** to halt, **Undo** to revert edits.
   Use master volume if you can't hear anything.

**Recording:** Click **Arm record** and **Play loop**. While the loop runs,
tap the keyboard to record a note at the current step. Clicking **Arm record**
again turns off recording. Arming alone does not create music, and an
empty pattern is silent until notes are played or added.

**New original beat:** Click **Start empty beat** in the quick guide,
select Drums, click cells, press Play, add Bass and other instruments.
Click **Save my drop** below the Studio to save your local Beat Card and
replay it; it remains in your browser. **Save file** in the transport
downloads an editable JSON loop. **Open file** reloads that file.

**Producer:** On the right-side **Producer** tab choose House, Lo-fi,
Trap or Ambient; choose sparse/balanced/energetic. Generate three
suggestions, audition one, and click Apply only if you like it.
A full four-track starter draft is also available for local Solo.

## Jam: four tracks in one 90-second session

When no Monad contract address is configured:

1. Use **Create a jam** in the Studio onboarding (or `/create`).
2. Name the jam, choose a vibe, then click **Create jam room**.
3. In the lobby click **Take a seat** for one or more instruments.
   Until a deployed contract is configured, this is a **local demonstration
   on one browser**. The invitation code cannot bring another physical
   user into the room remotely.
4. Click **Start 90-second jam**. A three-second countdown begins.
5. In the studio press **Play loop**, select your instrument and enter
   notes using the pads or colored sequencer grid.
6. Before or after the 90-second limit, click **Finish local round**
   or **Save beat card** to generate a replayable local Beat Card.

## Real cross-device jam (later step)

To let friends play from independent computers, a real
`BeatDrop.sol` address must be deployed and confirmed on
**Monad Testnet 10143**. Set the public address in
`VITE_BEATDROP_ADDRESS` in your `.env.local`, restart the app,
and host the React/TanStack server on a public HTTPS URL.
Then each player connects MetaMask, the host assigns seats, and each
player must approve gas-paid note edits. The finalized accepted notes
determine contributor shares; the contract holds and distributes
testnet MON tips. This has **not been live-verified** on independent
wallets, so do not present a local room as remote multiplayer.

## If you hear no sound

- Make sure **Play loop** changes to **Pause loop** after your click.
  (If not, an audio initialization error may have occurred.)
- Check Windows output volume, browser tab unmute, and master volume.
- Make sure the pattern has colored cells: a fully blank pattern is silent.
- Test a drum or piano pad directly, then try a different browser.
- In VS Code copy any red terminal errors; in Chrome open **F12 → Console**
  and share the exact message without including wallet keys or private data.

The site is a hackathon prototype. Automated browser checks verify the
transport start/stop and interface logic, but not your local speakers or
a real remote-wallet jam.
