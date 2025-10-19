const express = require('express');
const EmailOut = require('../models/EmailOut');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/email-logs
// @desc    E-Mail-Logs abrufen (nur für Admins)
// @access  Private (Admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      emailType,
      status,
      recipient,
      environment
    } = req.query;

    // Filter erstellen
    const filter = {};
    if (emailType) filter.emailType = emailType;
    if (status) filter['delivery.status'] = status;
    if (recipient) filter['recipient.email'] = { $regex: recipient, $options: 'i' };
    if (environment) filter.environment = environment;

    // Pagination
    const skip = (page - 1) * limit;

    // E-Mails abrufen
    const emails = await EmailOut.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content.htmlBody -content.textBody') // Große Felder ausschließen
      .populate('recipient.userId', 'username email firstName lastName')
      .populate('recipient.kundeId', 'name email kundennummer');

    // Gesamtanzahl für Pagination
    const total = await EmailOut.countDocuments(filter);

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der E-Mail-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Logs'
    });
  }
});

// @route   GET /api/email-logs/stats
// @desc    E-Mail-Statistiken abrufen
// @access  Private (Admin only)
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Zeitraum berechnen
    const now = new Date();
    const timeframeMap = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    };
    
    const startDate = timeframeMap[timeframe] || timeframeMap['30d'];

    // Statistiken generieren
    const [
      totalEmails,
      emailsByType,
      emailsByStatus,
      emailsByEnvironment,
      recentActivity
    ] = await Promise.all([
      // Gesamtanzahl E-Mails
      EmailOut.countDocuments({ createdAt: { $gte: startDate } }),
      
      // E-Mails nach Typ
      EmailOut.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$emailType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // E-Mails nach Status
      EmailOut.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$delivery.status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // E-Mails nach Environment
      EmailOut.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$environment', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Letzte Aktivität
      EmailOut.find({ createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('emailType recipient.email delivery.status createdAt')
    ]);

    res.json({
      success: true,
      data: {
        timeframe,
        startDate,
        summary: {
          totalEmails,
          successRate: emailsByStatus.reduce((acc, item) => {
            if (['sent', 'delivered'].includes(item._id)) {
              return acc + item.count;
            }
            return acc;
          }, 0) / totalEmails * 100
        },
        emailsByType: emailsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        emailsByStatus: emailsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        emailsByEnvironment: emailsByEnvironment.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentActivity
      }
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der E-Mail-Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Statistiken'
    });
  }
});

// @route   GET /api/email-logs/:id
// @desc    Einzelne E-Mail-Log-Details abrufen
// @access  Private (Admin only)
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const email = await EmailOut.findById(req.params.id)
      .populate('recipient.userId', 'username email firstName lastName')
      .populate('recipient.kundeId', 'name email kundennummer');

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'E-Mail-Log nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: email
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der E-Mail-Details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Details'
    });
  }
});

// @route   GET /api/email-logs/recipient/:email
// @desc    E-Mail-Logs für bestimmten Empfänger abrufen
// @access  Private (Admin only)
router.get('/recipient/:email', auth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 20 } = req.query;

    const emails = await EmailOut.findByRecipient(email)
      .limit(parseInt(limit))
      .select('-content.htmlBody -content.textBody');

    res.json({
      success: true,
      data: {
        recipient: email,
        emails,
        totalCount: emails.length
      }
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der E-Mails für Empfänger:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mails für Empfänger'
    });
  }
});

module.exports = router;