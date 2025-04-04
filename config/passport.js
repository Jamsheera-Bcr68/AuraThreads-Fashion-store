const passport=require('passport')
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const user=require('../model/userModel')
const env=require('dotenv').config();


passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'http://localhost:3000/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let User = await user.findOne({ googleId: profile.id });

        if (User) {
            return done(null, User);
        } else {
            User = new user({
                userName: profile.displayName,
                email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null, 
                googleId: profile.id
            });

            await User.save();
            return done(null, User);
        }
    } catch (error) {
        return done(error, null);
    }
}

))

//assign user to session

passport.serializeUser((User,done)=>{
    done(null,User.id)
})

//fetching user from db
passport.deserializeUser((id,done)=>{
    user.findById(id)
    .then(User=>{
        done(null,User)
    })
    .catch((error)=>{
        done(error,null)
    })
})

module.exports=passport

// //async (accessTocken,refreshTocken,profile,done)=>{
//     try {
//         let User=await user.findOne({googleId:profile.id})
//         if(User){
//             return done(null,User)

//         }else{
//             User=new user({
//                 userName:profile.displayName,
//                 email:profile.email.value,
//                 googleId:profile.id
//             })
//             await User.save()
//             return done(null,User)
//         }
//     } catch (error) {
//         return done(error,null)
//     }
// }