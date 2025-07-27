const express = require('express');
const router = express.Router();
const { hashPassword, verifyPassword, generateToken, authenticateToken } = require('./auth-middleware');
const pool = require('./db');

// Register new receiver
router.post('/register', async (req, res) => {
    const { name, email, phone, role, organization_name, password } = req.body;

    // Input validation
    if (!name || !email || !phone || !role || !password) {
        return res.status(400).json({ 
            message: 'All fields are required',
            field: !name ? 'name' : !email ? 'email' : !phone ? 'phone' : !role ? 'role' : 'password'
        });
    }

    if (role === 'NGO' && !organization_name) {
        return res.status(400).json({ 
            message: 'Organization name is required for NGO role',
            field: 'organization_name'
        });
    }

    try {
        // Check if email already exists
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                message: 'Email already registered',
                field: 'email'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert into users table
            const [userResult] = await connection.query(
                `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
                 VALUES (?, ?, ?, ?, ?, FALSE)`,
                [name, email, phone, hashedPassword, role]
            );

            const userId = userResult.insertId;

            // If NGO, insert into receivers table
            if (role === 'NGO') {
                await connection.query(
                    `INSERT INTO receivers (user_id, organization_name)
                     VALUES (?, ?)`,
                    [userId, organization_name]
                );
            }

            await connection.commit();

            // Send verification email (implement this function)
            // await sendVerificationEmail(email, userId);

            res.status(201).json({
                message: 'Registration successful. Please check your email for verification.'
            });
        } catch (error) {
            await connection.rollback();
            console.error('Database error during registration:', error);
            
            // Check for specific database errors
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ 
                    message: 'Email already registered',
                    field: 'email'
                });
            }
            
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'Registration failed. ';
        if (error.code === 'ECONNREFUSED') {
            errorMessage += 'Database connection failed.';
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            errorMessage += 'Database access denied.';
        } else {
            errorMessage += 'Please try again later.';
        }
        
        res.status(500).json({ 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login receiver
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Check if account is verified
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Account not verified' });
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// Verify account
router.get('/verify/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await pool.query(
            'UPDATE users SET is_verified = TRUE WHERE id = ?',
            [userId]
        );

        res.json({ message: 'Account verified successfully' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
});

// Verify token
router.get('/verify-token', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Logout
router.get('/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

module.exports = router; 