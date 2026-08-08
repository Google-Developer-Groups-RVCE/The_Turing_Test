const roundStore = require('../redis/roundStore');
const questionStore = require('../redis/questionStore');
const responseStore = require('../redis/responseStore');
const leaderboardService = require('./leaderboardService');
const logStore = require('../redis/logStore');

class SeedService {
  async seedSamples(adminUsername) {
    // 1. Create 3 Sample Rounds
    const rounds = [
      {
        id: 'round_1_aptitude',
        name: 'Round 1 – Aptitude & Logic',
        status: 'pending',
        durationSeconds: '300',
        order: '1',
      },
      {
        id: 'round_2_coding',
        name: 'Round 2 – Algorithms & Coding',
        status: 'pending',
        durationSeconds: '300',
        order: '2',
      },
      {
        id: 'round_3_turing',
        name: 'Round 3 – Turing Test Speedrun',
        status: 'pending',
        durationSeconds: '300',
        order: '3',
      },
    ];

    for (const r of rounds) {
      await roundStore.saveRound(r);
    }

    // 2. Questions for Round 1
    const r1Questions = [
      {
        id: 'q1_1',
        text: 'If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?',
        type: 'mcq',
        options: ['5 minutes', '100 minutes', '50 minutes', '1 minute'],
        correctAnswer: '5 minutes',
        points: '10',
        order: '1',
      },
      {
        id: 'q1_2',
        text: 'Which number logically completes the sequence: 2, 6, 12, 20, 30, __?',
        type: 'mcq',
        options: ['42', '40', '36', '48'],
        correctAnswer: '42',
        points: '10',
        order: '2',
      },
      {
        id: 'q1_3',
        text: 'Look at this series: 7, 10, 8, 11, 9, 12, __. What number should come next?',
        type: 'mcq',
        options: ['10', '13', '7', '14'],
        correctAnswer: '10',
        points: '10',
        order: '3',
      },
    ];
    for (const q of r1Questions) {
      await questionStore.addQuestion('round_1_aptitude', q);
    }
    await questionStore.setActiveQuestionId('round_1_aptitude', 'q1_1');

    // 3. Questions for Round 2
    const r2Questions = [
      {
        id: 'q2_1',
        text: 'What is the worst-case time complexity of QuickSort?',
        type: 'mcq',
        options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
        correctAnswer: 'O(n²)',
        points: '10',
        order: '1',
      },
      {
        id: 'q2_2',
        text: 'Which data structure is primarily used to implement Breadth-First Search (BFS) in a graph?',
        type: 'mcq',
        options: ['Queue', 'Stack', 'Priority Queue', 'Array'],
        correctAnswer: 'Queue',
        points: '10',
        order: '2',
      },
      {
        id: 'q2_3',
        text: "What will be the output of 3 + '3' - 3 in JavaScript?",
        type: 'mcq',
        options: ['30', 'NaN', '33', '0'],
        correctAnswer: '30',
        points: '10',
        order: '3',
      },
    ];
    for (const q of r2Questions) {
      await questionStore.addQuestion('round_2_coding', q);
    }
    await questionStore.setActiveQuestionId('round_2_coding', 'q2_1');

    // 4. Questions for Round 3
    const r3Questions = [
      {
        id: 'q3_1',
        text: 'Who is widely considered the father of theoretical computer science and AI?',
        type: 'mcq',
        options: ['Alan Turing', 'Ada Lovelace', 'John von Neumann', 'Claude Shannon'],
        correctAnswer: 'Alan Turing',
        points: '10',
        order: '1',
      },
      {
        id: 'q3_2',
        text: "In what year did Alan Turing publish his landmark paper 'Computing Machinery and Intelligence'?",
        type: 'mcq',
        options: ['1950', '1936', '1945', '1962'],
        correctAnswer: '1950',
        points: '10',
        order: '2',
      },
      {
        id: 'q3_3',
        text: 'What is the core evaluation criterion of the classic Turing Test?',
        type: 'mcq',
        options: [
          'Can a machine convince an evaluator it is human?',
          'Can a machine solve NP-complete problems in polynomial time?',
          'Can a machine play chess at grandmaster level?',
          'Can a machine self-replicate code?'
        ],
        correctAnswer: 'Can a machine convince an evaluator it is human?',
        points: '10',
        order: '3',
      },
    ];
    for (const q of r3Questions) {
      await questionStore.addQuestion('round_3_turing', q);
    }
    await questionStore.setActiveQuestionId('round_3_turing', 'q3_1');

    await logStore.addLog({
      action: 'SEED_SAMPLE_DATA',
      adminUsername,
      timestamp: Date.now().toString(),
      details: 'Seeded 3 sample rounds with 3 questions each',
    });

    return { message: 'Seeded 3 sample rounds with 3 questions each' };
  }

  async clearAllData(adminUsername) {
    await responseStore.clearAllResponses();
    await leaderboardService.resetLeaderboard(adminUsername);
    await logStore.addLog({
      action: 'CLEAR_ALL_DATA',
      adminUsername,
      timestamp: Date.now().toString(),
      details: 'Cleared all responses and reset leaderboard',
    });
    return { message: 'All live responses cleared and leaderboard reset' };
  }
}

module.exports = new SeedService();
