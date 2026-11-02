require("dotenv").config();

const express = require('express');
const cookieParser = require('cookie-parser');
const auth = require('./routes/auth.routes');
const groups = require('./routes/groups.routes');
const friends = require('./routes/friends.routes');
const activity = require('./routes/activity.routes');
const users = require('./routes/users.routes');
const cors = require("cors");
const app = express();

app.set("trust proxy", 1);
const allowedOrigins = new Set([
    "https://splits-ease.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.CORS_ORIGINS || "").split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', auth);
app.use('/api/groups', groups);
app.use('/api/friends', friends);
app.use('/api/activity', activity);
app.use('/api/users', users);


app.get('/', (req, res) => {
    res.send('Split with SplitWise!');
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});