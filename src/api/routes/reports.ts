import { Router } from 'express';

export const reportsRouter = Router();

reportsRouter.get('/executive-summary', async (req, res) => {
  try {
    const { reportEngine } = req.app.locals;
    const summary = await reportEngine.generateExecutiveSummary();

    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

reportsRouter.post('/export', async (req, res) => {
  try {
    const { reportEngine } = req.app.locals;
    const format = (req.body.format || 'markdown') as 'markdown' | 'csv';

    if (format !== 'markdown' && format !== 'csv') {
      res.status(400).json({ error: 'Invalid format. Must be "markdown" or "csv"' });
      return;
    }

    const content =
      format === 'markdown' ? await reportEngine.exportMarkdown() : await reportEngine.exportCSV();

    const filename = `executive_summary.${format === 'markdown' ? 'md' : 'csv'}`;
    const contentType = format === 'markdown' ? 'text/markdown' : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

reportsRouter.get('/healing', async (req, res) => {
  try {
    const { selfHealingEngine } = req.app.locals;
    const report = await selfHealingEngine.diagnoseAndHeal();

    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

reportsRouter.post('/healing/export', async (req, res) => {
  try {
    const { selfHealingEngine } = req.app.locals;
    const markdown = await selfHealingEngine.generateHealingReport();

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="healing_report.md"');
    res.send(markdown);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
