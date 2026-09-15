(() => {
  'use strict';
  const THRESHOLDS = Object.freeze({ strong: 80, progressing: 60, minimumAnswered: 3 });
  function topicLevel(metrics = {}) {
    const answered = Math.max(0, Number(metrics.answered ?? metrics.attempts) || 0);
    const correct = Math.max(0, Number(metrics.correct) || 0);
    const accuracy = answered ? Math.round(correct / answered * 100) : 0;
    const level = !answered ? 'unpracticed' : answered < THRESHOLDS.minimumAnswered || accuracy < THRESHOLDS.progressing ? 'weak' : accuracy >= THRESHOLDS.strong ? 'strong' : 'progressing';
    return { answered, correct, incorrect: Math.max(0, answered - correct), accuracy, level, lastPracticed: Number(metrics.lastPracticed || 0) };
  }
  function weakTopicIds(topics = [], stats = {}) {
    return topics.map(topic => ({ id: topic.id, ...topicLevel(stats[topic.id]) })).filter(row => row.level === 'weak' || row.level === 'unpracticed').sort((a, b) => a.accuracy - b.accuracy || a.answered - b.answered).map(row => row.id);
  }
  function prepareTest(topics = [], stats = {}, minutes = 15) {
    const duration = [15, 30, 60].includes(Number(minutes)) ? Number(minutes) : 15;
    const weak = weakTopicIds(topics, stats); const coverage = topics.map(topic => topic.id).filter(id => !weak.includes(id));
    return { schemaVersion: 1, minutes: duration, questionTarget: duration === 15 ? 10 : duration === 30 ? 20 : 40, topicIds: [...weak, ...coverage], strategy: 'weak-errors-unpracticed-coverage' };
  }
  function updateFlashcard(previous = {}, known, now = Date.now()) {
    return { schemaVersion: 1, known: known === true, unknown: known !== true, lastReviewed: now, reviewCount: Math.max(0, Number(previous.reviewCount) || 0) + 1 };
  }
  window.StudyHubPlanner = Object.freeze({ THRESHOLDS, topicLevel, weakTopicIds, prepareTest, updateFlashcard });
})();
