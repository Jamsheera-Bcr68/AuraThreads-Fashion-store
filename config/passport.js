const passport=require('passport')
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User=require('../model/userModel')
const env=require('dotenv').config();
const bcrypt=require('bcrypt')

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'http://localhost:3000/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
           
            return done(null, User);
        } else {
            user = new User({
                userName: profile.displayName,
                email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null, 
                googleId: profile.id
            });

            await user.save();
            return done(null, user);
        }
    } catch (error) {
        return done(error, null);
    }
}

))

//assign user to session

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: 'http://localhost:3000/google/callback'
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       let user = await User.findOne({ googleId: profile.id });

//       if (user) {
//         return done(null, user);
//       } else {
//         // Don’t save to DB yet
//         const userData = {
//           userName: profile.displayName,
//           email: profile.emails?.[0]?.value || null,
//           googleId: profile.id
//         };

//         return done(null, userData); // Pass this to req.user
//       }
//     } catch (error) {
//       return done(error, null);
//     }
//   }
// ));



passport.serializeUser((user,done)=>{
    done(null,user.id)
})

//fetching user from db
passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch((error)=>{
        done(error,null)
    })
})

module.exports=passport

