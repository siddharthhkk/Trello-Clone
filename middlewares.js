const jwt = require('jsonwebtoken')

function createAuthMiddleware(secretKey) {
    return function authMiddleware(req, res, next) {
        const token = req.headers.token
        if (!token) {
            return res.status(403).json({ message: 'Unauthorized' })
        }
        try {
            const decoded = jwt.verify(token, secretKey)
            const userId = decoded.userId
            if (userId) {
                req.userId = userId
                next()
            } else {
                return res.status(403).json({ message: 'Unauthorized' })
            }
        } catch {
            return res.status(403).json({ message: 'Invalid token' })
        }
    }
}

module.exports = createAuthMiddleware
