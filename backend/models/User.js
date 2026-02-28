const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: [3, "Name must be at least 3 characters long"],
        maxlength: [50, "Name must be less than 50 characters long"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, "Email is invalid"]
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"]
    },
    //season long? tbd
    totalPoints: {
        type: Number,
        default: 0    
    },
    leagues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League'
    }],
    isLeagueAdmin: {
        type: Boolean,
        default: false
    }, 
},
    {timestamps: true }
);

// Hash password before saving – fully async/await, NO next()
userSchema.pre('save', async function () {
    // Only hash if password was modified
    if (!this.isModified('password')) return;

    try {
        this.password = await bcrypt.hash(this.password, 12);
    } catch (err) {
        // If hash fails, throw error so Mongoose catches it
        throw new Error('Password hashing failed: ' + err.message);
    }
});
//compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

module.exports = mongoose.model('User', userSchema);
    
     
    