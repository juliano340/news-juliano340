const config = require('../config');
const editorial = require('../pipeline/editorial');
const quality = require('../pipeline/quality');

const g1 = require('../sources/g1');
const tecnoblog = require('../sources/tecnoblog');
const canaltech = require('../sources/canaltech');
const tecmundo = require('../sources/tecmundo');

function enabledSources() {
  const list = [];
  if (config.SOURCES.G1.enabled) list.push(g1);
  if (config.SOURCES.TECNOBLOG.enabled) list.push(tecnoblog);
  if (config.SOURCES.CANALTECH.enabled) list.push(canaltech);
  if (config.SOURCES.TECMUNDO.enabled) list.push(tecmundo);
  return list;
}

function summarizeSourceStats(resultBySource) {
  for (const [source, stats] of Object.entries(resultBySource)) {
    const avg = stats.total > 0 ? (stats.scoreSum / stats.total).toFixed(1) : '0.0';
    console.log(`- ${source}: ${stats.passed}/${stats.total} aprovados | media ${avg}`);
  }
}

function printRecommendations(report) {
  const passRate = report.total > 0 ? (report.passed / report.total) * 100 : 0;

  console.log('\nRecomendacao automatica:');
  if (passRate < 35) {
    console.log('- Taxa de aprovacao muito baixa. Considere reduzir EDITORIAL_MIN_SCORE para 65 e revisar limites de texto.');
  } else if (passRate < 55) {
    console.log('- Taxa de aprovacao moderada. Ajuste fino: reduza peso/limite da regra mais frequente de reprova.');
  } else {
    console.log('- Taxa de aprovacao saudavel. Mantenha threshold atual e monitore por 3-5 ciclos.');
  }

  if (report.topReason) {
    console.log(`- Principal motivo de descarte: ${report.topReason.reason} (${report.topReason.count}x).`);
  }
}

async function main() {
  const sources = enabledSources();
  const report = {
    total: 0,
    passed: 0,
    discarded: 0,
    scoreSum: 0,
    reasons: {},
    sourceStats: {}
  };

  console.log('Iniciando calibracao do quality gate...');
  console.log(`Threshold atual: ${config.EDITORIAL_MIN_SCORE}`);

  for (const source of sources) {
    const items = await source.fetch();
    report.sourceStats[source.name] = { total: 0, passed: 0, scoreSum: 0 };

    for (const post of items) {
      const composed = await editorial.compose(post);
      const evaluated = quality.evaluate(post, composed);

      report.total += 1;
      report.scoreSum += evaluated.score;
      report.sourceStats[source.name].total += 1;
      report.sourceStats[source.name].scoreSum += evaluated.score;

      if (evaluated.passed) {
        report.passed += 1;
        report.sourceStats[source.name].passed += 1;
      } else {
        report.discarded += 1;
        for (const reason of evaluated.reasons) {
          report.reasons[reason] = (report.reasons[reason] || 0) + 1;
        }
      }
    }
  }

  const avgScore = report.total > 0 ? (report.scoreSum / report.total).toFixed(1) : '0.0';
  const passRate = report.total > 0 ? ((report.passed / report.total) * 100).toFixed(1) : '0.0';
  const reasonEntries = Object.entries(report.reasons).sort((a, b) => b[1] - a[1]);
  report.topReason = reasonEntries.length > 0 ? { reason: reasonEntries[0][0], count: reasonEntries[0][1] } : null;

  console.log('\nResultado geral:');
  console.log(`- Total avaliados: ${report.total}`);
  console.log(`- Aprovados: ${report.passed}`);
  console.log(`- Descartados: ${report.discarded}`);
  console.log(`- Taxa de aprovacao: ${passRate}%`);
  console.log(`- Score medio: ${avgScore}`);

  console.log('\nPor fonte:');
  summarizeSourceStats(report.sourceStats);

  if (reasonEntries.length > 0) {
    console.log('\nMotivos de reprova (top 5):');
    for (const [reason, count] of reasonEntries.slice(0, 5)) {
      console.log(`- ${reason}: ${count}`);
    }
  }

  printRecommendations(report);
}

main().catch((error) => {
  console.error('Falha na calibracao:', error.message);
  process.exit(1);
});
