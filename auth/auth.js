const jwt = require('jsonwebtoken');

module.exports.auth = async (req,res,next)=>{
    try {
        // const token = req.header('Authorization');
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(403).json({ error: 'Access denied' });

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Invalid token' });
            req.user = user;
        next();
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}