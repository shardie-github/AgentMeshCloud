/**
 * Google Workspace Integration Connector
 * Gmail, Calendar, Drive, Sheets integration for AI-Agent Mesh
 * 
 * @module GoogleWorkspaceConnector
 * @version 3.0.0
 */

import { google } from 'googleapis';

export class GoogleWorkspaceConnector {
  constructor(config) {
    const { clientId, clientSecret, redirectUri, refreshToken } = config;

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    // Initialize Google API clients
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  // ============ Gmail Integration ============

  /**
   * Send email via AI agent
   * @param {Object} emailData - Email configuration
   */
  async sendEmail(emailData) {
    const { to, subject, body, attachments = [] } = emailData;

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const res = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      return res.data;
    } catch (error) {
      throw new Error(`Gmail send error: ${error.message}`);
    }
  }

  /**
   * AI-powered email response generation
   * @param {string} messageId - Original message ID
   * @param {string} aiResponse - AI-generated response
   */
  async replyToEmail(messageId, aiResponse) {
    const originalMessage = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId
    });

    const headers = originalMessage.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const to = headers.find(h => h.name === 'From')?.value || '';
    const messageIdHeader = headers.find(h => h.name === 'Message-ID')?.value;

    return this.sendEmail({
      to,
      subject: `Re: ${subject}`,
      body: aiResponse,
      inReplyTo: messageIdHeader
    });
  }

  /**
   * List recent emails for AI processing
   * @param {Object} filters - Email filters
   */
  async listEmails(filters = {}) {
    const { query = '', maxResults = 100 } = filters;

    try {
      const res = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      return res.data.messages || [];
    } catch (error) {
      throw new Error(`Gmail list error: ${error.message}`);
    }
  }

  // ============ Google Calendar Integration ============

  /**
   * Create calendar event from AI agent
   * @param {Object} eventData - Event configuration
   */
  async createCalendarEvent(eventData) {
    const {
      summary,
      description,
      start,
      end,
      attendees = [],
      location
    } = eventData;

    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: start,
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: end,
        timeZone: 'America/Los_Angeles'
      },
      attendees: attendees.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    try {
      const res = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all'
      });

      return res.data;
    } catch (error) {
      throw new Error(`Calendar create error: ${error.message}`);
    }
  }

  /**
   * Get availability for AI-powered scheduling
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getAvailability(startDate, endDate) {
    try {
      const res = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return res.data.items || [];
    } catch (error) {
      throw new Error(`Calendar availability error: ${error.message}`);
    }
  }

  // ============ Google Drive Integration ============

  /**
   * Upload AI-generated document to Drive
   * @param {Object} fileData - File configuration
   */
  async uploadFile(fileData) {
    const { name, mimeType, content, folderId } = fileData;

    const fileMetadata = {
      name,
      parents: folderId ? [folderId] : []
    };

    const media = {
      mimeType,
      body: content
    };

    try {
      const res = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      return res.data;
    } catch (error) {
      throw new Error(`Drive upload error: ${error.message}`);
    }
  }

  /**
   * List files for AI analysis
   * @param {Object} filters - File filters
   */
  async listFiles(filters = {}) {
    const { query = '', pageSize = 100 } = filters;

    try {
      const res = await this.drive.files.list({
        q: query,
        pageSize,
        fields: 'files(id, name, mimeType, createdTime, webViewLink)'
      });

      return res.data.files || [];
    } catch (error) {
      throw new Error(`Drive list error: ${error.message}`);
    }
  }

  // ============ Google Sheets Integration ============

  /**
   * Write AI agent data to spreadsheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Cell range (e.g., 'Sheet1!A1:D10')
   * @param {Array} values - Data to write
   */
  async writeToSheet(spreadsheetId, range, values) {
    try {
      const res = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });

      return res.data;
    } catch (error) {
      throw new Error(`Sheets write error: ${error.message}`);
    }
  }

  /**
   * Read data from spreadsheet for AI processing
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Cell range
   */
  async readFromSheet(spreadsheetId, range) {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      return res.data.values || [];
    } catch (error) {
      throw new Error(`Sheets read error: ${error.message}`);
    }
  }

  /**
   * Create new spreadsheet for agent reporting
   * @param {string} title - Spreadsheet title
   * @param {Array} sheets - Sheet configurations
   */
  async createSpreadsheet(title, sheets = []) {
    const resource = {
      properties: {
        title
      },
      sheets: sheets.map(sheet => ({
        properties: {
          title: sheet.name
        }
      }))
    };

    try {
      const res = await this.sheets.spreadsheets.create({
        requestBody: resource,
        fields: 'spreadsheetId, spreadsheetUrl'
      });

      return res.data;
    } catch (error) {
      throw new Error(`Sheets create error: ${error.message}`);
    }
  }

  // ============ AI Agent Use Cases ============

  /**
   * Automated email response workflow
   * @param {string} inboxLabel - Gmail label to monitor
   * @param {Function} aiResponseGenerator - AI agent function
   */
  async automateEmailResponses(inboxLabel, aiResponseGenerator) {
    const emails = await this.listEmails({
      query: `label:${inboxLabel} is:unread`,
      maxResults: 50
    });

    const responses = await Promise.all(
      emails.map(async (email) => {
        const message = await this.gmail.users.messages.get({
          userId: 'me',
          id: email.id
        });

        // Generate AI response
        const aiResponse = await aiResponseGenerator(message.data);

        // Send reply
        return this.replyToEmail(email.id, aiResponse);
      })
    );

    return responses;
  }

  /**
   * Smart meeting scheduler using AI
   * @param {Object} meetingRequest - Meeting details
   * @param {Function} aiScheduler - AI scheduling function
   */
  async smartScheduleMeeting(meetingRequest, aiScheduler) {
    const { attendees, duration, preferredTimes } = meetingRequest;

    // Get availability for all attendees
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

    const availability = await this.getAvailability(startDate, endDate);

    // Use AI to find optimal time
    const optimalTime = await aiScheduler({
      availability,
      duration,
      preferredTimes
    });

    // Create event
    return this.createCalendarEvent({
      summary: meetingRequest.title,
      description: meetingRequest.description,
      start: optimalTime.start,
      end: optimalTime.end,
      attendees
    });
  }

  /**
   * Automated reporting to Google Sheets
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Object} reportData - Report data from AI agent
   */
  async generateReport(spreadsheetId, reportData) {
    const { title, data, charts } = reportData;

    // Write data to sheet
    await this.writeToSheet(
      spreadsheetId,
      'Report!A1',
      [
        [title],
        ['Generated:', new Date().toISOString()],
        [],
        ...data
      ]
    );

    return {
      success: true,
      spreadsheetId,
      message: 'Report generated successfully'
    };
  }
}

export default GoogleWorkspaceConnector;
