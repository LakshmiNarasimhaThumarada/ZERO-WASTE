const express = require('express');
const router = express.Router();
const pool = require('./db');
const authMiddleware = require('../../../auth-middleware');

// Get nearby donations with filters
router.get('/donations', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, distance, foodType, freshness } = req.query;
        const userId = req.user.id;

        let query = `
            SELECT d.*, 
                   u.name as donor_name,
                   u.contact as donor_contact,
                   ST_Distance_Sphere(
                       point(?, ?),
                       point(d.longitude, d.latitude)
                   ) / 1000 as distance_km
            FROM donations d
            JOIN users u ON d.donor_id = u.id
            WHERE d.status = 'available'
        `;
        const params = [lng, lat];

        if (foodType && foodType !== 'all') {
            query += ' AND d.food_type = ?';
            params.push(foodType);
        }

        if (freshness && freshness !== 'all') {
            query += ' AND d.freshness = ?';
            params.push(freshness);
        }

        if (distance) {
            query += ' HAVING distance_km <= ?';
            params.push(distance);
        }

        query += ' ORDER BY distance_km ASC LIMIT 50';

        const [donations] = await pool.query(query, params);
        res.json(donations);
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.status(500).json({ message: 'Error fetching donations' });
    }
});

// Request pickup for a donation
router.post('/request-pickup', authMiddleware, async (req, res) => {
    try {
        const { donationId } = req.body;
        const userId = req.user.id;

        // Start transaction
        await pool.query('START TRANSACTION');

        // Update donation status
        await pool.query(
            'UPDATE donations SET status = "requested", receiver_id = ? WHERE id = ? AND status = "available"',
            [userId, donationId]
        );

        // Create pickup request
        await pool.query(
            'INSERT INTO pickup_requests (donation_id, receiver_id, status) VALUES (?, ?, "pending")',
            [donationId, userId]
        );

        await pool.query('COMMIT');
        res.json({ message: 'Pickup requested successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error requesting pickup:', error);
        res.status(500).json({ message: 'Error requesting pickup' });
    }
});

// Submit feedback for a donation
router.post('/feedback', authMiddleware, async (req, res) => {
    try {
        const { donationId, rating, comment } = req.body;
        const userId = req.user.id;

        await pool.query(
            'INSERT INTO feedback (donation_id, receiver_id, rating, comment) VALUES (?, ?, ?, ?)',
            [donationId, userId, rating, comment]
        );

        res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Error submitting feedback' });
    }
});

// Get request history
router.get('/request-history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const [requests] = await pool.query(`
            SELECT pr.*, d.food_type, d.quantity, d.description, d.pickup_time,
                   u.name as donor_name, u.contact as donor_contact
            FROM pickup_requests pr
            JOIN donations d ON pr.donation_id = d.id
            JOIN users u ON d.donor_id = u.id
            WHERE pr.receiver_id = ?
            ORDER BY pr.created_at DESC
        `, [userId]);

        res.json(requests);
    } catch (error) {
        console.error('Error fetching request history:', error);
        res.status(500).json({ message: 'Error fetching request history' });
    }
});

module.exports = router; 