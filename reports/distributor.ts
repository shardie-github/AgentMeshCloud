/**
 * Report Distributor
 * Emails or Slack DMs monthly health reports to tenant owners
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MonthlyHealthReport } from './monthly_health';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export interface Recipient {
  id: string;
  name: string;
  email: string;
  slack_id?: string;
  tenant_id: string;
  preferred_channel: 'email' | 'slack';
}

export class ReportDistributor {
  private supabase: SupabaseClient;
  private pdfTemplate?: HandlebarsTemplateDelegate;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize and load templates
   */
  async initialize(): Promise<void> {
    const templatePath = path.join(__dirname, 'account_summary.pdf.tmpl');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    this.pdfTemplate = Handlebars.compile(templateContent);
    console.log('✅ Report templates loaded');
  }

  /**
   * Distribute report to all tenant owners
   */
  async distributeReport(report: MonthlyHealthReport): Promise<void> {
    console.log(`📬 Distributing monthly health report for ${report.period.month}/${report.period.year}...`);

    // Fetch all recipients
    const recipients = await this.getRecipients();

    if (recipients.length === 0) {
      console.warn('No recipients found');
      return;
    }

    console.log(`📧 Sending to ${recipients.length} recipients...`);

    const results = {
      email_sent: 0,
      slack_sent: 0,
      failed: 0,
    };

    for (const recipient of recipients) {
      try {
        if (recipient.preferred_channel === 'email') {
          await this.sendEmail(recipient, report);
          results.email_sent++;
        } else if (recipient.preferred_channel === 'slack') {
          await this.sendSlackDM(recipient, report);
          results.slack_sent++;
        }
      } catch (error) {
        console.error(`Failed to send report to ${recipient.email}:`, error);
        results.failed++;
      }
    }

    console.log(`✅ Distribution complete: ${results.email_sent} emails, ${results.slack_sent} Slack DMs, ${results.failed} failed`);

    // Log distribution
    await this.logDistribution(report, results);
  }

  /**
   * Get list of recipients
   */
  private async getRecipients(): Promise<Recipient[]> {
    const { data, error } = await this.supabase
      .from('report_recipients')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Failed to fetch recipients:', error);
      return [];
    }

    return data as Recipient[];
  }

  /**
   * Send email report
   */
  private async sendEmail(recipient: Recipient, report: MonthlyHealthReport): Promise<void> {
    console.log(`📧 Sending email to ${recipient.email}...`);

    // Generate HTML from template
    const htmlContent = this.generateHTML(report);

    // TODO: Integrate with email service (SendGrid, SES, etc.)
    // For now, just log
    console.log(`Email would be sent to ${recipient.email}`);

    // Store in database for audit
    await this.supabase.from('report_deliveries').insert({
      recipient_id: recipient.id,
      report_period: `${report.period.year}-${report.period.month}`,
      delivery_channel: 'email',
      delivered_at: new Date().toISOString(),
      status: 'success',
    });
  }

  /**
   * Send Slack DM
   */
  private async sendSlackDM(recipient: Recipient, report: MonthlyHealthReport): Promise<void> {
    if (!recipient.slack_id) {
      throw new Error('Recipient has no Slack ID');
    }

    console.log(`💬 Sending Slack DM to ${recipient.slack_id}...`);

    const message = this.generateSlackMessage(report);

    // TODO: Integrate with Slack API
    // For now, just log
    console.log(`Slack DM would be sent to ${recipient.slack_id}`);

    // Store in database for audit
    await this.supabase.from('report_deliveries').insert({
      recipient_id: recipient.id,
      report_period: `${report.period.year}-${report.period.month}`,
      delivery_channel: 'slack',
      delivered_at: new Date().toISOString(),
      status: 'success',
    });
  }

  /**
   * Generate HTML from template
   */
  private generateHTML(report: MonthlyHealthReport): string {
    if (!this.pdfTemplate) {
      throw new Error('Template not loaded');
    }

    return this.pdfTemplate({
      ...report,
      generated_at: new Date().toLocaleDateString(),
    });
  }

  /**
   * Generate Slack message
   */
  private generateSlackMessage(report: MonthlyHealthReport): any {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 Monthly Health Report - ${report.period.month}/${report.period.year}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Health Score:*\n${report.summary.overall_health_score}/100`,
            },
            {
              type: 'mrkdwn',
              text: `*Uptime:*\n${report.summary.uptime_percent.toFixed(2)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Requests:*\n${report.summary.total_requests.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Error Rate:*\n${(report.summary.error_rate * 100).toFixed(2)}%`,
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*💰 Total Cost:* $' + report.costs.total_cost_usd.toFixed(2),
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*🚨 Incidents:* ' + report.incidents.total_incidents,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*💬 Feedback:* ' + report.feedback.total_feedback + ' items',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*💡 Top Recommendations:*\n' +
              report.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n'),
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Full Report',
              },
              url: `https://dashboard.company.com/reports/${report.period.year}/${report.period.month}`,
            },
          ],
        },
      ],
    };
  }

  /**
   * Log distribution results
   */
  private async logDistribution(report: MonthlyHealthReport, results: any): Promise<void> {
    await this.supabase.from('report_distributions').insert({
      report_period: `${report.period.year}-${report.period.month}`,
      email_count: results.email_sent,
      slack_count: results.slack_sent,
      failed_count: results.failed,
      distributed_at: new Date().toISOString(),
    });
  }

  /**
   * Add recipient
   */
  async addRecipient(recipient: Omit<Recipient, 'id'>): Promise<void> {
    const { error } = await this.supabase.from('report_recipients').insert({
      name: recipient.name,
      email: recipient.email,
      slack_id: recipient.slack_id,
      tenant_id: recipient.tenant_id,
      preferred_channel: recipient.preferred_channel,
      active: true,
    });

    if (error) {
      console.error('Failed to add recipient:', error);
      throw error;
    }

    console.log(`✅ Added recipient: ${recipient.email}`);
  }

  /**
   * Remove recipient
   */
  async removeRecipient(recipientId: string): Promise<void> {
    const { error } = await this.supabase
      .from('report_recipients')
      .update({ active: false })
      .eq('id', recipientId);

    if (error) {
      console.error('Failed to remove recipient:', error);
      throw error;
    }

    console.log(`✅ Removed recipient: ${recipientId}`);
  }
}

/**
 * Factory function
 */
export async function createReportDistributor(): Promise<ReportDistributor | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, report distributor disabled');
    return null;
  }

  const distributor = new ReportDistributor(supabaseUrl, supabaseKey);
  await distributor.initialize();

  return distributor;
}

export default ReportDistributor;
