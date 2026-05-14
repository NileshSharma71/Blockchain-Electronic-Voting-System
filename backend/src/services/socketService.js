const Election = require('../models/Election');
const Ballot = require('../models/Ballot');

let io = null;

function initSocket(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    // Join election room for real-time vote count updates
    socket.on('subscribe:election', (electionId) => {
      socket.join(`election:${electionId}`);
    });

    socket.on('unsubscribe:election', (electionId) => {
      socket.leave(`election:${electionId}`);
    });

    // Join feed room for new elections
    socket.on('subscribe:feed', () => {
      socket.join('feed');
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

async function broadcastBallotUpdate(electionId) {
  if (!io) return;

  const election = await Election.findById(electionId);
  if (!election) return;

  // Count votes per candidate
  const ballots = await Ballot.find({ electionId });
  const voteCounts = {};
  for (const candidate of election.candidates) {
    voteCounts[candidate._id.toString()] = 0;
  }
  for (const ballot of ballots) {
    const key = ballot.candidateId.toString();
    if (voteCounts[key] !== undefined) voteCounts[key] += 1;
  }

  io.to(`election:${electionId}`).emit('ballot:update', {
    electionId,
    totalVotes: ballots.length,
    voteCounts,
    updatedAt: new Date(),
  });
}

async function broadcastNewElection(election) {
  if (!io) return;

  io.to('feed').emit('election:new', {
    id: election._id,
    title: election.title,
    status: election.status,
    startTime: election.startTime,
    endTime: election.endTime,
    createdAt: election.createdAt,
  });
}

async function broadcastElectionResult(electionId, result) {
  if (!io) return;

  io.to(`election:${electionId}`).emit('election:completed', {
    electionId,
    winnerName: result.winnerName,
    totalVotes: result.totalVotes,
    results: result.results,
    status: 'completed',
  });
}

module.exports = {
  initSocket,
  broadcastBallotUpdate,
  broadcastNewElection,
  broadcastElectionResult,
};
