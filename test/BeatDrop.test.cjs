const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BeatDrop (Monad Testnet contract)", function () {
  let beat, host, alice, bob, operator, outsider;
  const roomName = ethers.encodeBytes32String("Friday Night");
  const note = async (signer, id, lane, steps, values, owner) =>
    beat.connect(signer).setNotes(id, lane, steps, values, owner);
  const create = async () => {
    await beat.connect(host).createRoom(roomName);
    return (await beat.nextRoomId()) - 1n;
  };
  const join = async (id, lane, wallet) =>
    beat.connect(host).assignSeat(id, lane, wallet.address ?? wallet);
  const start = async (id) => beat.connect(host).startRoom(id);
  const finalize = async (id) => {
    const info = await beat.getRoom(id);
    await time.increaseTo(info.endsAt);
    await beat.connect(outsider).finalizeRoom(id);
  };

  beforeEach(async () => {
    [host, alice, bob, operator, outsider] = await ethers.getSigners();
    beat = await ethers.deployContract("BeatDrop");
    await beat.waitForDeployment();
  });

  it("creates rooms with immutable host and readable metadata", async () => {
    const id = await create();
    const info = await beat.getRoom(id);
    expect(info.host).to.equal(host.address);
    expect(info.name).to.equal(roomName);
    expect(info.phase).to.equal(0n);
    expect(await beat.nextRoomId()).to.equal(2n);
    await expect(beat.getRoom(999)).to.be.revertedWithCustomError(beat,"UnknownRoom");
    await expect(beat.createRoom(ethers.ZeroHash)).to.be.revertedWithCustomError(beat,"InvalidName");
  });

  it("restricts lobby seat assignment to host and freezes roster at start", async () => {
    const id = await create();
    await expect(join(id, 4, alice)).to.be.revertedWithCustomError(beat,"InvalidSeat");
    await expect(beat.connect(outsider).assignSeat(id,0,bob.address)).to.be.revertedWithCustomError(beat,"NotHost");
    await expect(start(id)).to.be.revertedWithCustomError(beat,"NoSeats");
    await join(id, 0, alice);
    await join(id, 1, alice); // two seats for a three-person demo
    await start(id);
    const info = await beat.getRoom(id);
    expect(info.seats[0]).to.equal(alice.address);
    expect(info.seats[1]).to.equal(alice.address);
    expect(info.endsAt - info.startedAt).to.equal(90n);
    await expect(join(id,0,bob)).to.be.revertedWithCustomError(beat,"WrongPhase");
    await expect(start(id)).to.be.revertedWithCustomError(beat,"WrongPhase");
  });

  it("accepts drum bitmasks and melodic pitches, including higher octave values", async () => {
    const id = await create();
    await join(id, 0, alice);
    await join(id, 2, bob);
    await start(id);
    await note(alice,id,0,[0,4],[5,15],alice.address);
    await note(bob,id,2,[2,5],[16,9],bob.address);
    const drums = await beat.getLane(id,0);
    expect(drums[0]).to.equal(5n);
    expect(drums[4]).to.equal(15n);
    const synth = await beat.getLane(id,2);
    expect(synth[2]).to.equal(16n);
    expect(synth[5]).to.equal(9n);
    // Explicit clear is stable across retries, unlike toggle.
    await note(bob,id,2,[2],[0],bob.address);
    await note(bob,id,2,[2],[0],bob.address);
    expect((await beat.getLane(id,2))[2]).to.equal(0n);
  });

  it("rejects outsider edits, wrong owners, malformed batches, and invalid values", async () => {
    const id = await create();
    await join(id, 0, alice);
    await join(id, 1, bob);
    await start(id);
    await expect(note(outsider,id,0,[0],[1],alice.address)).to.be.revertedWithCustomError(beat,"NotAuthorized");
    await expect(note(alice,id,1,[0],[1],alice.address)).to.be.revertedWithCustomError(beat,"InvalidOwner");
    await expect(note(alice,id,0,[],[],alice.address)).to.be.revertedWithCustomError(beat,"InvalidBatch");
    await expect(note(alice,id,0,[0,1],[1],alice.address)).to.be.revertedWithCustomError(beat,"InvalidBatch");
    await expect(note(alice,id,0,[1,1],[1,2],alice.address)).to.be.revertedWithCustomError(beat,"InvalidBatch");
    await expect(note(alice,id,0,[2,1],[1,2],alice.address)).to.be.revertedWithCustomError(beat,"InvalidBatch");
    await expect(note(alice,id,0,[16],[1],alice.address)).to.be.revertedWithCustomError(beat,"InvalidBatch");
    await expect(note(alice,id,0,[0],[16],alice.address)).to.be.revertedWithCustomError(beat,"InvalidNote");
    await expect(note(bob,id,1,[0],[17],bob.address)).to.be.revertedWithCustomError(beat,"InvalidNote");
    const steps = Array.from({length:17},(_,i)=>i);
    await expect(note(alice,id,0,steps,steps,alice.address)).to.be.revertedWithCustomError(beat,"InvalidBatch");
  });

  it("session grants are room-bound, time-limited, revocable, and cannot be stolen", async () => {
    const a = await create();
    const b = await create();
    await join(a, 1, alice);
    await join(b, 1, alice);
    await start(a);
    await start(b);
    const expires = (await time.latest()) + 40;
    await expect(beat.connect(outsider).authorizeSession(a,operator.address,expires)).to.be.revertedWithCustomError(beat,"InvalidOwner");
    await expect(beat.connect(alice).authorizeSession(a,ethers.ZeroAddress,expires)).to.be.revertedWithCustomError(beat,"InvalidSession");
    await beat.connect(alice).authorizeSession(a,operator.address,expires);
    await note(operator,a,1,[0],[7],alice.address);
    await expect(note(operator,b,1,[0],[7],alice.address)).to.be.revertedWithCustomError(beat,"NotAuthorized");
    await expect(beat.connect(operator).assignSeat(a,0,operator.address)).to.be.revertedWithCustomError(beat,"NotHost");
    await expect(beat.connect(operator).startRoom(a)).to.be.revertedWithCustomError(beat,"NotHost");
    await expect(beat.connect(operator).claim(a)).to.be.revertedWithCustomError(beat,"NothingToClaim");
    await beat.connect(alice).revokeSession(a,operator.address);
    await expect(note(operator,a,1,[0],[8],alice.address)).to.be.revertedWithCustomError(beat,"NotAuthorized");
  });

  it("expires session keys even while a round is still active", async () => {
    const id = await create();
    await join(id, 1, alice);
    await start(id);
    const expires = (await time.latest()) + 5;
    await beat.connect(alice).authorizeSession(id,operator.address,expires);
    await time.increaseTo(expires + 1);
    await expect(note(operator,id,1,[0],[4],alice.address)).to.be.revertedWithCustomError(beat,"NotAuthorized");
    await note(alice,id,1,[0],[4],alice.address);
  });

  it("rejects early finalization, late edits, and repeated finalization", async () => {
    const id = await create();
    await join(id, 0, alice);
    await start(id);
    await expect(beat.connect(host).finalizeRoom(id)).to.be.revertedWithCustomError(beat,"TooEarly");
    await note(alice,id,0,[0],[3],alice.address);
    await finalize(id);
    const info = await beat.getRoom(id);
    expect(info.phase).to.equal(2n);
    expect(info.eligibleMask).to.equal(1n);
    await expect(note(alice,id,0,[2],[3],alice.address)).to.be.revertedWithCustomError(beat,"WrongPhase");
    await expect(beat.finalizeRoom(id)).to.be.revertedWithCustomError(beat,"WrongPhase");
  });

  it("freezes eligibility using retained final notes, not historical transactions", async () => {
    const id = await create();
    await join(id,0,alice);
    await join(id,1,bob);
    await start(id);
    await note(alice,id,0,[0],[1],alice.address);
    await note(alice,id,0,[0],[0],alice.address);
    await note(bob,id,1,[2],[5],bob.address);
    await finalize(id);
    expect((await beat.getRoom(id)).eligibleMask).to.equal(2n);
    await beat.connect(outsider).tip(id,{value:11n});
    expect(await beat.claimable(id,alice.address)).to.equal(0n);
    expect(await beat.claimable(id,bob.address)).to.equal(11n);
  });

  it("rejects tips for empty rooms and before finalization", async () => {
    const id = await create();
    await join(id,0,alice);
    await start(id);
    await expect(beat.tip(id,{value:10n})).to.be.revertedWithCustomError(beat,"WrongPhase");
    await finalize(id);
    await expect(beat.tip(id,{value:10n})).to.be.revertedWithCustomError(beat,"NoContributions");
  });

  it("aggregates multiple eligible seats per wallet and accounts for every wei", async () => {
    const id = await create();
    await join(id,0,alice);
    await join(id,1,bob);
    await join(id,3,alice);
    await start(id);
    await note(alice,id,0,[0],[1],alice.address);
    await note(bob,id,1,[2],[10],bob.address);
    await note(alice,id,3,[3],[16],alice.address);
    await finalize(id);
    expect((await beat.getRoom(id)).eligibleMask).to.equal(11n);
    await beat.connect(outsider).tip(id,{value:100n}); // 34 + 33 + 33
    await beat.connect(host).tip(id,{value:8n}); // 4 + 2 + 2
    expect(await beat.claimable(id,alice.address)).to.equal(73n);
    expect(await beat.claimable(id,bob.address)).to.equal(35n);
    await expect(beat.connect(outsider).tip(id,{value:0})).to.be.revertedWithCustomError(beat,"EmptyTip");
    await expect(beat.connect(operator).claim(id)).to.be.revertedWithCustomError(beat,"NothingToClaim");
    await beat.connect(alice).claim(id);
    await beat.connect(bob).claim(id);
    const info = await beat.getRoom(id);
    expect(info.totalTipped).to.equal(108n);
    expect(info.totalClaimed).to.equal(108n);
    expect(await ethers.provider.getBalance(await beat.getAddress())).to.equal(0n);
    expect(await beat.claimed(id,alice.address)).to.equal(73n);
    expect(await beat.claimable(id,alice.address)).to.equal(0n);
    await expect(beat.connect(alice).claim(id)).to.be.revertedWithCustomError(beat,"NothingToClaim");
  });

  it("does not permit claiming by a delegated session key", async () => {
    const id = await create();
    await join(id,1,alice);
    await start(id);
    await beat.connect(alice).authorizeSession(id,operator.address,(await time.latest())+120);
    await note(operator,id,1,[0],[4],alice.address);
    await finalize(id);
    await beat.connect(host).tip(id,{value:5n});
    await expect(beat.connect(operator).claim(id)).to.be.revertedWithCustomError(beat,"NothingToClaim");
    expect(await beat.claimable(id,alice.address)).to.equal(5n);
  });

  it("blocks reentrant claims without losing rightful payments", async () => {
    const attacker = await ethers.deployContract("ReenteringSeat",[await beat.getAddress()]);
    await attacker.waitForDeployment();
    const id = await create();
    await join(id,0,await attacker.getAddress());
    await start(id);
    await attacker.playDrum(id);
    await finalize(id);
    await beat.connect(host).tip(id,{value:9n});
    await attacker.requestClaim();
    expect(await attacker.attempted()).to.equal(true);
    expect(await attacker.reentryBlocked()).to.equal(true);
    expect(await beat.claimed(id,await attacker.getAddress())).to.equal(9n);
    expect((await beat.getRoom(id)).totalClaimed).to.equal(9n);
  });

  it("completes a full one-wallet four-instrument Monad demo with provable 100% claim", async () => {
    const id=await create();
    for(let lane=0;lane<4;lane++)await join(id,lane,alice);
    await start(id);
    await note(alice,id,0,[0,4,8,12],[1,3,1,9],alice.address);
    await note(alice,id,1,[0,6,10],[1,5,4],alice.address);
    await note(alice,id,2,[0,2,4,6],[6,8,9,8],alice.address);
    await note(alice,id,3,[3,7,11],[10,8,12],alice.address);
    const grid=await beat.getPattern(id);
    expect(grid[0][4]).to.equal(3n);
    expect(grid[1][6]).to.equal(5n);
    expect(grid[2][4]).to.equal(9n);
    expect(grid[3][11]).to.equal(12n);
    await finalize(id);
    expect((await beat.getRoom(id)).eligibleMask).to.equal(15n);
    await beat.connect(outsider).tip(id,{value:101n});
    expect(await beat.claimable(id,alice.address)).to.equal(101n);
    expect(await beat.claimable(id,host.address)).to.equal(0n);
    await beat.connect(alice).claim(id);
    expect(await beat.claimable(id,alice.address)).to.equal(0n);
    expect((await beat.getRoom(id)).totalClaimed).to.equal(101n);
  });

  it("cannot receive direct transfers outside the tip flow", async () => {
    await expect(host.sendTransaction({to:await beat.getAddress(),value:1n}))
      .to.be.revertedWithCustomError(beat,"DirectTransferDisabled");
  });
});
